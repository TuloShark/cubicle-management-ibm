/**
 * @fileoverview Centralized Rate Limiting System - Main Entry Point
 * @description Enterprise-grade rate limiting system with pre-configured limiters
 * for all application endpoints, user-aware limiting, admin exemptions, and monitoring
 * 
 * @version 2.1.0
 * @author Cubicle Management System - IBM Space Optimization
 * @since 1.0.0
 * 
 * @module RateLimitingSystem
 */

const { createRateLimiter, RATE_LIMIT_TYPES } = require('./factory');
const logger = require('../../logger');

// ================================================================================
// PRE-CONFIGURED RATE LIMITERS
// ================================================================================

/**
 * Pre-configured rate limiters for all application operations
 * These are ready-to-use middleware functions that can be directly applied to routes
 */
const rateLimiters = {
  /**
   * Export operations rate limiter
   * Applied to Excel/CSV export endpoints
   * @type {Function}
   */
  export: createRateLimiter(RATE_LIMIT_TYPES.EXPORT),
  
  /**
   * Reservation operations rate limiter
   * Applied to cubicle reservation endpoints
   * @type {Function}
   */
  reservation: createRateLimiter(RATE_LIMIT_TYPES.RESERVATION),
  
  /**
   * Authentication operations rate limiter
   * Applied to login/logout endpoints to prevent brute force attacks
   * @type {Function}
   */
  authentication: createRateLimiter(RATE_LIMIT_TYPES.AUTHENTICATION),
  
  /**
   * Admin operations rate limiter
   * Applied to administrative endpoints with higher limits
   * @type {Function}
   */
  admin: createRateLimiter(RATE_LIMIT_TYPES.ADMIN),
  
  /**
   * Notification operations rate limiter
   * Applied to notification sending endpoints
   * @type {Function}
   */
  notification: createRateLimiter(RATE_LIMIT_TYPES.NOTIFICATION),
  
  /**
   * General API operations rate limiter
   * Applied as a general catch-all for API endpoints
   * @type {Function}
   */
  api: createRateLimiter(RATE_LIMIT_TYPES.GENERAL_API),
  
  /**
   * File upload operations rate limiter
   * Applied to file upload endpoints
   * @type {Function}
   */
  upload: createRateLimiter(RATE_LIMIT_TYPES.UPLOAD),
  
  /**
   * Report generation rate limiter
   * Applied to resource-intensive report generation endpoints
   * @type {Function}
   */
  report: createRateLimiter(RATE_LIMIT_TYPES.REPORT_GENERATION)
};

// ================================================================================
// RATE LIMITER COMBINATIONS FOR COMMON PATTERNS
// ================================================================================

/**
 * Creates a composite rate limiter that applies multiple rate limits
 * Useful for endpoints that need both general API and specific operation limits
 * @param {...Function} limiters - Rate limiter functions to apply
 * @returns {Array} Array of rate limiter middleware functions
 */
function createCompositeRateLimiter(...limiters) {
  return limiters;
}

/**
 * Common rate limiter combinations for typical endpoint patterns
 */
const rateLimiterCombinations = {
  /**
   * For authenticated export operations
   * Applies both API and export rate limits
   */
  authenticatedExport: createCompositeRateLimiter(rateLimiters.api, rateLimiters.export),
  
  /**
   * For admin operations
   * Applies both API and admin rate limits
   */
  adminOperation: createCompositeRateLimiter(rateLimiters.api, rateLimiters.admin),
  
  /**
   * For reservation operations
   * Applies both API and reservation rate limits
   */
  reservationOperation: createCompositeRateLimiter(rateLimiters.api, rateLimiters.reservation),
  
  /**
   * For notification operations
   * Applies both API and notification rate limits
   */
  notificationOperation: createCompositeRateLimiter(rateLimiters.api, rateLimiters.notification),
  
  /**
   * For report generation
   * Applies both API and report rate limits
   */
  reportGeneration: createCompositeRateLimiter(rateLimiters.api, rateLimiters.report)
};

// ================================================================================
// MIGRATION HELPERS
// ================================================================================

/**
 * Legacy rate limiter mapping for backward compatibility during migration
 * Maps old rate limiter names to new centralized ones
 * @deprecated Use rateLimiters directly instead
 */
const legacyRateLimiters = {
  exportLimiter: rateLimiters.export,
  reservationLimiter: rateLimiters.reservation,
  globalLimiter: rateLimiters.api
};

// ================================================================================
// INITIALIZATION AND MONITORING
// ================================================================================

/**
 * Initializes the rate limiting system
 * Sets up monitoring and logs system configuration
 */
function initializeRateLimiting() {
  logger.info('Rate limiting system initialized', {
    availableLimiters: Object.keys(rateLimiters),
    availableCombinations: Object.keys(rateLimiterCombinations),
    timestamp: new Date().toISOString()
  });
  
  // Log configuration for audit purposes
  logger.debug('Rate limiting configuration loaded', {
    rateLimitTypes: Object.values(RATE_LIMIT_TYPES),
    systemVersion: '2.1.0'
  });
}

// Initialize on module load
initializeRateLimiting();

// ================================================================================
// USAGE EXAMPLES AND DOCUMENTATION
// ================================================================================

/**
 * Usage Examples:
 * 
 * @example Basic single rate limiter usage
 * const { rateLimiters } = require('./middleware/rateLimiting');
 * router.get('/export', rateLimiters.export, validarUsuario, exportHandler);
 * 
 * @example Multiple rate limiters for an endpoint
 * const { rateLimiterCombinations } = require('./middleware/rateLimiting');
 * router.get('/admin/export', ...rateLimiterCombinations.adminOperation, validarUsuario, exportHandler);
 * 
 * @example Custom rate limiter with overrides
 * const { createRateLimiter, RATE_LIMIT_TYPES } = require('./middleware/rateLimiting/factory');
 * const customLimiter = createRateLimiter(RATE_LIMIT_TYPES.ADMIN, { max: 200 });
 * router.post('/admin/bulk-action', customLimiter, validarUsuario, bulkHandler);
 * 
 * @example Legacy compatibility (deprecated)
 * const { legacyRateLimiters } = require('./middleware/rateLimiting');
 * router.get('/legacy-export', legacyRateLimiters.exportLimiter, handler);
 */

// ================================================================================
// MODULE EXPORTS
// ================================================================================

module.exports = {
  // Main rate limiters for direct use
  rateLimiters,
  
  // Pre-configured combinations
  rateLimiterCombinations,
  
  // Utilities
  createCompositeRateLimiter,
  
  // Factory and types for custom rate limiters
  createRateLimiter,
  RATE_LIMIT_TYPES,
  
  // Legacy support (deprecated)
  legacyRateLimiters,
  
  // Re-export factory utilities for advanced usage
  ...require('./factory')
};
