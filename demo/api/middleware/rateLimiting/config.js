/**
 * @fileoverview Rate Limiting Configuration and Constants
 * @description Centralized configuration for all rate limiting operations with
 * environment variable support, type definitions, and enterprise-grade settings
 * 
 * @version 2.1.0
 * @author Cubicle Management System - IBM Space Optimization
 * @since 1.0.0
 * 
 * @module RateLimitConfig
 */

// ================================================================================
// RATE LIMIT TYPES AND CONFIGURATIONS
// ================================================================================

/**
 * Rate limit type definitions for different endpoint categories
 * @readonly
 * @enum {string}
 */
const RATE_LIMIT_TYPES = {
  /** Export operations (Excel downloads, file generation) */
  EXPORT: 'EXPORT',
  /** Reservation operations (booking, cancellation) */
  RESERVATION: 'RESERVATION', 
  /** Authentication operations (login, token refresh) */
  AUTHENTICATION: 'AUTHENTICATION',
  /** Admin operations (user management, system config) */
  ADMIN: 'ADMIN',
  /** Notification operations (email sending, bulk notifications) */
  NOTIFICATION: 'NOTIFICATION',
  /** Report generation (utilization reports, analytics) */
  REPORT_GENERATION: 'REPORT_GENERATION',
  /** File upload operations (file uploads, attachments) */
  UPLOAD: 'UPLOAD',
  /** General API operations (default rate limiting) */
  GENERAL_API: 'GENERAL_API'
};

/**
 * Default rate limiting configurations for each operation type
 * All values can be overridden via environment variables
 * @readonly
 */
const DEFAULT_RATE_LIMITS = {
  [RATE_LIMIT_TYPES.EXPORT]: {
    windowMs: 15 * 60 * 1000,        // 15 minutes
    max: 15,                         // 15 exports per window (reduced from 50)
    skipSuccessfulRequests: false,   // Count all requests
    skipFailedRequests: true,        // Don't count failed requests against user
    envPrefix: 'EXPORT'
  },
  
  [RATE_LIMIT_TYPES.RESERVATION]: {
    windowMs: 15 * 60 * 1000,        // 15 minutes  
    max: 50,                         // 50 reservations per window (reduced from 100)
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
    envPrefix: 'RESERVATION'
  },
  
  [RATE_LIMIT_TYPES.AUTHENTICATION]: {
    windowMs: 15 * 60 * 1000,        // 15 minutes
    max: 10,                         // 10 auth attempts per window (prevent brute force)
    skipSuccessfulRequests: true,    // Don't count successful logins
    skipFailedRequests: false,       // Count failed attempts
    envPrefix: 'AUTH'
  },
  
  [RATE_LIMIT_TYPES.ADMIN]: {
    windowMs: 15 * 60 * 1000,        // 15 minutes
    max: 100,                        // 100 admin operations per window
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
    envPrefix: 'ADMIN'
  },
  
  [RATE_LIMIT_TYPES.NOTIFICATION]: {
    windowMs: 15 * 60 * 1000,        // 15 minutes
    max: 25,                         // 25 notifications per window (prevent spam)
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
    envPrefix: 'NOTIFICATION'
  },
  
  [RATE_LIMIT_TYPES.REPORT_GENERATION]: {
    windowMs: 15 * 60 * 1000,        // 15 minutes
    max: 10,                         // 10 report generations per window (resource intensive)
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
    envPrefix: 'REPORT_GEN'
  },
  
  [RATE_LIMIT_TYPES.UPLOAD]: {
    windowMs: 10 * 60 * 1000,        // 10 minutes
    max: 20,                         // 20 uploads per window (prevent abuse)
    skipSuccessfulRequests: false,
    skipFailedRequests: true,
    envPrefix: 'UPLOAD'
  },
  
  [RATE_LIMIT_TYPES.GENERAL_API]: {
    windowMs: 15 * 60 * 1000,        // 15 minutes
    max: 500,                        // 500 general API calls per window (reduced from 1000)
    skipSuccessfulRequests: false,
    skipFailedRequests: false,       // Count all general API requests
    envPrefix: 'API'
  }
};

/**
 * Rate limit error codes for consistent error handling
 * @readonly
 */
const RATE_LIMIT_ERROR_CODES = {
  [RATE_LIMIT_TYPES.EXPORT]: 'RATE_001',
  [RATE_LIMIT_TYPES.RESERVATION]: 'RATE_002', 
  [RATE_LIMIT_TYPES.AUTHENTICATION]: 'RATE_003',
  [RATE_LIMIT_TYPES.ADMIN]: 'RATE_004',
  [RATE_LIMIT_TYPES.NOTIFICATION]: 'RATE_005',
  [RATE_LIMIT_TYPES.REPORT_GENERATION]: 'RATE_006',
  [RATE_LIMIT_TYPES.UPLOAD]: 'RATE_007',
  [RATE_LIMIT_TYPES.GENERAL_API]: 'RATE_008'
};

/**
 * User-friendly error messages for different rate limit types
 * @readonly
 */
const RATE_LIMIT_MESSAGES = {
  [RATE_LIMIT_TYPES.EXPORT]: 'Export rate limit exceeded. Please wait before downloading another report.',
  [RATE_LIMIT_TYPES.RESERVATION]: 'Reservation rate limit exceeded. Please wait before making another booking.',
  [RATE_LIMIT_TYPES.AUTHENTICATION]: 'Too many authentication attempts. Please wait before trying again.',
  [RATE_LIMIT_TYPES.ADMIN]: 'Admin operation rate limit exceeded. Please wait before performing another admin action.',
  [RATE_LIMIT_TYPES.NOTIFICATION]: 'Notification rate limit exceeded. Please wait before sending more notifications.',
  [RATE_LIMIT_TYPES.REPORT_GENERATION]: 'Report generation rate limit exceeded. Please wait before generating another report.',
  [RATE_LIMIT_TYPES.UPLOAD]: 'File upload rate limit exceeded. Please wait before uploading more files.',
  [RATE_LIMIT_TYPES.GENERAL_API]: 'API rate limit exceeded. Please reduce the frequency of your requests.'
};

// ================================================================================
// ENVIRONMENT VARIABLE CONFIGURATION
// ================================================================================

/**
 * Gets rate limiting configuration from environment variables with fallbacks
 * @param {string} type - Rate limit type from RATE_LIMIT_TYPES
 * @returns {Object} Configuration object with max, windowMs, and other settings
 */
function getRateLimitConfig(type) {
  const defaults = DEFAULT_RATE_LIMITS[type];
  if (!defaults) {
    throw new Error(`Unknown rate limit type: ${type}`);
  }
  
  const envPrefix = defaults.envPrefix;
  
  return {
    windowMs: parseInt(process.env[`${envPrefix}_WINDOW_MS`] || defaults.windowMs.toString()),
    max: parseInt(process.env[`${envPrefix}_RATE_LIMIT`] || defaults.max.toString()),
    skipSuccessfulRequests: process.env[`${envPrefix}_SKIP_SUCCESS`] === 'true' || defaults.skipSuccessfulRequests,
    skipFailedRequests: process.env[`${envPrefix}_SKIP_FAILED`] === 'true' || defaults.skipFailedRequests,
    standardHeaders: true,
    legacyHeaders: false,
    type: type
  };
}

/**
 * Admin exemption configuration
 */
const ADMIN_EXEMPTION_CONFIG = {
  // Which rate limit types should exempt admin users
  exemptTypes: [
    RATE_LIMIT_TYPES.EXPORT,
    RATE_LIMIT_TYPES.REPORT_GENERATION,
    RATE_LIMIT_TYPES.ADMIN
  ],
  
  // Whether to enable admin exemptions (can be disabled via env var)
  enabled: process.env.RATE_LIMIT_ADMIN_EXEMPT !== 'false'
};

/**
 * Progressive rate limiting configuration
 */
const PROGRESSIVE_RATE_CONFIG = {
  enabled: process.env.RATE_LIMIT_PROGRESSIVE === 'true',
  
  // Violation thresholds and corresponding rate limit multipliers
  thresholds: [
    { violations: 0, multiplier: 1.0 },    // Normal rate
    { violations: 3, multiplier: 0.5 },    // 50% reduction after 3 violations
    { violations: 5, multiplier: 0.2 },    // 80% reduction after 5 violations
    { violations: 10, multiplier: 0.05 }   // 95% reduction after 10 violations
  ],
  
  // How long to remember violations (in milliseconds)
  violationTTL: 24 * 60 * 60 * 1000 // 24 hours
};

// ================================================================================
// MODULE EXPORTS
// ================================================================================

module.exports = {
  RATE_LIMIT_TYPES,
  DEFAULT_RATE_LIMITS,
  RATE_LIMIT_ERROR_CODES,
  RATE_LIMIT_MESSAGES,
  ADMIN_EXEMPTION_CONFIG,
  PROGRESSIVE_RATE_CONFIG,
  getRateLimitConfig
};
