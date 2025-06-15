/**
 * @fileoverview Firebase Authentication Middleware
 * @description Enterprise-grade JWT token validation and admin authorization with
 * comprehensive error handling, security enhancements, and performance optimizations
 * 
 * @version 2.1.0
 * @author Cubicle Management System - IBM Space Optimization
 * @since 1.0.0
 * 
 * @module AuthMiddleware
 * 
 * Security Features:
 * - Firebase JWT token validation with proper error handling
 * - Admin privilege verification with caching
 * - Structured logging and audit trail
 * - Input validation and sanitization
 * - Rate limiting protection (via external middleware)
 */

const admin = require('../firebase');
const { getAdminUids } = require('../utils/adminUtils');
const logger = require('../logger');

// ================================================================================
// CONFIGURATION CONSTANTS
// ================================================================================

/**
 * Authentication configuration constants
 */
const AUTH_CONFIG = {
  TOKEN_HEADER: 'authorization',
  TOKEN_PREFIX: 'Bearer ',
  ADMIN_CACHE_TTL: 5 * 60 * 1000, // 5 minutes cache for admin UIDs
  LOG_FAILED_ATTEMPTS: true,
  EXPOSE_ERROR_DETAILS: process.env.NODE_ENV === 'development',
  MAX_TOKEN_LENGTH: 2048 // Reasonable JWT token length limit
};

/**
 * Standardized authentication error codes and messages
 */
const AUTH_ERRORS = {
  NO_TOKEN: { 
    code: 'AUTH_001', 
    message: 'No authorization token provided',
    status: 401 
  },
  INVALID_FORMAT: { 
    code: 'AUTH_002', 
    message: 'Invalid authorization header format - expected "Bearer <token>"',
    status: 401 
  },
  TOKEN_INVALID: { 
    code: 'AUTH_003', 
    message: 'Invalid or expired authentication token',
    status: 401 
  },
  TOKEN_TOO_LONG: { 
    code: 'AUTH_004', 
    message: 'Authentication token exceeds maximum length',
    status: 401 
  },
  ACCESS_DENIED: { 
    code: 'AUTH_005', 
    message: 'Access denied: insufficient privileges',
    status: 403 
  },
  MIDDLEWARE_ERROR: { 
    code: 'AUTH_006', 
    message: 'Authentication middleware configuration error',
    status: 500 
  },
  USER_CONTEXT_MISSING: { 
    code: 'AUTH_007', 
    message: 'User authentication required before authorization check',
    status: 500 
  }
};

// ================================================================================
// ADMIN UIDS CACHING SYSTEM
// ================================================================================

/**
 * Admin UIDs cache to improve performance
 */
let adminUidsCache = null;
let adminUidsCacheTime = 0;

/**
 * Retrieves admin UIDs with caching for performance optimization
 * @private
 * @returns {string[]} Array of admin user IDs
 */
function getCachedAdminUids() {
  const now = Date.now();
  
  // Check if cache is valid
  if (!adminUidsCache || (now - adminUidsCacheTime) > AUTH_CONFIG.ADMIN_CACHE_TTL) {
    adminUidsCache = getAdminUids();
    adminUidsCacheTime = now;
    
    logger.info('Admin UIDs cache refreshed', {
      adminCount: adminUidsCache.length,
      cacheValidUntil: new Date(now + AUTH_CONFIG.ADMIN_CACHE_TTL).toISOString()
    });
  }
  
  return adminUidsCache;
}

/**
 * Clears the admin UIDs cache (useful for testing or dynamic admin updates)
 * @public
 * @returns {void}
 */
function clearAdminCache() {
  adminUidsCache = null;
  adminUidsCacheTime = 0;
  logger.info('Admin UIDs cache cleared manually');
}

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

/**
 * Sends standardized authentication error response
 * @private
 * @param {Object} res - Express response object
 * @param {Object} error - Error object from AUTH_ERRORS
 * @param {Object} [context] - Additional context for logging
 * @returns {Object} Express response
 */
function sendAuthError(res, error, context = {}) {
  const response = {
    success: false,
    error: {
      code: error.code,
      message: error.message
    }
  };
  
  // Add error details only in development
  if (AUTH_CONFIG.EXPOSE_ERROR_DETAILS && context.details) {
    response.error.details = context.details;
  }
  
  // Log the authentication failure
  if (AUTH_CONFIG.LOG_FAILED_ATTEMPTS) {
    logger.warn('Authentication failure', {
      errorCode: error.code,
      ip: context.ip,
      userAgent: context.userAgent,
      details: context.details || 'No additional details'
    });
  }
  
  return res.status(error.status).json(response);
}

/**
 * Logs successful authentication events for audit trail
 * @private
 * @param {string} eventType - Type of authentication event
 * @param {Object} req - Express request object
 * @param {Object} [details] - Additional event details
 * @returns {void}
 */
function logAuthEvent(eventType, req, details = {}) {
  logger.info('Authentication event', {
    event: eventType,
    success: true,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    userId: req.user?.uid || 'unknown',
    ...details
  });
}

// ================================================================================
// MAIN AUTHENTICATION MIDDLEWARE FUNCTIONS
// ================================================================================

/**
 * Validates Firebase JWT token and attaches user information to request
 * 
 * This middleware function performs comprehensive JWT token validation including:
 * - Authorization header format validation
 * - Token length and format checks
 * - Firebase token signature verification
 * - User context attachment to request object
 * - Comprehensive error handling and logging
 * 
 * @async
 * @function validarUsuario
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers.authorization - Bearer token header (required)
 * @param {string} req.ip - Client IP address for logging
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>} Continues to next middleware or returns error response
 * 
 * @throws {401} AUTH_001 - When authorization header is missing
 * @throws {401} AUTH_002 - When authorization header format is invalid
 * @throws {401} AUTH_003 - When Firebase token verification fails
 * @throws {401} AUTH_004 - When token exceeds maximum length
 * 
 * @example
 * // Usage in route
 * router.get('/protected', validarUsuario, (req, res) => {
 *   console.log(req.user.uid); // Firebase UID available
 *   console.log(req.user.email); // User email available
 * });
 * 
 * @example
 * // Expected Authorization header format
 * // Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * @since 1.0.0
 * @version 2.1.0
 */
async function validarUsuario(req, res, next) {
  try {
    // Step 1: Check for authorization header
    const authHeader = req.headers[AUTH_CONFIG.TOKEN_HEADER];
    if (!authHeader) {
      return sendAuthError(res, AUTH_ERRORS.NO_TOKEN, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // Step 2: Validate authorization header format
    if (!authHeader.startsWith(AUTH_CONFIG.TOKEN_PREFIX)) {
      return sendAuthError(res, AUTH_ERRORS.INVALID_FORMAT, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: `Header format: ${authHeader.substring(0, 20)}...`
      });
    }

    // Step 3: Extract and validate token
    const token = authHeader.substring(AUTH_CONFIG.TOKEN_PREFIX.length);
    
    // Validate token presence after extraction
    if (!token || token.trim().length === 0) {
      return sendAuthError(res, AUTH_ERRORS.INVALID_FORMAT, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: 'Empty token after Bearer prefix'
      });
    }

    // Validate token length to prevent potential attacks
    if (token.length > AUTH_CONFIG.MAX_TOKEN_LENGTH) {
      return sendAuthError(res, AUTH_ERRORS.TOKEN_TOO_LONG, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: `Token length: ${token.length} characters`
      });
    }

    // Step 4: Verify Firebase JWT token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Step 5: Attach user context to request
    req.user = decodedToken;
    req.authContext = {
      requestId: req.id || Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip
    };

    // Step 6: Log successful authentication
    logAuthEvent('USER_AUTHENTICATED', req, {
      userId: decodedToken.uid,
      email: decodedToken.email,
      requestPath: req.path
    });

    // Continue to next middleware
    next();

  } catch (err) {
    // Handle Firebase verification errors
    let errorDetails = 'Token verification failed';
    
    // Categorize Firebase errors for better handling
    if (err.code === 'auth/id-token-expired') {
      errorDetails = 'Token has expired';
    } else if (err.code === 'auth/id-token-revoked') {
      errorDetails = 'Token has been revoked';
    } else if (err.code === 'auth/invalid-id-token') {
      errorDetails = 'Token format is invalid';
    } else if (err.code === 'auth/project-not-found') {
      errorDetails = 'Firebase project configuration error';
    }

    // Send error response with appropriate context
    return sendAuthError(res, AUTH_ERRORS.TOKEN_INVALID, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: AUTH_CONFIG.EXPOSE_ERROR_DETAILS ? errorDetails : undefined,
      firebaseError: err.code
    });
  }
}

/**
 * Validates that authenticated user has admin privileges
 * 
 * This middleware function checks if the currently authenticated user (set by validarUsuario)
 * has admin privileges by comparing their UID against the configured admin UIDs list.
 * 
 * IMPORTANT: This middleware MUST be used after validarUsuario middleware as it depends
 * on req.user being populated with the authenticated user information.
 * 
 * Features:
 * - Validates middleware dependency chain
 * - Uses cached admin UIDs for performance
 * - Comprehensive audit logging
 * - Structured error responses
 * 
 * @function validarAdmin
 * @param {Object} req - Express request object (must have req.user from validarUsuario)
 * @param {Object} req.user - User object from Firebase token (required)
 * @param {string} req.user.uid - Firebase user ID to check against admin list
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Continues to next middleware or returns error response
 * 
 * @throws {500} AUTH_007 - When req.user is missing (middleware dependency error)
 * @throws {403} AUTH_005 - When user is not in admin UIDs list
 * 
 * @example
 * // Correct usage - validarUsuario MUST come first
 * router.post('/admin/action', validarUsuario, validarAdmin, (req, res) => {
 *   // User is authenticated AND has admin privileges
 *   res.json({ message: 'Admin action completed' });
 * });
 * 
 * @example
 * // INCORRECT usage - will cause AUTH_007 error
 * router.post('/admin/wrong', validarAdmin, (req, res) => {
 *   // This will fail because req.user is not set
 * });
 * 
 * @since 1.0.0
 * @version 2.1.0
 */
function validarAdmin(req, res, next) {
  try {
    // Step 1: Validate middleware dependency - req.user must exist
    if (!req.user) {
      logger.error('validarAdmin middleware dependency error', {
        error: 'req.user is missing - validarUsuario middleware not called first',
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return sendAuthError(res, AUTH_ERRORS.USER_CONTEXT_MISSING, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: 'validarUsuario middleware must be called before validarAdmin'
      });
    }

    // Step 2: Get cached admin UIDs for performance
    const adminUids = getCachedAdminUids();
    
    // Step 3: Check if current user is in admin list
    const userUid = req.user.uid;
    const isAdmin = adminUids.includes(userUid);

    if (!isAdmin) {
      // Log unauthorized admin access attempt
      logger.warn('Unauthorized admin access attempt', {
        userId: userUid,
        email: req.user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestPath: req.path,
        method: req.method
      });

      return sendAuthError(res, AUTH_ERRORS.ACCESS_DENIED, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // Step 4: Log successful admin access for audit trail
    logAuthEvent('ADMIN_ACCESS_GRANTED', req, {
      userId: userUid,
      email: req.user.email,
      requestPath: req.path,
      adminUidsCount: adminUids.length
    });

    // Step 5: Add admin context to request
    req.adminContext = {
      isAdmin: true,
      verifiedAt: new Date().toISOString(),
      adminUidsCount: adminUids.length
    };

    // Continue to next middleware
    next();

  } catch (err) {
    // Handle unexpected errors in admin validation
    logger.error('Unexpected error in validarAdmin middleware', {
      error: err.message,
      stack: err.stack,
      userId: req.user?.uid,
      path: req.path,
      ip: req.ip
    });

    return sendAuthError(res, AUTH_ERRORS.MIDDLEWARE_ERROR, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      details: AUTH_CONFIG.EXPOSE_ERROR_DETAILS ? err.message : undefined
    });
  }
}

// ================================================================================
// MODULE EXPORTS
// ================================================================================

module.exports = { 
  validarUsuario, 
  validarAdmin,
  // Export utility functions for testing and cache management
  clearAdminCache,
  // Export constants for testing and configuration
  AUTH_ERRORS,
  AUTH_CONFIG
};
