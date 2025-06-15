/**
 * @fileoverview Application Configuration Module
 * @description Centralized configuration management for the Cubicle Management System.
 * Contains all configurable values, constants, and environment-specific settings.
 * 
 * @version 1.0.0
 * @author IBM Space Optimization Team
 * @since 1.0.0
 * 
 * @module AppConfig
 * 
 * Key Features:
 * - Environment-specific configuration
 * - Database and server settings
 * - Grid layout configuration
 * - Security and rate limiting settings
 * - Real-time communication settings
 */

// ================================================================================
// ENVIRONMENT CONFIGURATION
// ================================================================================

/**
 * Environment detection and configuration
 */
const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8080',
  MONGO_URI: process.env.MONGO_URI,
  SEED_DATA: process.env.SEED === 'true'
};

/**
 * Development vs Production configuration flags
 */
const IS_PRODUCTION = ENV.NODE_ENV === 'production';
const IS_DEVELOPMENT = ENV.NODE_ENV === 'development';

// ================================================================================
// CUBICLE GRID CONFIGURATION
// ================================================================================

/**
 * Cubicle grid layout configuration
 * Defines the physical layout of the cubicle system
 */
const GRID_CONFIG = {
  /**
   * Grid dimensions
   */
  TOTAL_ROWS: 9,
  TOTAL_COLS: 6,
  TOTAL_CUBICLES: 54, // 9 * 6
  
  /**
   * Section configuration
   * Defines how rows are divided into sections
   */
  SECTIONS: {
    A: { startRow: 1, endRow: 3, name: 'Section A' },
    B: { startRow: 4, endRow: 6, name: 'Section B' },
    C: { startRow: 7, endRow: 9, name: 'Section C' }
  },
  
  /**
   * Available section identifiers
   */
  SECTION_IDS: ['A', 'B', 'C'],
  
  /**
   * Cubicle naming patterns
   */
  NAMING: {
    SERIAL_FORMAT: '{section}{row}-CUB{counter}',
    NAME_FORMAT: 'Cubicle {counter}',
    DEFAULT_DESCRIPTION: 'More details about this cubicle will be added later.'
  }
};

// ================================================================================
// DATABASE CONFIGURATION
// ================================================================================

/**
 * Database connection and operation settings
 */
const DATABASE_CONFIG = {
  /**
   * Connection settings
   */
  CONNECTION: {
    RETRY_ATTEMPTS: 3,
    TIMEOUT: 30000, // 30 seconds
    BUFFER_MAX_ENTRIES: IS_PRODUCTION ? 0 : -1
  },
  
  /**
   * Index creation settings
   */
  INDEXES: {
    BACKGROUND: true,
    SPARSE_INDEXES: true,
    TTL_DAYS: 180 // For automatic cleanup
  },
  
  /**
   * Query optimization
   */
  QUERY: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 1000,
    DEFAULT_SORT: { createdAt: -1 }
  }
};

// ================================================================================
// SERVER CONFIGURATION
// ================================================================================

/**
 * Express server configuration
 */
const SERVER_CONFIG = {
  /**
   * CORS settings
   */
  CORS: {
    ORIGIN: IS_PRODUCTION ? ENV.FRONTEND_URL : [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:3000',
      ENV.FRONTEND_URL
    ],
    METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    CREDENTIALS: true,
    ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With'],
    PREFLIGHT_CONTINUE: false,
    OPTIONS_SUCCESS_STATUS: 200
  },
  
  /**
   * Request limits
   */
  LIMITS: {
    JSON_LIMIT: '10mb',
    URL_ENCODED_LIMIT: '10mb',
    PARAMETER_LIMIT: 1000
  },
  
  /**
   * Health check configuration
   */
  HEALTH: {
    ENDPOINT: '/health',
    API_ENDPOINT: '/api/health',
    TIMEOUT: 5000
  }
};

// ================================================================================
// WEBSOCKET CONFIGURATION
// ================================================================================

/**
 * Socket.IO real-time communication settings
 */
const WEBSOCKET_CONFIG = {
  /**
   * Connection settings
   */
  CONNECTION: {
    CORS: {
      ORIGIN: IS_PRODUCTION ? ENV.FRONTEND_URL : [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:3000',
        ENV.FRONTEND_URL
      ],
      METHODS: ['GET', 'POST'],
      CREDENTIALS: true
    },
    PING_TIMEOUT: 60000,
    PING_INTERVAL: 25000,
    ALLOW_UPGRADES: true,
    TRANSPORTS: ['websocket', 'polling']
  },
  
  /**
   * Event names
   */
  EVENTS: {
    STATISTICS_UPDATE: 'statisticsUpdate',
    DATE_RESERVATION_UPDATE: 'dateReservationUpdate',
    CUBICLE_UPDATE: 'cubicleUpdate',
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect'
  },
  
  /**
   * Update intervals and debouncing
   */
  TIMING: {
    STATS_UPDATE_DELAY: 1000, // 1 second debounce
    CONNECTION_RETRY_DELAY: 5000
  }
};

// ================================================================================
// SECURITY CONFIGURATION
// ================================================================================

/**
 * Security and authentication settings
 */
const SECURITY_CONFIG = {
  /**
   * Authentication settings
   */
  AUTH: {
    TOKEN_HEADER: 'authorization',
    TOKEN_PREFIX: 'Bearer ',
    ADMIN_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    MAX_TOKEN_LENGTH: 2048
  },
  
  /**
   * Rate limiting configuration
   */
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
    ADMIN_MAX_REQUESTS: 200,
    STRICT_MODE: IS_PRODUCTION
  }
};

// ================================================================================
// TESTING CONFIGURATION
// ================================================================================

/**
 * Testing and development settings
 */
const TESTING_CONFIG = {
  /**
   * Test endpoints (development only)
   */
  ENDPOINTS: {
    ENABLED: IS_DEVELOPMENT,
    HEALTH_NOTIFICATION: '/api/test/health-notification',
    STATS_UPDATE: '/test-stats-update'
  },
  
  /**
   * Mock data settings
   */
  MOCK_DATA: {
    ENABLED: IS_DEVELOPMENT,
    HEALTH_DATA: {
      totalCubicles: 81,
      reservedCubicles: 45,
      errorCubicles: 2
    }
  }
};

// ================================================================================
// LOGGING CONFIGURATION
// ================================================================================

/**
 * Logging and monitoring settings
 */
const LOGGING_CONFIG = {
  /**
   * Log levels
   */
  LEVEL: IS_PRODUCTION ? 'warn' : 'info',
  
  /**
   * Log formats
   */
  FORMAT: IS_PRODUCTION ? 'json' : 'simple',
  
  /**
   * Performance monitoring
   */
  PERFORMANCE: {
    TRACK_SLOW_QUERIES: true,
    SLOW_QUERY_THRESHOLD: 1000, // 1 second
    TRACK_MEMORY_USAGE: IS_DEVELOPMENT
  }
};

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

/**
 * Get section identifier for a given row number
 * @param {number} row - Row number (1-based)
 * @returns {string} Section identifier ('A', 'B', or 'C')
 * 
 * @example
 * getSectionForRow(2); // Returns 'A'
 * getSectionForRow(5); // Returns 'B'
 * getSectionForRow(8); // Returns 'C'
 */
function getSectionForRow(row) {
  if (row <= GRID_CONFIG.SECTIONS.A.endRow) return 'A';
  if (row <= GRID_CONFIG.SECTIONS.B.endRow) return 'B';
  return 'C';
}

/**
 * Generate cubicle serial number
 * @param {string} section - Section identifier
 * @param {number} row - Row number
 * @param {number} counter - Cubicle counter
 * @returns {string} Formatted serial number
 * 
 * @example
 * generateCubicleSerial('A', 1, 5); // Returns 'A1-CUB5'
 */
function generateCubicleSerial(section, row, counter) {
  return GRID_CONFIG.NAMING.SERIAL_FORMAT
    .replace('{section}', section)
    .replace('{row}', row)
    .replace('{counter}', counter);
}

/**
 * Generate cubicle name
 * @param {number} counter - Cubicle counter
 * @returns {string} Formatted cubicle name
 * 
 * @example
 * generateCubicleName(5); // Returns 'Cubicle 5'
 */
function generateCubicleName(counter) {
  return GRID_CONFIG.NAMING.NAME_FORMAT.replace('{counter}', counter);
}

/**
 * Validate environment configuration
 * @returns {Object} Validation result with status and errors
 */
function validateConfig() {
  const errors = [];
  
  if (!ENV.PORT || isNaN(ENV.PORT)) {
    errors.push('Invalid PORT configuration');
  }
  
  if (!ENV.FRONTEND_URL) {
    errors.push('FRONTEND_URL not configured');
  }
  
  if (GRID_CONFIG.TOTAL_ROWS * GRID_CONFIG.TOTAL_COLS !== GRID_CONFIG.TOTAL_CUBICLES) {
    errors.push('Grid configuration mismatch: TOTAL_CUBICLES does not match ROWS * COLS');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ================================================================================
// EXPORTS
// ================================================================================

module.exports = {
  // Environment
  ENV,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  
  // Configuration objects
  GRID_CONFIG,
  DATABASE_CONFIG,
  SERVER_CONFIG,
  WEBSOCKET_CONFIG,
  SECURITY_CONFIG,
  TESTING_CONFIG,
  LOGGING_CONFIG,
  
  // Utility functions
  getSectionForRow,
  generateCubicleSerial,
  generateCubicleName,
  validateConfig
};
