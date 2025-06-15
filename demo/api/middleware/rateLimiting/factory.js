/**
 * @fileoverview Rate Limiting Factory and Core Implementation
 * @description Enterprise-grade rate limiting factory with user-aware limiting,
 * admin exemptions, progressive restrictions, and comprehensive monitoring
 * 
 * @version 2.1.0
 * @author Cubicle Management System - IBM Space Optimization
 * @since 1.0.0
 * 
 * @module RateLimitFactory
 */

const rateLimit = require('express-rate-limit');
const logger = require('../../logger');
const {
  RATE_LIMIT_TYPES,
  RATE_LIMIT_ERROR_CODES,
  RATE_LIMIT_MESSAGES,
  ADMIN_EXEMPTION_CONFIG,
  PROGRESSIVE_RATE_CONFIG,
  getRateLimitConfig
} = require('./config');

// ================================================================================
// VIOLATION TRACKING SYSTEM
// ================================================================================

/**
 * In-memory violation tracking for progressive rate limiting
 * In production, this should be replaced with Redis for distributed systems
 */
class ViolationTracker {
  constructor() {
    this.violations = new Map();
    this.cleanup();
  }

  /**
   * Records a rate limit violation for a user/IP
   * @param {string} key - User ID or IP address
   * @returns {number} Total violation count
   */
  recordViolation(key) {
    const now = Date.now();
    const userViolations = this.violations.get(key) || [];
    
    // Add new violation
    userViolations.push(now);
    
    // Remove old violations outside TTL window
    const validViolations = userViolations.filter(
      timestamp => (now - timestamp) < PROGRESSIVE_RATE_CONFIG.violationTTL
    );
    
    this.violations.set(key, validViolations);
    
    logger.info('Rate limit violation recorded', {
      key,
      violationCount: validViolations.length,
      timestamp: new Date(now).toISOString()
    });
    
    return validViolations.length;
  }

  /**
   * Gets current violation count for a user/IP
   * @param {string} key - User ID or IP address
   * @returns {number} Current violation count
   */
  getViolationCount(key) {
    const now = Date.now();
    const userViolations = this.violations.get(key) || [];
    
    // Filter to only recent violations
    const recentViolations = userViolations.filter(
      timestamp => (now - timestamp) < PROGRESSIVE_RATE_CONFIG.violationTTL
    );
    
    if (recentViolations.length !== userViolations.length) {
      this.violations.set(key, recentViolations);
    }
    
    return recentViolations.length;
  }

  /**
   * Clears violations for a user/IP (useful for testing or admin actions)
   * @param {string} key - User ID or IP address
   */
  clearViolations(key) {
    this.violations.delete(key);
    logger.info('Rate limit violations cleared', { key });
  }

  /**
   * Periodic cleanup of expired violations
   * @private
   */
  cleanup() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, violations] of this.violations.entries()) {
        const validViolations = violations.filter(
          timestamp => (now - timestamp) < PROGRESSIVE_RATE_CONFIG.violationTTL
        );
        
        if (validViolations.length === 0) {
          this.violations.delete(key);
          cleanedCount++;
        } else if (validViolations.length !== violations.length) {
          this.violations.set(key, validViolations);
        }
      }
      
      if (cleanedCount > 0) {
        logger.debug('Rate limit violation cleanup completed', {
          cleanedEntries: cleanedCount,
          remainingEntries: this.violations.size
        });
      }
    }, 60 * 60 * 1000); // Cleanup every hour
  }
}

// Global violation tracker instance
const violationTracker = new ViolationTracker();

// ================================================================================
// RATE LIMITING UTILITIES
// ================================================================================

/**
 * Generates a unique key for rate limiting based on user context
 * Prioritizes user ID over IP address when available
 * @param {Object} req - Express request object
 * @returns {string} Unique key for rate limiting
 */
function generateRateLimitKey(req) {
  // Prefer authenticated user ID for more accurate tracking
  if (req.user && req.user.uid) {
    return `user:${req.user.uid}`;
  }
  
  // Fallback to IP address for unauthenticated requests
  return `ip:${req.ip}`;
}

/**
 * Determines if a request should skip rate limiting
 * @param {Object} req - Express request object
 * @param {string} rateLimitType - Type of rate limiting being applied
 * @returns {boolean} True if request should skip rate limiting
 */
function shouldSkipRateLimit(req, rateLimitType) {
  // Skip rate limiting for admin users if configured and type allows exemption
  if (ADMIN_EXEMPTION_CONFIG.enabled && 
      req.adminContext && 
      req.adminContext.isAdmin &&
      ADMIN_EXEMPTION_CONFIG.exemptTypes.includes(rateLimitType)) {
    
    logger.debug('Rate limit exemption applied for admin user', {
      userId: req.user?.uid,
      rateLimitType,
      path: req.path
    });
    
    return true;
  }
  
  return false;
}

/**
 * Calculates dynamic rate limit based on violation history
 * @param {Object} req - Express request object
 * @param {number} baseLimit - Base rate limit
 * @returns {number} Adjusted rate limit
 */
function calculateProgressiveLimit(req, baseLimit) {
  if (!PROGRESSIVE_RATE_CONFIG.enabled) {
    return baseLimit;
  }
  
  const key = generateRateLimitKey(req);
  const violationCount = violationTracker.getViolationCount(key);
  
  // Find appropriate multiplier based on violation count
  let multiplier = 1.0;
  for (const threshold of PROGRESSIVE_RATE_CONFIG.thresholds) {
    if (violationCount >= threshold.violations) {
      multiplier = threshold.multiplier;
    } else {
      break;
    }
  }
  
  const adjustedLimit = Math.max(1, Math.floor(baseLimit * multiplier));
  
  if (adjustedLimit !== baseLimit) {
    logger.info('Progressive rate limit applied', {
      key,
      violationCount,
      baseLimit,
      adjustedLimit,
      multiplier
    });
  }
  
  return adjustedLimit;
}

/**
 * Creates standardized error response for rate limit exceeded
 * @param {string} rateLimitType - Type of rate limiting
 * @param {number} retryAfter - Seconds until retry is allowed
 * @returns {Object} Standardized error response
 */
function createRateLimitErrorResponse(rateLimitType, retryAfter) {
  return {
    success: false,
    error: {
      code: RATE_LIMIT_ERROR_CODES[rateLimitType],
      message: RATE_LIMIT_MESSAGES[rateLimitType],
      type: 'RATE_LIMIT_ERROR',
      retryAfter: retryAfter
    }
  };
}

// ================================================================================
// RATE LIMIT FACTORY FUNCTION
// ================================================================================

/**
 * Creates a configured rate limiter for a specific operation type
 * 
 * This factory function creates enterprise-grade rate limiters with:
 * - User-aware rate limiting (prefers user ID over IP)
 * - Admin user exemptions for specified operation types
 * - Progressive rate limiting based on violation history
 * - Comprehensive logging and monitoring
 * - Standardized error responses
 * 
 * @function createRateLimiter
 * @param {string} rateLimitType - Type of rate limiting from RATE_LIMIT_TYPES
 * @param {Object} [customConfig] - Optional custom configuration to override defaults
 * @returns {Function} Express middleware function for rate limiting
 * 
 * @throws {Error} When invalid rate limit type is provided
 * 
 * @example
 * // Create export rate limiter
 * const exportLimiter = createRateLimiter(RATE_LIMIT_TYPES.EXPORT);
 * router.get('/export', exportLimiter, validarUsuario, handler);
 * 
 * @example
 * // Create custom rate limiter with overrides
 * const customLimiter = createRateLimiter(RATE_LIMIT_TYPES.ADMIN, {
 *   max: 200,
 *   windowMs: 10 * 60 * 1000 // 10 minutes
 * });
 * 
 * @since 1.0.0
 * @version 2.1.0
 */
function createRateLimiter(rateLimitType, customConfig = {}) {
  // Validate rate limit type
  if (!Object.values(RATE_LIMIT_TYPES).includes(rateLimitType)) {
    throw new Error(`Invalid rate limit type: ${rateLimitType}. Must be one of: ${Object.values(RATE_LIMIT_TYPES).join(', ')}`);
  }
  
  // Get base configuration and merge with custom config
  const baseConfig = getRateLimitConfig(rateLimitType);
  const config = { ...baseConfig, ...customConfig };
  
  logger.info('Creating rate limiter', {
    type: rateLimitType,
    windowMs: config.windowMs,
    baseMax: config.max,
    adminExemptionsEnabled: ADMIN_EXEMPTION_CONFIG.enabled,
    progressiveEnabled: PROGRESSIVE_RATE_CONFIG.enabled
  });
  
  return rateLimit({
    windowMs: config.windowMs,
    
    // Dynamic max based on progressive rate limiting
    max: (req) => {
      const baseLimit = config.max;
      return calculateProgressiveLimit(req, baseLimit);
    },
    
    // Custom key generator for user-aware rate limiting
    keyGenerator: generateRateLimitKey,
    
    // Skip function for admin exemptions
    skip: (req) => shouldSkipRateLimit(req, rateLimitType),
    
    // Request counting configuration
    skipSuccessfulRequests: config.skipSuccessfulRequests,
    skipFailedRequests: config.skipFailedRequests,
    
    // Header configuration
    standardHeaders: config.standardHeaders,
    legacyHeaders: config.legacyHeaders,
    
    // Custom error response with logging
    message: (req, res) => {
      const key = generateRateLimitKey(req);
      const violationCount = violationTracker.recordViolation(key);
      const retryAfter = Math.ceil(config.windowMs / 1000);
      
      // Log rate limit exceeded
      logger.warn('Rate limit exceeded', {
        rateLimitType,
        key,
        violationCount,
        endpoint: req.path,
        method: req.method,
        userId: req.user?.uid,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        limit: config.max,
        windowMs: config.windowMs,
        timestamp: new Date().toISOString()
      });
      
      // Additional security logging for authentication rate limits
      if (rateLimitType === RATE_LIMIT_TYPES.AUTHENTICATION) {
        logger.error('Potential brute force attack detected', {
          key,
          violationCount,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path
        });
      }
      
      return createRateLimitErrorResponse(rateLimitType, retryAfter);
    }
  });
}

// ================================================================================
// UTILITY FUNCTIONS FOR TESTING AND MANAGEMENT
// ================================================================================

/**
 * Clears all rate limit violations for a specific user/IP
 * Useful for testing or administrative actions
 * @param {string} key - User ID or IP address (with prefix)
 * @returns {void}
 */
function clearRateLimitViolations(key) {
  violationTracker.clearViolations(key);
}

/**
 * Gets current violation count for a user/IP
 * Useful for monitoring and testing
 * @param {string} key - User ID or IP address (with prefix)
 * @returns {number} Current violation count
 */
function getRateLimitViolations(key) {
  return violationTracker.getViolationCount(key);
}

/**
 * Gets rate limiting statistics for monitoring
 * @returns {Object} Statistics about current rate limiting state
 */
function getRateLimitStats() {
  return {
    totalTrackedKeys: violationTracker.violations.size,
    progressiveEnabled: PROGRESSIVE_RATE_CONFIG.enabled,
    adminExemptionsEnabled: ADMIN_EXEMPTION_CONFIG.enabled,
    configuredTypes: Object.values(RATE_LIMIT_TYPES)
  };
}

// ================================================================================
// MODULE EXPORTS
// ================================================================================

module.exports = {
  createRateLimiter,
  RATE_LIMIT_TYPES,
  RATE_LIMIT_ERROR_CODES,
  RATE_LIMIT_MESSAGES,
  
  // Utility functions
  clearRateLimitViolations,
  getRateLimitViolations,
  getRateLimitStats,
  generateRateLimitKey,
  
  // For testing
  violationTracker
};
