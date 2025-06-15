/**
 * @fileoverview Enhanced Logging System
 * @description Production-ready Winston logger with environment-specific configuration,
 * log rotation, structured formatting, and comprehensive error handling.
 * 
 * @version 2.0.0
 * @author IBM Space Optimization Team
 * @since 1.0.0
 * 
 * @module Logger
 * 
 * Key Features:
 * - Environment-specific log levels and formats
 * - Automatic log rotation with size and time-based management
 * - Structured logging with correlation IDs
 * - Comprehensive error and exception handling
 * - Performance monitoring integration
 * - Production-ready security considerations
 */

const { createLogger, transports, format } = require('winston');
const path = require('path');
const fs = require('fs');

// Import configuration (with fallback for standalone usage)
let config;
try {
  config = require('./config/appConfig');
} catch (error) {
  // Fallback configuration if appConfig is not available
  config = {
    LOGGING_CONFIG: {
      LEVEL: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
      FORMAT: process.env.NODE_ENV === 'production' ? 'json' : 'simple'
    },
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    IS_DEVELOPMENT: process.env.NODE_ENV !== 'production'
  };
}

// ================================================================================
// LOGGING CONFIGURATION
// ================================================================================

/**
 * Ensure logs directory exists
 * Creates the logs directory if it doesn't exist for file transports
 * Handles Docker/container environments gracefully
 */
function ensureLogsDirectory() {
  let logsDir;
  
  // Determine appropriate logs directory based on environment
  if (process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV) {
    // In Docker production, use /tmp/logs which is writable
    logsDir = '/tmp/logs';
  } else if (process.env.DOCKER_ENV) {
    // In Docker development, try /tmp/logs first
    logsDir = '/tmp/logs';
  } else {
    // Local development, use relative path
    logsDir = path.join(__dirname, 'logs');
  }
  
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true });
    } catch (error) {
      // Fallback to /tmp if we can't create in preferred location
      if (logsDir !== '/tmp/logs') {
        console.warn(`Failed to create logs directory at ${logsDir}, falling back to /tmp/logs:`, error.message);
        logsDir = '/tmp/logs';
        try {
          fs.mkdirSync(logsDir, { recursive: true });
        } catch (fallbackError) {
          console.error('Failed to create fallback logs directory:', fallbackError.message);
          return null; // Signal that file logging should be disabled
        }
      } else {
        console.error('Failed to create logs directory:', error.message);
        return null; // Signal that file logging should be disabled
      }
    }
  }
  
  return logsDir;
}

/**
 * Create custom log format based on environment
 * @returns {object} Winston format configuration
 */
function createLogFormat() {
  const baseFormat = format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.metadata({
      fillExcept: ['message', 'level', 'timestamp', 'stack']
    })
  );

  if (config.LOGGING_CONFIG.FORMAT === 'json' || config.IS_PRODUCTION) {
    return format.combine(
      baseFormat,
      format.json()
    );
  }

  return format.combine(
    baseFormat,
    format.colorize(),
    format.printf(({ timestamp, level, message, stack, metadata }) => {
      let logMessage = `${timestamp} [${level}]: ${message}`;
      
      // Add stack trace for errors
      if (stack) {
        logMessage += `\n${stack}`;
      }
      
      // Add metadata if present
      if (metadata && Object.keys(metadata).length > 0) {
        logMessage += `\n  Metadata: ${JSON.stringify(metadata, null, 2)}`;
      }
      
      return logMessage;
    })
  );
}

/**
 * Create transport configurations based on environment
 * @returns {Array} Array of Winston transport configurations
 */
function createTransports() {
  const logsDir = ensureLogsDirectory();
  const transportsList = [];
  
  // Console transport (always present)
  transportsList.push(new transports.Console({
    level: config.IS_PRODUCTION ? 'info' : 'debug',
    handleExceptions: true,
    handleRejections: true
  }));

  // Only add file transports if we can create the logs directory
  if (logsDir) {
    if (config.IS_PRODUCTION) {
      // Production: Separate files for different log levels
      transportsList.push(
        // Error logs
        new transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 5,
          tailable: true,
          handleExceptions: true,
          handleRejections: true
        }),
        
        // Combined logs
        new transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
          tailable: true
        }),
        
        // Audit logs for security events
        new transports.File({
          filename: path.join(logsDir, 'audit.log'),
          level: 'warn',
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 30,
          tailable: true
        })
      );
    } else {
      // Development: Single file with rotation
      transportsList.push(
        new transports.File({
          filename: path.join(logsDir, 'development.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 3,
          tailable: true,
          handleExceptions: true,
          handleRejections: true
        })
      );
    }
  } else {
    console.warn('File logging disabled due to directory creation failure - using console only');
  }

  return transportsList;
}

// ================================================================================
// LOGGER INSTANCE CREATION
// ================================================================================

/**
 * Create and configure Winston logger instance
 * @returns {object} Configured Winston logger
 */
function createEnhancedLogger() {
  const logsDir = ensureLogsDirectory();
  
  const loggerConfig = {
    level: config.LOGGING_CONFIG.LEVEL,
    format: createLogFormat(),
    transports: createTransports(),
    
    // Prevent logger from exiting on handled exceptions
    exitOnError: false
  };

  // Only add file-based exception/rejection handlers if we have a logs directory
  if (logsDir && config.IS_PRODUCTION) {
    loggerConfig.exceptionHandlers = [
      new transports.File({
        filename: path.join(logsDir, 'exceptions.log'),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5
      })
    ];
    
    loggerConfig.rejectionHandlers = [
      new transports.File({
        filename: path.join(logsDir, 'rejections.log'),
        maxsize: 5 * 1024 * 1024,
        maxFiles: 5
      })
    ];
  }

  const logger = createLogger(loggerConfig);

  // Add custom logging methods for common patterns
  logger.audit = function(message, metadata = {}) {
    this.warn(message, { ...metadata, type: 'AUDIT' });
  };

  logger.security = function(message, metadata = {}) {
    this.error(message, { ...metadata, type: 'SECURITY' });
  };

  logger.performance = function(message, metadata = {}) {
    this.info(message, { ...metadata, type: 'PERFORMANCE' });
  };

  logger.request = function(message, metadata = {}) {
    this.info(message, { ...metadata, type: 'REQUEST' });
  };

  // Add error event handling
  logger.on('error', (error) => {
    console.error('Logger error:', error);
  });

  return logger;
}

// ================================================================================
// LOGGER UTILITIES
// ================================================================================

/**
 * Generate correlation ID for request tracking
 * @returns {string} Unique correlation ID
 */
function generateCorrelationId() {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create child logger with correlation ID
 * @param {string} correlationId - Request correlation ID
 * @returns {object} Child logger with correlation context
 */
function createChildLogger(correlationId = null) {
  const corrId = correlationId || generateCorrelationId();
  return mainLogger.child({ correlationId: corrId });
}

/**
 * Log performance metrics
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {object} metadata - Additional metadata
 */
function logPerformance(operation, duration, metadata = {}) {
  mainLogger.performance(`Operation completed: ${operation}`, {
    operation,
    duration,
    ...metadata
  });
}

// ================================================================================
// MAIN LOGGER EXPORT
// ================================================================================

// Create the main logger instance
const mainLogger = createEnhancedLogger();

// Log initialization success
mainLogger.info('Enhanced logging system initialized', {
  level: config.LOGGING_CONFIG.LEVEL,
  format: config.LOGGING_CONFIG.FORMAT,
  environment: config.IS_PRODUCTION ? 'production' : 'development',
  timestamp: new Date().toISOString()
});

// Export main logger and utilities
module.exports = mainLogger;
module.exports.createChildLogger = createChildLogger;
module.exports.logPerformance = logPerformance;
module.exports.generateCorrelationId = generateCorrelationId;