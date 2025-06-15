/**
 * @fileoverview Enhanced Error Handling Middleware
 * @description Comprehensive error handling system for the Cubicle Management System.
 * Provides centralized error processing, logging, and response formatting.
 * 
 * @version 1.0.0
 * @author IBM Space Optimization Team
 * @since 1.0.0
 * 
 * @module ErrorMiddleware
 * 
 * Key Features:
 * - Comprehensive error classification and handling
 * - Security-aware error message filtering
 * - Structured logging with context
 * - Development vs production error responses
 * - Performance monitoring integration
 * - Request ID tracking for debugging
 */

const logger = require('../logger');
const { IS_PRODUCTION } = require('../config/appConfig');

// ================================================================================
// ERROR CLASSIFICATION
// ================================================================================

/**
 * Error types and their corresponding HTTP status codes
 */
const ERROR_TYPES = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND_ERROR: 404,
  CONFLICT_ERROR: 409,
  RATE_LIMIT_ERROR: 429,
  DATABASE_ERROR: 500,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * MongoDB error code mappings
 */
const MONGO_ERROR_CODES = {
  11000: 'DUPLICATE_KEY', // Duplicate key error
  11001: 'DUPLICATE_KEY', // Duplicate key error
  16500: 'VALIDATION_ERROR', // Document validation failed
  50: 'COMMAND_NOT_FOUND', // Command not found
  13: 'UNAUTHORIZED' // Not authorized
};

/**
 * Mongoose validation error types
 */
const MONGOOSE_ERROR_TYPES = {
  ValidationError: 'VALIDATION_ERROR',
  CastError: 'VALIDATION_ERROR',
  DocumentNotFoundError: 'NOT_FOUND_ERROR'
};

// ================================================================================
// ERROR CLASSIFICATION FUNCTIONS
// ================================================================================

/**
 * Classify error type based on error object
 * @param {Error} error - Error object to classify
 * @returns {Object} Classification result with type and status code
 */
function classifyError(error) {
  // MongoDB errors
  if (error.code && MONGO_ERROR_CODES[error.code]) {
    return {
      type: MONGO_ERROR_CODES[error.code],
      statusCode: error.code === 11000 ? ERROR_TYPES.CONFLICT_ERROR : ERROR_TYPES.DATABASE_ERROR,
      isOperational: true
    };
  }
  
  // Mongoose errors
  if (error.name && MONGOOSE_ERROR_TYPES[error.name]) {
    return {
      type: MONGOOSE_ERROR_TYPES[error.name],
      statusCode: ERROR_TYPES.VALIDATION_ERROR,
      isOperational: true
    };
  }
  
  // Express validation errors
  if (error.name === 'ValidationError' && error.array) {
    return {
      type: 'VALIDATION_ERROR',
      statusCode: ERROR_TYPES.VALIDATION_ERROR,
      isOperational: true
    };
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return {
      type: 'AUTHENTICATION_ERROR',
      statusCode: ERROR_TYPES.AUTHENTICATION_ERROR,
      isOperational: true
    };
  }
  
  // Rate limiting errors
  if (error.statusCode === 429) {
    return {
      type: 'RATE_LIMIT_ERROR',
      statusCode: ERROR_TYPES.RATE_LIMIT_ERROR,
      isOperational: true
    };
  }
  
  // Custom application errors
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return {
      type: 'CLIENT_ERROR',
      statusCode: error.statusCode,
      isOperational: true
    };
  }
  
  // Default to internal server error
  return {
    type: 'INTERNAL_ERROR',
    statusCode: ERROR_TYPES.INTERNAL_ERROR,
    isOperational: false
  };
}

/**
 * Extract meaningful error message based on error type
 * @param {Error} error - Error object
 * @param {Object} classification - Error classification
 * @returns {string} User-friendly error message
 */
function extractErrorMessage(error, classification) {
  // Production mode - sanitize error messages
  if (IS_PRODUCTION && !classification.isOperational) {
    return 'An internal server error occurred. Please try again later.';
  }
  
  switch (classification.type) {
    case 'DUPLICATE_KEY':
      if (error.keyPattern) {
        const field = Object.keys(error.keyPattern)[0];
        return `A record with this ${field} already exists`;
      }
      return 'A record with these details already exists';
      
    case 'VALIDATION_ERROR':
      if (error.errors) {
        // Mongoose validation errors
        return Object.values(error.errors)
          .map(err => err.message)
          .join(', ');
      }
      if (error.array) {
        // Express-validator errors
        return error.array()
          .map(err => `${err.param}: ${err.msg}`)
          .join(', ');
      }
      return error.message || 'Validation failed';
      
    case 'AUTHENTICATION_ERROR':
      return 'Authentication failed. Please check your credentials.';
      
    case 'AUTHORIZATION_ERROR':
      return 'Access denied. Insufficient permissions.';
      
    case 'NOT_FOUND_ERROR':
      return error.message || 'Requested resource not found';
      
    case 'RATE_LIMIT_ERROR':
      return 'Too many requests. Please try again later.';
      
    default:
      return error.message || 'An unexpected error occurred';
  }
}

// ================================================================================
// LOGGING FUNCTIONS
// ================================================================================

/**
 * Log error with appropriate level and context
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} classification - Error classification
 */
function logError(error, req, classification) {
  const errorContext = {
    errorType: classification.type,
    statusCode: classification.statusCode,
    isOperational: classification.isOperational,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.uid,
    requestId: req.id,
    timestamp: new Date().toISOString()
  };
  
  // Add stack trace for non-operational errors or in development
  if (!classification.isOperational || !IS_PRODUCTION) {
    errorContext.stack = error.stack;
  }
  
  // Log based on error severity
  if (classification.statusCode >= 500) {
    logger.error('Server error occurred', {
      error: error.message,
      ...errorContext
    });
  } else if (classification.statusCode >= 400) {
    logger.warn('Client error occurred', {
      error: error.message,
      ...errorContext
    });
  } else {
    logger.info('Request handled with error', {
      error: error.message,
      ...errorContext
    });
  }
}

// ================================================================================
// RESPONSE FORMATTING
// ================================================================================

/**
 * Format error response based on environment and error type
 * @param {Error} error - Error object
 * @param {Object} classification - Error classification
 * @param {Object} req - Express request object
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error, classification, req) {
  const baseResponse = {
    success: false,
    error: {
      type: classification.type,
      message: extractErrorMessage(error, classification),
      statusCode: classification.statusCode,
      timestamp: new Date().toISOString()
    }
  };
  
  // Add request ID for tracking
  if (req.id) {
    baseResponse.error.requestId = req.id;
  }
  
  // Development mode - add additional debug information
  if (!IS_PRODUCTION) {
    baseResponse.error.debug = {
      originalMessage: error.message,
      stack: error.stack,
      name: error.name
    };
    
    // Add MongoDB error details
    if (error.code) {
      baseResponse.error.debug.mongoCode = error.code;
    }
    
    // Add validation error details
    if (error.errors) {
      baseResponse.error.debug.validationErrors = error.errors;
    }
  }
  
  return baseResponse;
}

// ================================================================================
// MIDDLEWARE FUNCTIONS
// ================================================================================

/**
 * Generate unique request ID middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function requestIdMiddleware(req, res, next) {
  req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * Main error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
function errorHandler(error, req, res, next) {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }
  
  try {
    // Classify the error
    const classification = classifyError(error);
    
    // Log the error
    logError(error, req, classification);
    
    // Format response
    const errorResponse = formatErrorResponse(error, classification, req);
    
    // Send response
    res.status(classification.statusCode).json(errorResponse);
    
  } catch (handlingError) {
    // Fallback error handling if our error handler fails
    logger.error('Error in error handler:', handlingError);
    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while processing your request',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
}

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
  const error = {
    success: false,
    error: {
      type: 'NOT_FOUND_ERROR',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  };
  
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id
  });
  
  res.status(404).json(error);
}

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function with error handling
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ================================================================================
// EXPORTS
// ================================================================================

module.exports = {
  requestIdMiddleware,
  errorHandler,
  notFoundHandler,
  asyncErrorHandler,
  classifyError,
  extractErrorMessage,
  formatErrorResponse,
  ERROR_TYPES,
  MONGO_ERROR_CODES,
  MONGOOSE_ERROR_TYPES
};
