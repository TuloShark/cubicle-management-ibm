/**
 * @fileoverview Cubicle Model
 * 
 * Enterprise-grade cubicle management model for the IBM Space Optimization application.
 * Provides comprehensive cubicle tracking, grid management, status control, and 
 * business intelligence capabilities with proper validation, indexing, and audit trails.
 * 
 * @author IBM Space Optimization Team
 * @version 2.1.0
 * @since 1.0.0
 */

const mongoose = require('mongoose');
const { getAdminUids } = require('../utils/adminUtils');

/**
 * Cubicle Schema
 * 
 * Comprehensive cubicle management model for office space optimization.
 * Tracks physical cubicles with grid positioning, status management, and rich metadata
 * for reservation systems, analytics, and business intelligence with enterprise-grade features.
 * 
 * @typedef {Object} Cubicle
 * @property {String} section - Physical section identifier (A, B, C)
 * @property {Number} row - Row position in grid layout (1-9)
 * @property {Number} col - Column position in grid layout (1-6)
 * @property {String} serial - Unique cubicle identifier with format validation
 * @property {String} name - Human-readable cubicle name
 * @property {String} status - Current operational status (available/reserved/error)
 * @property {String} description - Additional cubicle information
 * @property {String} createdBy - User who created the cubicle record
 * @property {String} lastModifiedBy - User who last modified the cubicle
 * @property {Date} createdAt - Automatic creation timestamp
 * @property {Date} updatedAt - Automatic update timestamp
 */
const CubicleSchema = new mongoose.Schema({
  /**
   * Physical Section Identifier
   * 
   * Represents the physical section of the office layout.
   * Used for grid organization and spatial analytics.
   * 
   * @type {String}
   * @required
   * @enum {String} A|B|C
   * @index For section-based queries and filtering
   */
  section: { 
    type: String, 
    required: [true, 'Section is required'],
    enum: {
      values: ['A', 'B', 'C'],
      message: 'Section must be A, B, or C'
    },
    uppercase: true,
    trim: true,
    index: true
  },

  /**
   * Grid Row Position
   * 
   * Row number in the office grid layout.
   * Must be within defined boundaries for valid positioning.
   * 
   * @type {Number}
   * @required
   * @min 1
   * @max 9
   * @index Part of compound grid position index
   */
  row: { 
    type: Number, 
    required: [true, 'Row is required'],
    min: [1, 'Row must be at least 1'],
    max: [9, 'Row cannot exceed 9'],
    validate: {
      validator: Number.isInteger,
      message: 'Row must be an integer'
    }
  },

  /**
   * Grid Column Position
   * 
   * Column number in the office grid layout.
   * Must be within defined boundaries for valid positioning.
   * 
   * @type {Number}
   * @required
   * @min 1
   * @max 6
   * @index Part of compound grid position index
   */
  col: { 
    type: Number, 
    required: [true, 'Column is required'],
    min: [1, 'Column must be at least 1'],
    max: [6, 'Column cannot exceed 6'],
    validate: {
      validator: Number.isInteger,
      message: 'Column must be an integer'
    }
  },

  /**
   * Unique Serial Identifier
   * 
   * Formatted unique identifier for the cubicle.
   * Must follow format: [A|B|C][row]-CUB[number]
   * 
   * @type {String}
   * @required
   * @unique
   * @format [A|B|C][1-9]-CUB[1-99]
   * @example "A1-CUB1", "B3-CUB15", "C9-CUB54"
   */
  serial: { 
    type: String, 
    required: [true, 'Serial is required'],
    unique: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return /^[ABC]\d+-CUB\d+$/.test(v);
      },
      message: 'Serial must follow format: [A|B|C][row]-CUB[number] (e.g., A1-CUB1)'
    }
  },

  /**
   * Human-Readable Name
   * 
   * Display name for the cubicle in user interfaces.
   * Used for identification and user-friendly displays.
   * 
   * @type {String}
   * @required
   * @minlength 1
   * @maxlength 100
   * @index Part of text search index
   */
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    minlength: [1, 'Name cannot be empty'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  /**
   * Operational Status
   * 
   * Current status of the cubicle for reservation management.
   * Controls availability and user interactions.
   * 
   * @type {String}
   * @enum {String} available|reserved|error
   * @default available
   * @index For status-based queries and filtering
   */
  status: { 
    type: String, 
    enum: {
      values: ['available', 'reserved', 'error'],
      message: 'Status must be available, reserved, or error'
    },
    default: 'available',
    index: true
  },

  /**
   * Additional Description
   * 
   * Optional detailed information about the cubicle.
   * Used for special notes, equipment details, or accessibility info.
   * 
   * @type {String}
   * @optional
   * @maxlength 500
   * @index Part of text search index
   */
  description: { 
    type: String, 
    default: 'More details about this cubicle will be added later.',
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  /**
   * Audit Trail - Created By
   * 
   * User identifier who created this cubicle record.
   * Used for audit trails and accountability.
   * 
   * @type {String}
   * @required
   * @maxlength 255
   */
  createdBy: {
    type: String,
    required: [true, 'Created by is required'],
    trim: true,
    maxlength: [255, 'Created by cannot exceed 255 characters']
  },

  /**
   * Audit Trail - Last Modified By
   * 
   * User identifier who last modified this cubicle record.
   * Updated automatically on modifications.
   * 
   * @type {String}
   * @optional
   * @maxlength 255
   */
  lastModifiedBy: {
    type: String,
    trim: true,
    maxlength: [255, 'Last modified by cannot exceed 255 characters']
  }
}, {
  // Schema Options for Production Optimization
  timestamps: true, // Adds createdAt and updatedAt automatically
  collection: 'cubicles', // Explicit collection name
  
  // Performance and Development Options
  strict: true, // Enforce schema validation
  strictQuery: true, // Strict mode for queries
  versionKey: '__v', // Keep version key for conflict resolution
  
  // Optimization Settings
  minimize: false, // Keep empty objects
  autoCreate: true, // Auto-create collection
  
  // Development vs Production Configuration
  ...(process.env.NODE_ENV === 'production' ? {
    autoIndex: false, // Disable auto-indexing in production
    bufferMaxEntries: 0 // Disable buffering in production
  } : {
    autoIndex: true, // Enable auto-indexing in development
    bufferMaxEntries: -1 // Unlimited buffering in development
  })
});

// ====================================
// STRATEGIC INDEXING FOR PERFORMANCE
// ====================================

/**
 * Compound Indexes for Optimized Query Performance
 * 
 * Strategic indexing to support the most common query patterns:
 * - Grid position queries (section, row, col)
 * - Status-based filtering by section
 * - Text search capabilities
 * - Audit trail queries
 */

// Primary compound index for grid positioning and sorting
CubicleSchema.index({ 
  section: 1, 
  row: 1, 
  col: 1 
}, {
  name: 'grid_position',
  background: true
});

// Status filtering by section for availability queries
CubicleSchema.index({ 
  status: 1, 
  section: 1 
}, {
  name: 'status_section',
  background: true
});

// Text search capability for serial and name fields
CubicleSchema.index({ 
  serial: 'text',
  name: 'text',
  description: 'text'
}, {
  name: 'text_search',
  background: true
});

// Audit trail queries for compliance and monitoring
CubicleSchema.index({ 
  createdBy: 1, 
  createdAt: -1 
}, {
  name: 'audit_created',
  background: true
});

CubicleSchema.index({ 
  lastModifiedBy: 1, 
  updatedAt: -1 
}, {
  name: 'audit_modified',
  background: true,
  partialFilterExpression: { lastModifiedBy: { $exists: true, $ne: null } }
});

// ====================================
// VIRTUAL PROPERTIES
// ====================================

/**
 * Virtual Properties for Computed Fields
 * 
 * Provides computed properties that don't need to be stored but are
 * useful for business logic and display formatting.
 */

/**
 * Check if cubicle is available for reservation
 * @returns {Boolean} True if status is available
 */
CubicleSchema.virtual('isAvailable').get(function() {
  return this.status === 'available';
});

/**
 * Check if cubicle is currently reserved
 * @returns {Boolean} True if status is reserved
 */
CubicleSchema.virtual('isReserved').get(function() {
  return this.status === 'reserved';
});

/**
 * Check if cubicle is in error/maintenance state
 * @returns {Boolean} True if status is error
 */
CubicleSchema.virtual('isInError').get(function() {
  return this.status === 'error';
});

/**
 * Get formatted grid position
 * @returns {String} Formatted position like "A1-1" (section-row-col)
 */
CubicleSchema.virtual('gridPosition').get(function() {
  return `${this.section}${this.row}-${this.col}`;
});

/**
 * Get full display identifier
 * @returns {String} Serial and name combined for display
 */
CubicleSchema.virtual('displayName').get(function() {
  return `${this.serial} (${this.name})`;
});

// ====================================
// INSTANCE METHODS
// ====================================

/**
 * Business Logic Instance Methods
 * 
 * Methods that operate on individual cubicle instances
 * for business logic, validation, and workflow management.
 */

/**
 * Check if cubicle can be reserved
 * @returns {Boolean} True if cubicle is available for reservation
 */
CubicleSchema.methods.canReserve = function() {
  return this.status === 'available';
};

/**
 * Check if cubicle can be set to error state
 * @param {Object} user - User object with admin privileges
 * @returns {Boolean} True if user has admin privileges
 */
CubicleSchema.methods.canSetError = function(user) {
  // Only admins can set error state
  const adminUids = getAdminUids();
  return adminUids.includes(user?.uid);
};

/**
 * Get adjacent cubicles in the same section
 * @returns {Promise<Array>} Array of adjacent cubicles
 */
CubicleSchema.methods.getAdjacentCubicles = async function() {
  const adjacentPositions = [
    { section: this.section, row: this.row - 1, col: this.col }, // Above
    { section: this.section, row: this.row + 1, col: this.col }, // Below
    { section: this.section, row: this.row, col: this.col - 1 }, // Left
    { section: this.section, row: this.row, col: this.col + 1 }  // Right
  ];

  return await this.constructor.find({
    $or: adjacentPositions.filter(pos => 
      pos.row >= 1 && pos.row <= 9 && pos.col >= 1 && pos.col <= 6
    )
  }).lean();
};

/**
 * Validate status transition
 * @param {String} newStatus - The new status to transition to
 * @param {Object} user - User attempting the transition
 * @returns {Object} Validation result with success boolean and message
 */
CubicleSchema.methods.validateStatusTransition = function(newStatus, user) {
  const currentStatus = this.status;
  
  // Allow same status (no change)
  if (currentStatus === newStatus) {
    return { success: true, message: 'No status change required' };
  }
  
  // Error state transitions require admin privileges
  if (newStatus === 'error' && !this.canSetError(user)) {
    return { 
      success: false, 
      message: 'Only administrators can set cubicles to error state' 
    };
  }
  
  // Validate specific transition rules
  switch (currentStatus) {
    case 'available':
      // Available can go to any state
      return { success: true, message: `Transition to ${newStatus} allowed` };
      
    case 'reserved':
      // Reserved can go to available or error
      if (newStatus === 'available' || newStatus === 'error') {
        return { success: true, message: `Transition to ${newStatus} allowed` };
      }
      return { 
        success: false, 
        message: 'Reserved cubicles can only be set to available or error' 
      };
      
    case 'error':
      // Error state requires admin to change
      if (!this.canSetError(user)) {
        return { 
          success: false, 
          message: 'Only administrators can modify cubicles in error state' 
        };
      }
      return { success: true, message: `Admin transition to ${newStatus} allowed` };
      
    default:
      return { 
        success: false, 
        message: `Unknown current status: ${currentStatus}` 
      };
  }
};

// ====================================
// STATIC METHODS
// ====================================

/**
 * Static Methods for Queries and Utilities
 * 
 * Class-level methods for common queries, analytics,
 * and utility functions that operate on the collection.
 */

/**
 * Find cubicles by section
 * @param {String} section - Section identifier (A, B, C)
 * @returns {Promise<Array>} Array of cubicles in the section
 */
CubicleSchema.statics.findBySection = function(section) {
  return this.find({ section: section.toUpperCase() })
    .sort({ row: 1, col: 1 })
    .lean();
};

/**
 * Get available cubicles in a specific section
 * @param {String} section - Section identifier (A, B, C)
 * @returns {Promise<Array>} Array of available cubicles
 */
CubicleSchema.statics.getAvailableInSection = function(section) {
  return this.find({ 
    section: section.toUpperCase(), 
    status: 'available' 
  })
    .sort({ row: 1, col: 1 })
    .lean();
};

/**
 * Get complete grid layout organized by sections
 * @returns {Promise<Object>} Grid layout object with sections A, B, C
 */
CubicleSchema.statics.getGridLayout = async function() {
  const cubicles = await this.find({})
    .sort({ section: 1, row: 1, col: 1 })
    .lean();
  
  const layout = { A: [], B: [], C: [] };
  
  cubicles.forEach(cubicle => {
    if (layout[cubicle.section]) {
      layout[cubicle.section].push(cubicle);
    }
  });
  
  return layout;
};

/**
 * Get cubicle statistics by section
 * @returns {Promise<Object>} Statistics object with counts by section and status
 */
CubicleSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: { section: '$section', status: '$status' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.section',
        statusCounts: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);
  
  // Transform aggregation result into a more usable format
  const result = { overall: { total: 0, available: 0, reserved: 0, error: 0 } };
  
  stats.forEach(section => {
    result[section._id] = { total: section.total, available: 0, reserved: 0, error: 0 };
    result.overall.total += section.total;
    
    section.statusCounts.forEach(statusCount => {
      result[section._id][statusCount.status] = statusCount.count;
      result.overall[statusCount.status] += statusCount.count;
    });
  });
  
  return result;
};

/**
 * Find cubicles by serial pattern
 * @param {String} pattern - Pattern to match against serial
 * @returns {Promise<Array>} Array of matching cubicles
 */
CubicleSchema.statics.findBySerialPattern = function(pattern) {
  return this.find({ 
    serial: { $regex: pattern, $options: 'i' } 
  })
    .sort({ serial: 1 })
    .lean();
};

/**
 * Validate grid position availability
 * @param {String} section - Section identifier
 * @param {Number} row - Row number
 * @param {Number} col - Column number
 * @returns {Promise<Boolean>} True if position is available
 */
CubicleSchema.statics.isPositionAvailable = async function(section, row, col) {
  const existing = await this.findOne({ 
    section: section.toUpperCase(), 
    row, 
    col 
  }).lean();
  
  return !existing;
};

// ====================================
// MIDDLEWARE FOR BUSINESS LOGIC
// ====================================

/**
 * Pre-save Middleware
 * 
 * Executes validation and business logic before saving documents.
 * Handles audit trails, validation, and data normalization.
 */
CubicleSchema.pre('save', function(next) {
  try {
    // Normalize section to uppercase
    if (this.section) {
      this.section = this.section.toUpperCase();
    }
    
    // Normalize serial to uppercase
    if (this.serial) {
      this.serial = this.serial.toUpperCase();
    }
    
    // Set lastModifiedBy for updates (except initial creation)
    if (!this.isNew && this.isModified()) {
      // This should be set by the controller, but provide fallback
      if (!this.lastModifiedBy) {
        console.warn('lastModifiedBy not set for cubicle update:', this._id);
      }
    }
    
    // Validate serial format matches section and row
    if (this.isModified('serial') || this.isModified('section') || this.isModified('row')) {
      const expectedPrefix = `${this.section}${this.row}-CUB`;
      if (!this.serial.startsWith(expectedPrefix)) {
        throw new Error(`Serial ${this.serial} does not match section ${this.section} and row ${this.row}`);
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Post-save Middleware
 * 
 * Executes cleanup and notification logic after successful saves.
 * Handles logging, cache invalidation, and external system integration.
 */
CubicleSchema.post('save', async function(doc) {
  try {
    // Log important status changes for monitoring
    if (this.isModified('status')) {
      console.log(`Cubicle status changed: ${doc._id}`, {
        serial: doc.serial,
        section: doc.section,
        position: `${doc.row}-${doc.col}`,
        status: doc.status,
        modifiedBy: doc.lastModifiedBy
      });
    }
    
    // Log new cubicle creation
    if (this.isNew) {
      console.log(`New cubicle created: ${doc.serial}`, {
        section: doc.section,
        position: `${doc.row}-${doc.col}`,
        createdBy: doc.createdBy
      });
    }
  } catch (error) {
    // Don't throw errors in post-save to avoid breaking the save operation
    console.error('Error in Cubicle post-save middleware:', error);
  }
});

// ====================================
// EXPORT WITH COMPREHENSIVE DOCUMENTATION
// ====================================

/**
 * Cubicle Model Export
 * 
 * Enterprise-grade cubicle management with comprehensive features:
 * 
 * Key Features:
 * - ✅ Complete grid position management with validation
 * - ✅ Comprehensive status lifecycle (available → reserved → error)
 * - ✅ Strategic indexing for optimal query performance
 * - ✅ Virtual properties for computed fields
 * - ✅ Instance methods for business logic and validation
 * - ✅ Static methods for queries and analytics
 * - ✅ Middleware for data validation and audit trails
 * - ✅ Production-ready with proper error handling and monitoring
 * 
 * Usage Examples:
 * 
 * @example
 * // Create new cubicle
 * const cubicle = new Cubicle({
 *   section: 'A',
 *   row: 1,
 *   col: 1,
 *   serial: 'A1-CUB1',
 *   name: 'Cubicle 1',
 *   createdBy: 'admin@example.com'
 * });
 * await cubicle.save();
 * 
 * @example
 * // Check availability and reserve
 * const cubicle = await Cubicle.findById(cubicleId);
 * if (cubicle.canReserve()) {
 *   cubicle.status = 'reserved';
 *   cubicle.lastModifiedBy = 'user@example.com';
 *   await cubicle.save();
 * }
 * 
 * @example
 * // Get section layout
 * const sectionA = await Cubicle.findBySection('A');
 * 
 * @example
 * // Get available cubicles
 * const available = await Cubicle.getAvailableInSection('B');
 * 
 * @example
 * // Get comprehensive statistics
 * const stats = await Cubicle.getStatistics();
 */
module.exports = mongoose.model('Cubicle', CubicleSchema);
