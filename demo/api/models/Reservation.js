/**
 * @fileoverview Reservation Model
 * 
 * Enterprise-grade cubicle reservation management for the IBM Space Optimization application.
 * Provides comprehensive reservation tracking, user management, temporal analytics, and 
 * business intelligence capabilities with proper validation, indexing, and audit trails.
 * 
 * @author IBM Space Optimization Developer - Wander Jimenez Calvo
 * @version 2.1.0
 * @since 1.0.0
 */

const mongoose = require('mongoose');
const logger = require('../logger');

/**
 * Reservation Schema
 * 
 * Comprehensive reservation management model for office space optimization.
 * Tracks cubicle reservations with user information, temporal data, and rich metadata
 * for analytics, reporting, and business intelligence with enterprise-grade features.
 * 
 * @typedef {Object} Reservation
 * @property {ObjectId} cubicle - Reference to the reserved cubicle
 * @property {Object} user - Complete user information for the reservation
 * @property {Date} date - Reservation date with validation
 * @property {String} status - Current reservation status
 * @property {Date} reservedAt - When the reservation was created
 * @property {Date} checkedInAt - When user checked into the cubicle
 * @property {Date} checkedOutAt - When user checked out of the cubicle
 * @property {Object} metadata - Rich metadata for analytics and tracking
 * @property {Date} createdAt - Automatic creation timestamp
 * @property {Date} updatedAt - Automatic update timestamp
 */
const ReservationSchema = new mongoose.Schema({
  /**
   * Cubicle Reference
   * 
   * Reference to the cubicle being reserved.
   * Establishes the relationship between reservation and physical space.
   * 
   * @type {ObjectId}
   * @required
   * @ref Cubicle
   * @index Primary index for cubicle-based queries
   */
  cubicle: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cubicle', 
    required: [true, 'Cubicle reference is required'],
    index: true,
    validate: {
      validator: function(cubicleId) {
        return mongoose.Types.ObjectId.isValid(cubicleId);
      },
      message: 'Invalid cubicle ID format'
    }
  },

  /**
   * User Information
   * 
   * Complete user details for the person making the reservation.
   * Embedded user data for performance and to maintain historical records
   * even if user accounts are modified or deleted.
   * 
   * @type {Object}
   * @required
   */
  user: {
    /**
     * User Unique Identifier
     * Primary identifier from authentication system
     * @type {String}
     * @required
     * @index For user-based queries and analytics
     */
    uid: {
      type: String,
      required: [true, 'User UID is required'],
      trim: true,
      minlength: [1, 'User UID cannot be empty'],
      maxlength: [255, 'User UID cannot exceed 255 characters'],
      index: true,
      validate: {
        validator: function(uid) {
          // Ensure UID contains only valid characters
          return /^[a-zA-Z0-9_-]+$/.test(uid);
        },
        message: 'User UID can only contain alphanumeric characters, underscores, and hyphens'
      }
    },
    
    /**
     * User Email Address
     * Contact information and secondary identifier
     * @type {String}
     * @required
     * @format email
     * @index For email-based queries
     */
    email: {
      type: String,
      required: [true, 'User email is required'],
      trim: true,
      lowercase: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
      index: true
    },
    
    /**
     * User Display Name
     * Human-readable name for UI display
     * @type {String}
     * @optional
     * @maxlength 100
     */
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
      default: null
    },

    /**
     * User Department/Team
     * Organizational information for analytics
     * @type {String}
     * @optional
     * @maxlength 100
     */
    department: {
      type: String,
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters'],
      index: true // For department-based analytics
    },

    /**
     * User Role/Title
     * Job function information
     * @type {String}
     * @optional
     * @maxlength 100
     */
    role: {
      type: String,
      trim: true,
      maxlength: [100, 'Role cannot exceed 100 characters']
    }
  },

  /**
   * Reservation Date
   * 
   * The date for which the cubicle is reserved.
   * Normalized to start of day in UTC for consistency.
   * 
   * @type {Date}
   * @required
   * @index Essential for date-range queries and analytics
   */
  date: {
    type: Date,
    required: [true, 'Reservation date is required'],
    index: true,
    validate: {
      validator: function(date) {
        // Ensure reservation date is not more than 1 year in the past
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        // Ensure reservation date is not more than 1 year in the future
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        return date >= oneYearAgo && date <= oneYearFromNow;
      },
      message: 'Reservation date must be within one year of today'
    }
  },

  /**
   * Reservation Status
   * 
   * Current state of the reservation through its lifecycle.
   * Enables workflow management and analytics.
   * 
   * @type {String}
   * @enum {String} Valid status values
   * @default 'active'
   * @index For status-based filtering
   */
  status: {
    type: String,
    enum: {
      values: ['active', 'checked-in', 'checked-out', 'cancelled', 'no-show', 'expired'],
      message: 'Invalid status. Must be one of: {VALUE}'
    },
    default: 'active',
    required: [true, 'Reservation status is required'],
    index: true,
    trim: true,
    lowercase: true
  },

  /**
   * Reserved At Timestamp
   * 
   * When the reservation was initially created.
   * Used for booking analytics and temporal tracking.
   * 
   * @type {Date}
   * @required
   * @default Date.now
   * @index For temporal analytics
   */
  reservedAt: {
    type: Date,
    required: [true, 'Reserved at timestamp is required'],
    default: Date.now,
    index: true,
    validate: {
      validator: function(reservedAt) {
        // Ensure reserved at is not in the future
        return reservedAt <= new Date();
      },
      message: 'Reserved at timestamp cannot be in the future'
    }
  },

  /**
   * Check-in Timestamp
   * 
   * When the user physically arrived and checked into the cubicle.
   * Used for utilization analytics and attendance tracking.
   * 
   * @type {Date}
   * @optional
   * @index For check-in analytics
   */
  checkedInAt: {
    type: Date,
    index: true,
    validate: {
      validator: function(checkedInAt) {
        if (!checkedInAt) return true;
        
        // Check-in must be after reservation was made
        if (this.reservedAt && checkedInAt < this.reservedAt) {
          return false;
        }
        
        // Check-in cannot be in the future
        if (checkedInAt > new Date()) {
          return false;
        }
        
        // Check-in must be on the same date as reservation
        const checkedInDate = new Date(checkedInAt);
        checkedInDate.setUTCHours(0, 0, 0, 0);
        const reservationDate = new Date(this.date);
        reservationDate.setUTCHours(0, 0, 0, 0);
        
        if (checkedInDate.getTime() !== reservationDate.getTime()) {
          return false;
        }
        
        return true;
      },
      message: 'Check-in time must be after reservation time, not in the future, and on the same date as reservation'
    }
  },

  /**
   * Check-out Timestamp
   * 
   * When the user finished using the cubicle and checked out.
   * Used for duration analytics and space utilization metrics.
   * 
   * @type {Date}
   * @optional
   * @index For check-out analytics
   */
  checkedOutAt: {
    type: Date,
    index: true,
    validate: {
      validator: function(checkedOutAt) {
        if (!checkedOutAt) return true;
        
        // Check-out must be after check-in if check-in exists
        if (this.checkedInAt && checkedOutAt < this.checkedInAt) {
          return false;
        }
        
        // Check-out cannot be in the future
        if (checkedOutAt > new Date()) {
          return false;
        }
        
        // Check-out should be on the same date as reservation (allow next day for overnight work)
        const checkoutDate = new Date(checkedOutAt);
        checkoutDate.setUTCHours(0, 0, 0, 0);
        const reservationDate = new Date(this.date);
        reservationDate.setUTCHours(0, 0, 0, 0);
        const nextDay = new Date(reservationDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        if (checkoutDate.getTime() !== reservationDate.getTime() && 
            checkoutDate.getTime() !== nextDay.getTime()) {
          return false;
        }
        
        return true;
      },
      message: 'Check-out time must be after check-in time, not in the future, and within one day of reservation'
    }
  },

  /**
   * Rich Metadata
   * 
   * Extended metadata for analytics, tracking, and business intelligence.
   * Supports comprehensive monitoring and optimization insights.
   * 
   * @type {Object}
   */
  metadata: {
    /**
     * Reservation source/channel
     * @type {String}
     * @enum {String} Source types
     * @default 'web'
     */
    source: {
      type: String,
      enum: {
        values: ['web', 'mobile', 'api', 'admin', 'import', 'system'],
        message: 'Invalid source type'
      },
      default: 'web',
      trim: true,
      lowercase: true
    },

    /**
     * Reservation priority level
     * @type {String}
     * @enum {String} Priority levels
     * @default 'normal'
     */
    priority: {
      type: String,
      enum: {
        values: ['low', 'normal', 'high', 'urgent', 'vip'],
        message: 'Invalid priority level'
      },
      default: 'normal',
      trim: true,
      lowercase: true
    },

    /**
     * Booking duration in hours
     * @type {Number}
     * @min 0.5
     * @max 24
     * @default 8
     */
    plannedDuration: {
      type: Number,
      min: [0.5, 'Planned duration must be at least 0.5 hours'],
      max: [24, 'Planned duration cannot exceed 24 hours'],
      default: 8,
      validate: {
        validator: function(duration) {
          return duration % 0.5 === 0; // Must be in 30-minute increments
        },
        message: 'Planned duration must be in 30-minute increments'
      }
    },

    /**
     * Actual usage duration in minutes
     * @type {Number}
     * @min 0
     */
    actualDuration: {
      type: Number,
      min: [0, 'Actual duration cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Actual duration must be an integer (minutes)'
      }
    },

    /**
     * Special requirements or notes
     * @type {String}
     * @maxlength 500
     */
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },

    /**
     * Equipment/accessories requested
     * @type {Array<String>}
     */
    equipment: {
      type: [{
        type: String,
        enum: {
          values: ['monitor', 'keyboard', 'mouse', 'headset', 'webcam', 'laptop_stand', 'desk_pad'],
          message: 'Invalid equipment type'
        },
        trim: true,
        lowercase: true
      }],
      default: []
    },

    /**
     * Accessibility requirements
     * @type {Array<String>}
     */
    accessibility: {
      type: [{
        type: String,
        enum: {
          values: ['wheelchair_accessible', 'adjustable_desk', 'close_to_facilities', 'quiet_zone'],
          message: 'Invalid accessibility requirement'
        },
        trim: true,
        lowercase: true
      }],
      default: []
    },

    /**
     * Reservation modification history
     * @type {Array<Object>}
     */
    modifications: {
      type: [{
        timestamp: {
          type: Date,
          default: Date.now
        },
        field: {
          type: String,
          required: true
        },
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        modifiedBy: {
          uid: String,
          email: String
        }
      }],
      default: []
    },

    /**
     * Integration data for external systems
     * @type {Mixed}
     */
    integrationData: {
      type: mongoose.Schema.Types.Mixed,
      validate: {
        validator: function(data) {
          try {
            JSON.stringify(data);
            return true;
          } catch (e) {
            return false;
          }
        },
        message: 'Integration data must be JSON-serializable'
      }
    }
  },

  /**
   * Assigned Email for Notifications
   * 
   * Optional email address to notify when the reservation is completed.
   * This allows assigning a cubicle to someone other than the person making the reservation.
   * 
   * @type {String}
   * @optional
   * @format email
   * @index For email-based queries
   */
  assignedEmail: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
    default: null
  }
}, {
  // Schema Options for Production Optimization
  timestamps: true, // Adds createdAt and updatedAt automatically
  collection: 'reservations', // Explicit collection name
  
  // Performance and Development Options
  strict: true, // Enforce schema validation
  strictQuery: true, // Strict mode for queries
  versionKey: '__v', // Keep version key for conflict resolution
  
  // Optimization Settings
  minimize: false, // Keep empty objects
  autoCreate: true, // Auto-create collection
  bufferCommands: true, // Buffer commands when disconnected
  
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
 * - Cubicle availability checks
 * - User reservation history
 * - Date-range analytics
 * - Status-based filtering
 */

// Primary compound index for cubicle-date uniqueness
ReservationSchema.index({ 
  cubicle: 1, 
  date: 1 
}, {
  name: 'cubicle_date_unique',
  unique: true, // Ensure only one reservation per cubicle per day
  background: true
});

// ================================================================================
// DAY-OF-WEEK ANALYTICS INDEXES
// ================================================================================

// Day-of-week analytics optimization - primary index for date-based day filtering
ReservationSchema.index({
  date: 1
}, {
  name: 'day_of_week_analytics',
  background: true,
  partialFilterExpression: { 
    status: { $in: ['active', 'checked-in', 'checked-out'] }
  }
});

// Day-of-week with section analysis for section-specific day patterns
ReservationSchema.index({
  date: 1,
  'cubicle.section': 1
}, {
  name: 'day_of_week_section_analytics',
  background: true,
  sparse: true
});

// Month-year analytics for day-of-week trends and comparisons
ReservationSchema.index({
  date: 1,
  'user.email': 1,
  status: 1
}, {
  name: 'monthly_trends_analytics',
  background: true
});

// User pattern analysis for day-of-week preferences
ReservationSchema.index({
  'user.email': 1,
  date: 1,
  'cubicle.section': 1
}, {
  name: 'user_day_preferences',
  background: true,
  sparse: true
});

// ================================================================================
// EXISTING INDEXES
// ================================================================================

// User activity and history tracking
ReservationSchema.index({ 
  'user.uid': 1, 
  date: -1,
  status: 1
}, {
  name: 'user_activity_tracking',
  background: true
});

// Email-based user lookup with temporal sorting
ReservationSchema.index({ 
  'user.email': 1, 
  date: -1 
}, {
  name: 'email_chronological',
  background: true
});

// Date-range analytics and reporting
ReservationSchema.index({ 
  date: -1, 
  status: 1,
  reservedAt: -1
}, {
  name: 'temporal_analytics',
  background: true
});

// Status-based workflow queries
ReservationSchema.index({ 
  status: 1, 
  date: 1,
  'user.uid': 1
}, {
  name: 'status_workflow',
  background: true
});

// Department analytics
ReservationSchema.index({ 
  'user.department': 1, 
  date: -1,
  status: 1
}, {
  name: 'department_analytics',
  background: true,
  partialFilterExpression: { 'user.department': { $exists: true, $ne: null } }
});

// Check-in/check-out analytics
ReservationSchema.index({ 
  checkedInAt: -1 
}, {
  name: 'checkin_analytics',
  background: true,
  partialFilterExpression: { checkedInAt: { $exists: true, $ne: null } }
});

ReservationSchema.index({ 
  checkedOutAt: -1 
}, {
  name: 'checkout_analytics',
  background: true,
  partialFilterExpression: { checkedOutAt: { $exists: true, $ne: null } }
});

// Priority and source analytics
ReservationSchema.index({ 
  'metadata.priority': 1, 
  'metadata.source': 1,
  date: -1
}, {
  name: 'priority_source_analytics',
  background: true
});

// Text search capability
ReservationSchema.index({ 
  'user.email': 'text',
  'user.displayName': 'text',
  'metadata.notes': 'text'
}, {
  name: 'text_search',
  background: true
});

// ====================================
// VIRTUAL FIELDS FOR COMPUTED PROPERTIES
// ====================================

/**
 * Virtual: Duration in Minutes
 * 
 * Calculates the actual duration of the reservation based on check-in/check-out times.
 * Returns null if the user hasn't checked out yet.
 * 
 * @returns {Number|null} Duration in minutes, or null if not applicable
 */
ReservationSchema.virtual('durationMinutes').get(function() {
  if (!this.checkedInAt || !this.checkedOutAt) return null;
  
  const durationMs = this.checkedOutAt.getTime() - this.checkedInAt.getTime();
  return Math.round(durationMs / (1000 * 60)); // Convert to minutes
});

/**
 * Virtual: Duration in Hours
 * 
 * Calculates the actual duration in hours with decimal precision.
 * Useful for reporting and analytics.
 * 
 * @returns {Number|null} Duration in hours (2 decimal places), or null if not applicable
 */
ReservationSchema.virtual('durationHours').get(function() {
  const minutes = this.durationMinutes;
  if (minutes === null) return null;
  
  return Math.round((minutes / 60) * 100) / 100; // Round to 2 decimal places
});

/**
 * Virtual: Is Active Today
 * 
 * Determines if the reservation is for today and still active.
 * Useful for real-time dashboard displays.
 * 
 * @returns {Boolean} True if reservation is for today and active
 */
ReservationSchema.virtual('isActiveToday').get(function() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const reservationDate = new Date(this.date);
  reservationDate.setUTCHours(0, 0, 0, 0);
  
  return reservationDate.getTime() === today.getTime() && 
         ['active', 'checked-in'].includes(this.status);
});

/**
 * Virtual: Utilization Rate
 * 
 * Calculates how much of the planned duration was actually used.
 * Returns percentage utilization rate.
 * 
 * @returns {Number|null} Utilization percentage, or null if not applicable
 */
ReservationSchema.virtual('utilizationRate').get(function() {
  const actualMinutes = this.durationMinutes;
  const plannedMinutes = (this.metadata?.plannedDuration || 8) * 60;
  
  if (actualMinutes === null || plannedMinutes === 0) return null;
  
  return Math.round((actualMinutes / plannedMinutes) * 100 * 100) / 100; // Round to 2 decimals
});

/**
 * Virtual: Status Summary
 * 
 * Provides a human-readable summary of the reservation status.
 * Includes timing information and next actions.
 * 
 * @returns {String} Human-readable status description
 */
ReservationSchema.virtual('statusSummary').get(function() {
  const today = new Date();
  const reservationDate = new Date(this.date);
  
  switch (this.status) {
    case 'active':
      if (reservationDate.toDateString() === today.toDateString()) {
        return '📋 Active - Ready for check-in';
      } else if (reservationDate > today) {
        return '⏳ Scheduled for future date';
      } else {
        return '⚠️ Past due - Consider marking as no-show';
      }
    case 'checked-in':
      const duration = this.durationMinutes;
      if (duration !== null) {
        return `✅ Checked in - Using for ${Math.round(duration)} minutes`;
      }
      return '✅ Currently checked in';
    case 'checked-out':
      return `✅ Completed - Used for ${this.durationHours || 'unknown'} hours`;
    case 'cancelled':
      return '❌ Cancelled by user';
    case 'no-show':
      return '👻 No-show - User did not arrive';
    case 'expired':
      return '⏰ Expired - Reservation time passed';
    default:
      return `❓ Unknown status: ${this.status}`;
  }
});

/**
 * Virtual: Formatted Date
 * 
 * Returns a human-readable formatted date string.
 * Useful for UI display and reporting.
 * 
 * @returns {String} Formatted date string
 */
ReservationSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// ====================================
// UTILITY METHODS FOR BUSINESS LOGIC
// ====================================

/**
 * Normalize Date to Start of Day
 * 
 * Utility function to normalize dates for consistent comparison and storage.
 * Used throughout the model for date operations.
 * 
 * @param {Date} date - Date to normalize
 * @returns {Date} Normalized date (start of day in UTC)
 * 
 * @example
 * const normalized = ReservationSchema.statics.normalizeDate(new Date());
 */
ReservationSchema.statics.normalizeDate = function(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// ====================================
// INSTANCE METHODS FOR BUSINESS LOGIC
// ====================================

/**
 * Check In User
 * 
 * Records when a user physically arrives and checks into their reserved cubicle.
 * Updates status and timestamps with comprehensive validation.
 * 
 * @param {Date} [checkInTime] - Custom check-in time (defaults to now)
 * @returns {Promise<Reservation>} Updated reservation document
 * 
 * @throws {Error} If reservation status is invalid for check-in
 * @throws {Error} If check-in time validation fails
 * @throws {Error} If business rules are violated
 * 
 * @example
 * await reservation.checkIn();
 * // or with custom time
 * await reservation.checkIn(new Date('2025-06-12 09:30:00'));
 */
ReservationSchema.methods.checkIn = async function(checkInTime = new Date()) {
  // Validate current status
  if (this.status !== 'active') {
    throw new Error(`Cannot check in from status '${this.status}'. Reservation must be active.`);
  }
  
  // Validate check-in time is not in the future
  if (checkInTime > new Date()) {
    throw new Error('Check-in time cannot be in the future');
  }
  
  // Validate check-in time is after reservation was made
  if (checkInTime < this.reservedAt) {
    throw new Error('Check-in time cannot be before reservation was made');
  }
  
  // Validate check-in is on the same date as reservation
  const checkInDate = this.constructor.normalizeDate(checkInTime);
  const reservationDate = this.constructor.normalizeDate(this.date);
  
  if (checkInDate.getTime() !== reservationDate.getTime()) {
    throw new Error(`Check-in must be on the same date as reservation (${reservationDate.toDateString()})`);
  }
  
  // Update status and timestamp
  this.status = 'checked-in';
  this.checkedInAt = checkInTime;
  
  // Add modification record
  if (!this.metadata) this.metadata = {};
  if (!this.metadata.modifications) this.metadata.modifications = [];
  
  this.metadata.modifications.push({
    timestamp: new Date(),
    field: 'status',
    oldValue: 'active',
    newValue: 'checked-in',
    modifiedBy: {
      uid: this.user.uid,
      email: this.user.email
    }
  });
  
  try {
    await this.save();
    return this;
  } catch (error) {
    // Reset status on save failure
    this.status = 'active';
    this.checkedInAt = undefined;
    throw new Error(`Failed to check in: ${error.message}`);
  }
};

/**
 * Check Out User
 * 
 * Records when a user finishes using the cubicle and checks out.
 * Calculates actual duration and updates analytics metadata with comprehensive validation.
 * 
 * @param {Date} [checkOutTime] - Custom check-out time (defaults to now)
 * @returns {Promise<Reservation>} Updated reservation document
 * 
 * @throws {Error} If reservation status is invalid for check-out
 * @throws {Error} If check-out time validation fails
 * @throws {Error} If business rules are violated
 * 
 * @example
 * await reservation.checkOut();
 */
ReservationSchema.methods.checkOut = async function(checkOutTime = new Date()) {
  // Validate current status
  if (this.status !== 'checked-in') {
    throw new Error(`Cannot check out from status '${this.status}'. User must be checked in first.`);
  }
  
  // Validate check-out time is not in the future
  if (checkOutTime > new Date()) {
    throw new Error('Check-out time cannot be in the future');
  }
  
  // Validate check-out time is after check-in time
  if (checkOutTime < this.checkedInAt) {
    throw new Error('Check-out time cannot be before check-in time');
  }
  
  // Validate check-out date (same day or next day for overnight work)
  const checkOutDate = this.constructor.normalizeDate(checkOutTime);
  const reservationDate = this.constructor.normalizeDate(this.date);
  const nextDay = new Date(reservationDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  const isSameDay = checkOutDate.getTime() === reservationDate.getTime();
  const isNextDay = checkOutDate.getTime() === nextDay.getTime();
  
  if (!isSameDay && !isNextDay) {
    throw new Error('Check-out must be on the same date as reservation or the following day');
  }
  
  // Calculate duration and validate reasonable limits
  const durationMs = checkOutTime.getTime() - this.checkedInAt.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  
  if (durationMinutes < 0) {
    throw new Error('Invalid duration calculated - check-out before check-in');
  }
  
  if (durationMinutes > (24 * 60)) { // More than 24 hours
    throw new Error('Duration cannot exceed 24 hours. For extended usage, create a new reservation.');
  }
  
  // Update status and timestamp
  this.status = 'checked-out';
  this.checkedOutAt = checkOutTime;
  
  // Update metadata with duration
  if (!this.metadata) this.metadata = {};
  this.metadata.actualDuration = durationMinutes;
  
  // Add modification record
  if (!this.metadata.modifications) this.metadata.modifications = [];
  this.metadata.modifications.push({
    timestamp: new Date(),
    field: 'status',
    oldValue: 'checked-in',
    newValue: 'checked-out',
    modifiedBy: {
      uid: this.user.uid,
      email: this.user.email
    }
  });
  
  try {
    await this.save();
    return this;
  } catch (error) {
    // Reset status on save failure
    this.status = 'checked-in';
    this.checkedOutAt = undefined;
    if (this.metadata) {
      delete this.metadata.actualDuration;
    }
    throw new Error(`Failed to check out: ${error.message}`);
  }
};

/**
 * Cancel Reservation
 * 
 * Cancels an active reservation with reason tracking.
 * Handles business logic for cancellation policies.
 * 
 * @param {String} [reason] - Reason for cancellation
 * @param {Object} [cancelledBy] - User who cancelled (defaults to reservation owner)
 * @returns {Promise<Reservation>} Updated reservation document
 * 
 * @example
 * await reservation.cancel('Meeting cancelled', { uid: 'admin123', email: 'admin@company.com' });
 */
ReservationSchema.methods.cancel = async function(reason = 'User cancelled', cancelledBy = null) {
  // Validate current status
  if (!['active', 'checked-in'].includes(this.status)) {
    throw new Error(`Cannot cancel reservation with status '${this.status}'`);
  }
  
  const previousStatus = this.status;
  
  // Update status
  this.status = 'cancelled';
  
  // If user was checked in, record check-out time
  if (previousStatus === 'checked-in' && !this.checkedOutAt) {
    this.checkedOutAt = new Date();
    
    // Calculate partial duration
    const durationMs = this.checkedOutAt.getTime() - this.checkedInAt.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    if (!this.metadata) this.metadata = {};
    this.metadata.actualDuration = durationMinutes;
  }
  
  // Add cancellation reason to notes
  if (!this.metadata) this.metadata = {};
  const existingNotes = this.metadata.notes || '';
  this.metadata.notes = existingNotes ? `${existingNotes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`;
  
  // Add modification record
  if (!this.metadata.modifications) this.metadata.modifications = [];
  this.metadata.modifications.push({
    timestamp: new Date(),
    field: 'status',
    oldValue: previousStatus,
    newValue: 'cancelled',
    modifiedBy: cancelledBy || {
      uid: this.user.uid,
      email: this.user.email
    }
  });
  
  await this.save();
  return this;
};

/**
 * Mark as No-Show
 * 
 * Marks reservation as no-show when user doesn't arrive.
 * Useful for analytics and capacity planning.
 * 
 * @param {Object} [markedBy] - User who marked as no-show
 * @returns {Promise<Reservation>} Updated reservation document
 * 
 * @example
 * await reservation.markAsNoShow({ uid: 'system', email: 'system@company.com' });
 */
ReservationSchema.methods.markAsNoShow = async function(markedBy = null) {
  // Validate current status
  if (this.status !== 'active') {
    throw new Error(`Cannot mark as no-show from status '${this.status}'. Reservation must be active.`);
  }
  
  // Update status
  this.status = 'no-show';
  
  // Add modification record
  if (!this.metadata) this.metadata = {};
  if (!this.metadata.modifications) this.metadata.modifications = [];
  
  this.metadata.modifications.push({
    timestamp: new Date(),
    field: 'status',
    oldValue: 'active',
    newValue: 'no-show',
    modifiedBy: markedBy || {
      uid: 'system',
      email: 'system@company.com'
    }
  });
  
  await this.save();
  return this;
};

/**
 * Get Reservation Summary
 * 
 * Returns comprehensive summary information for reporting and display.
 * Includes all relevant data points and computed metrics.
 * 
 * @returns {Object} Complete reservation summary
 * 
 * @example
 * const summary = reservation.getSummary();
 * console.log(summary.statusSummary); // "✅ Completed - Used for 6.5 hours"
 */
ReservationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    cubicle: this.cubicle,
    user: this.user,
    date: this.date,
    formattedDate: this.formattedDate,
    status: this.status,
    statusSummary: this.statusSummary,
    reservedAt: this.reservedAt,
    checkedInAt: this.checkedInAt,
    checkedOutAt: this.checkedOutAt,
    isActiveToday: this.isActiveToday,
    duration: {
      minutes: this.durationMinutes,
      hours: this.durationHours,
      planned: this.metadata?.plannedDuration || 8,
      utilizationRate: this.utilizationRate
    },
    metadata: {
      source: this.metadata?.source || 'web',
      priority: this.metadata?.priority || 'normal',
      notes: this.metadata?.notes,
      equipment: this.metadata?.equipment || [],
      accessibility: this.metadata?.accessibility || [],
      modifications: this.metadata?.modifications || []
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// ====================================
// STATIC METHODS FOR ANALYTICS
// ====================================

/**
 * Find Active Reservations for Date
 * 
 * Retrieves all active reservations for a specific date.
 * Optimized query with proper indexing and population.
 * 
 * @param {Date} date - Target date
 * @param {Object} [options] - Query options
 * @returns {Promise<Array<Reservation>>} Array of active reservations
 * 
 * @example
 * const todayReservations = await Reservation.findActiveForDate(new Date());
 */
ReservationSchema.statics.findActiveForDate = async function(date, options = {}) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);
  
  const query = {
    date: {
      $gte: targetDate,
      $lt: nextDate
    },
    status: { $in: ['active', 'checked-in', 'checked-out'] }
  };
  
  return await this.find(query)
    .populate('cubicle', 'section row col serial name status')
    .sort({ 'user.email': 1, 'cubicle.section': 1 })
    .lean()
    .exec();
};

/**
 * Get User Reservation Statistics
 * 
 * Calculates comprehensive reservation statistics for a specific user.
 * Includes utilization metrics, patterns, and behavior analytics.
 * 
 * @param {String} userId - User UID to analyze
 * @param {Object} [options] - Analysis options
 * @returns {Promise<Object>} User reservation statistics
 * 
 * @example
 * const userStats = await Reservation.getUserStatistics('user123', {
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-12-31')
 * });
 */
ReservationSchema.statics.getUserStatistics = async function(userId, options = {}) {
  const {
    startDate,
    endDate
  } = options;
  
  const matchConditions = { 'user.uid': userId };
  
  if (startDate || endDate) {
    matchConditions.date = {};
    if (startDate) matchConditions.date.$gte = startDate;
    if (endDate) matchConditions.date.$lte = endDate;
  }
  
  const pipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        totalReservations: { $sum: 1 },
        activeReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        completedReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'checked-out'] }, 1, 0] }
        },
        cancelledReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        noShowReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] }
        },
        totalDuration: {
          $sum: '$metadata.actualDuration'
        },
        avgDuration: {
          $avg: '$metadata.actualDuration'
        },
        uniqueDates: {
          $addToSet: '$date'
        },
        cubiclesUsed: {
          $addToSet: '$cubicle'
        },
        firstReservation: { $min: '$reservedAt' },
        lastReservation: { $max: '$reservedAt' }
      }
    },
    {
      $project: {
        _id: 0,
        totalReservations: 1,
        activeReservations: 1,
        completedReservations: 1,
        cancelledReservations: 1,
        noShowReservations: 1,
        completionRate: {
          $cond: [
            { $eq: ['$totalReservations', 0] },
            0,
            { $multiply: [{ $divide: ['$completedReservations', '$totalReservations'] }, 100] }
          ]
        },
        noShowRate: {
          $cond: [
            { $eq: ['$totalReservations', 0] },
            0,
            { $multiply: [{ $divide: ['$noShowReservations', '$totalReservations'] }, 100] }
          ]
        },
        totalDurationHours: {
          $divide: ['$totalDuration', 60]
        },
        avgDurationHours: {
          $divide: ['$avgDuration', 60]
        },
        daysActive: { $size: '$uniqueDates' },
        uniqueCubicles: { $size: '$cubiclesUsed' },
        firstReservation: 1,
        lastReservation: 1
      }
    }
  ];
  
  const result = await this.aggregate(pipeline).exec();
  return result[0] || {
    totalReservations: 0,
    activeReservations: 0,
    completedReservations: 0,
    cancelledReservations: 0,
    noShowReservations: 0,
    completionRate: 0,
    noShowRate: 0,
    totalDurationHours: 0,
    avgDurationHours: 0,
    daysActive: 0,
    uniqueCubicles: 0,
    firstReservation: null,
    lastReservation: null
  };
};

/**
 * Get Daily Utilization Analytics
 * 
 * Calculates comprehensive daily utilization metrics for analytics and reporting.
 * Provides insights into space usage patterns and optimization opportunities.
 * 
 * @param {Date} startDate - Analysis start date
 * @param {Date} endDate - Analysis end date
 * @returns {Promise<Array<Object>>} Daily utilization data
 * 
 * @example
 * const utilization = await Reservation.getDailyUtilization(
 *   new Date('2025-06-01'),
 *   new Date('2025-06-30')
 * );
 */
ReservationSchema.statics.getDailyUtilization = async function(startDate, endDate) {
  const pipeline = [
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$date' }
        },
        totalReservations: { $sum: 1 },
        activeReservations: {
          $sum: { $cond: [{ $in: ['$status', ['active', 'checked-in']] }, 1, 0] }
        },
        completedReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'checked-out'] }, 1, 0] }
        },
        cancelledReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        noShowReservations: {
          $sum: { $cond: [{ $eq: ['$status', 'no-show'] }, 1, 0] }
        },
        uniqueUsers: {
          $addToSet: '$user.uid'
        },
        uniqueCubicles: {
          $addToSet: '$cubicle'
        },
        totalDuration: {
          $sum: '$metadata.actualDuration'
        },
        avgCheckInTime: {
          $avg: {
            $hour: '$checkedInAt'
          }
        }
      }
    },
    {
      $project: {
        date: '$_id',
        totalReservations: 1,
        activeReservations: 1,
        completedReservations: 1,
        cancelledReservations: 1,
        noShowReservations: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        uniqueCubicles: { $size: '$uniqueCubicles' },
        utilizationRate: {
          $cond: [
            { $eq: ['$totalReservations', 0] },
            0,
            { $multiply: [{ $divide: ['$activeReservations', '$totalReservations'] }, 100] }
          ]
        },
        completionRate: {
          $cond: [
            { $eq: ['$totalReservations', 0] },
            0,
            { $multiply: [{ $divide: ['$completedReservations', '$totalReservations'] }, 100] }
          ]
        },
        totalDurationHours: { $divide: ['$totalDuration', 60] },
        avgCheckInTime: { $round: ['$avgCheckInTime', 1] }
      }
    },
    {
      $sort: { date: 1 }
    }
  ];
  
  return await this.aggregate(pipeline).exec();
};

/**
 * Expire Old Active Reservations
 * 
 * Automatically marks active reservations as expired when they're past their date
 * and haven't been checked in. Used for maintenance and cleanup operations.
 * 
 * @param {Object} [options] - Expiration options
 * @param {Number} [options.gracePeriodHours=2] - Grace period after reservation date before expiring
 * @param {Boolean} [options.dryRun=false] - If true, returns count without making changes
 * @returns {Promise<Object>} Expiration results with count and details
 * 
 * @example
 * // Expire reservations older than 2 hours past their date
 * const result = await Reservation.expireOldReservations();
 * console.log(`Expired ${result.expiredCount} reservations`);
 * 
 * @example
 * // Check what would be expired without making changes
 * const dryRun = await Reservation.expireOldReservations({ dryRun: true });
 */
ReservationSchema.statics.expireOldReservations = async function(options = {}) {
  const {
    gracePeriodHours = 2,
    dryRun = false
  } = options;
  
  // Calculate cutoff date (reservation date + grace period)
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - gracePeriodHours);
  cutoffDate.setHours(0, 0, 0, 0); // Start of day for date comparison
  
  // Find active reservations past their expiration date
  const expiredQuery = {
    status: 'active',
    date: { $lt: cutoffDate }
  };
  
  if (dryRun) {
    const count = await this.countDocuments(expiredQuery);
    const reservations = await this.find(expiredQuery)
      .select('_id user.email date cubicle')
      .populate('cubicle', 'serial section')
      .lean();
    
    return {
      wouldExpireCount: count,
      reservations: reservations.map(r => ({
        id: r._id,
        userEmail: r.user.email,
        date: r.date,
        cubicle: r.cubicle?.serial || 'Unknown',
        daysOverdue: Math.floor((new Date() - r.date) / (1000 * 60 * 60 * 24))
      }))
    };
  }
  
  // Update expired reservations
  const updateResult = await this.updateMany(
    expiredQuery,
    {
      $set: {
        status: 'expired'
      },
      $push: {
        'metadata.modifications': {
          timestamp: new Date(),
          field: 'status',
          oldValue: 'active',
          newValue: 'expired',
          modifiedBy: {
            uid: 'system',
            email: 'system@company.com'
          }
        }
      }
    }
  );
  
  // Get details of expired reservations for logging
  const expiredReservations = await this.find({
    status: 'expired',
    'metadata.modifications': {
      $elemMatch: {
        field: 'status',
        newValue: 'expired',
        timestamp: { $gte: new Date(Date.now() - 60000) } // Last minute
      }
    }
  })
  .select('_id user.email date cubicle')
  .populate('cubicle', 'serial section')
  .lean();
  
  return {
    expiredCount: updateResult.modifiedCount,
    matchedCount: updateResult.matchedCount,
    reservations: expiredReservations.map(r => ({
      id: r._id,
      userEmail: r.user.email,
      date: r.date,
      cubicle: r.cubicle?.serial || 'Unknown',
      daysOverdue: Math.floor((new Date() - r.date) / (1000 * 60 * 60 * 24))
    }))
  };
};

// ====================================
// MIDDLEWARE FOR BUSINESS LOGIC
// ====================================

/**
 * Pre-save Middleware
 * 
 * Executes business logic before saving reservation records.
 * Handles data validation, normalization, and automatic field population.
 */
ReservationSchema.pre('save', async function(next) {
  try {
    // Normalize date to start of day
    if (this.date) {
      const normalizedDate = new Date(this.date);
      normalizedDate.setHours(0, 0, 0, 0);
      this.date = normalizedDate;
    }
    
    // Check for existing reservation on same cubicle and date for new documents
    if (this.isNew) {
      const existingReservation = await this.constructor.findOne({
        cubicle: this.cubicle,
        date: this.date,
        _id: { $ne: this._id }
      });
      
      if (existingReservation) {
        throw new Error(`Cubicle is already reserved for ${this.date.toDateString()}`);
      }
    }
    
    // Normalize email to lowercase
    if (this.user && this.user.email) {
      this.user.email = this.user.email.toLowerCase().trim();
    }
    
    // Initialize metadata if not present
    if (!this.metadata) {
      this.metadata = {
        source: 'web',
        priority: 'normal',
        plannedDuration: 8,
        equipment: [],
        accessibility: [],
        modifications: []
      };
    }
    
    // Set reservedAt timestamp for new reservations
    if (this.isNew && !this.reservedAt) {
      this.reservedAt = new Date();
    }
    
    // Validate status transitions for existing documents
    if (!this.isNew && this.isModified('status')) {
      const validTransitions = {
        'active': ['checked-in', 'cancelled', 'no-show', 'expired'],
        'checked-in': ['checked-out', 'cancelled'],
        'checked-out': [], // Terminal state
        'cancelled': [], // Terminal state
        'no-show': [], // Terminal state
        'expired': ['cancelled'] // Can be cancelled after expiring
      };
      
      const currentStatus = this.get('status', null, { getters: false });
      const previousStatus = this.$__original_status || currentStatus;
      
      if (previousStatus && !validTransitions[previousStatus]?.includes(currentStatus)) {
        throw new Error(`Invalid status transition from ${previousStatus} to ${currentStatus}`);
      }
    }
    
    // Store original status for transition validation
    if (this.isNew) {
      this.$__original_status = this.status;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-validate Middleware
 * 
 * Performs additional validation beyond schema constraints.
 * Implements business rules and cross-field validation.
 */
ReservationSchema.pre('validate', function(next) {
  try {
    // Ensure check-out is after check-in
    if (this.checkedInAt && this.checkedOutAt && this.checkedOutAt <= this.checkedInAt) {
      throw new Error('Check-out time must be after check-in time');
    }
    
    // Validate that reserved date is not too far in the past for new reservations
    if (this.isNew && this.date) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (this.date < sixMonthsAgo) {
        throw new Error('Cannot create reservations more than 6 months in the past');
      }
      
      // Add maximum advance booking validation (90 days)
      const maxAdvanceDate = new Date();
      maxAdvanceDate.setDate(maxAdvanceDate.getDate() + 90);
      
      if (this.date > maxAdvanceDate) {
        throw new Error('Cannot create reservations more than 90 days in advance');
      }
    }
    
    // Validate planned duration is reasonable
    if (this.metadata?.plannedDuration && (this.metadata.plannedDuration < 0.5 || this.metadata.plannedDuration > 24)) {
      throw new Error('Planned duration must be between 0.5 and 24 hours');
    }
    
    // Validate equipment requests are not excessive
    if (this.metadata?.equipment && this.metadata.equipment.length > 5) {
      throw new Error('Cannot request more than 5 equipment items per reservation');
    }
    
    // Validate notes length
    if (this.metadata?.notes && this.metadata.notes.length > 500) {
      throw new Error('Notes cannot exceed 500 characters');
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
 * Handles cache invalidation and external system integration.
 */
ReservationSchema.post('save', async function(doc) {
  try {
    // Log important status changes for monitoring
    if (this.isModified('status')) {
      console.log(`Reservation status changed: ${doc._id}`, {
        user: doc.user.email,
        cubicle: doc.cubicle,
        date: doc.date,
        status: doc.status,
        previousStatus: this.$__original_status
      });
    }
    
    // Performance monitoring for long durations
    if (doc.status === 'checked-out' && doc.durationHours > 12) {
      console.warn(`Long reservation detected: ${doc.durationHours} hours`, {
        reservationId: doc._id,
        user: doc.user.email,
        duration: doc.durationHours
      });
    }
    
    // Handle email notifications for new reservations with assigned emails
    if (doc.assignedEmail && doc._wasNew) {
      const EmailNotificationService = require('../services/notifications/EmailNotificationService');
      
      // Populate cubicle information for the notification
      await doc.populate('cubicle', 'section row col serial name');
      
      const emailService = new EmailNotificationService();
      
      if (emailService.isConfigured()) {
        // Create a notification email for cubicle assignment
        const subject = 'Cubicle Reserved for You - IBM Space Optimization';
        const cubicleInfo = `${doc.cubicle.name} (${doc.cubicle.serial})`;
        const dateInfo = new Date(doc.date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        // HTML email content
        const htmlContent = `
          <div style="font-family: 'IBM Plex Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0f62fe; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Cubicle Reserved for You</h1>
            </div>
            <div style="padding: 30px; background: #f4f4f4;">
              <p style="font-size: 16px; line-height: 1.6; color: #161616;">
                Hello,
              </p>
              <p style="font-size: 16px; line-height: 1.6; color: #161616;">
                A cubicle has been reserved for you in the IBM Space Optimization system.
              </p>
              <div style="background: white; padding: 20px; border-left: 4px solid #0f62fe; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0f62fe;">Reservation Details:</h3>
                <p style="margin: 5px 0;"><strong>Cubicle:</strong> ${cubicleInfo}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${dateInfo}</p>
                <p style="margin: 5px 0;"><strong>Reserved by:</strong> ${doc.user.email}</p>
                <p style="margin: 5px 0;"><strong>Reserved for:</strong> ${doc.assignedEmail}</p>
                <p style="margin: 5px 0;"><strong>Reserved at:</strong> ${new Date(doc.reservedAt || doc.createdAt).toLocaleString()}</p>
              </div>
              <p style="font-size: 16px; line-height: 1.6; color: #161616;">
                Please make sure to use the cubicle on the specified date. Thank you for using the IBM Space Optimization system.
              </p>
              <p style="font-size: 14px; color: #6f6f6f; margin-top: 30px;">
                This is an automated notification from the IBM Space Optimization platform.
              </p>
            </div>
          </div>
        `;
        
        // Text fallback
        const textContent = `
Cubicle Reserved for You

Hello,

A cubicle has been reserved for you in the IBM Space Optimization system.

Reservation Details:
- Cubicle: ${cubicleInfo}
- Date: ${dateInfo}
- Reserved by: ${doc.user.email}
- Reserved for: ${doc.assignedEmail}
- Reserved at: ${new Date(doc.reservedAt || doc.createdAt).toLocaleString()}

Please make sure to use the cubicle on the specified date. Thank you for using the IBM Space Optimization system.

This is an automated notification from the IBM Space Optimization platform.
        `;
        
        // Send email using nodemailer directly
        await emailService.emailTransporter.sendMail({
          from: process.env.SMTP_USER,
          to: doc.assignedEmail,
          subject: subject,
          text: textContent,
          html: htmlContent
        });
        
        logger.info(`Email notification sent to assigned email: ${doc.assignedEmail} for new reservation ${doc._id}`);
      } else {
        logger.warn(`Email service not configured - notification not sent to: ${doc.assignedEmail} for reservation ${doc._id}`);
      }
    }
  } catch (error) {
    // Don't throw errors in post-save to avoid breaking the save operation
    logger.error('Error in Reservation post-save middleware:', error);
  }
});

/**
 * Pre-save middleware to track new documents
 */
ReservationSchema.pre('save', function(next) {
  if (this.isNew) {
    this._wasNew = true;
  }
  next();
});

// ====================================
// EXPORT WITH COMPREHENSIVE DOCUMENTATION
// ====================================

/**
 * Reservation Model Export
 * 
 * Enterprise-grade cubicle reservation management with comprehensive features:
 * 
 * Key Features:
 * - ✅ Complete reservation lifecycle management (active → checked-in → checked-out)
 * - ✅ Comprehensive user information embedding with validation
 * - ✅ Temporal analytics with check-in/check-out tracking
 * - ✅ Rich metadata system for equipment, accessibility, and notes
 * - ✅ Strategic indexing for optimal query performance
 * - ✅ Virtual fields for computed properties and analytics
 * - ✅ Instance methods for workflow management and business logic
 * - ✅ Static methods for analytics and reporting
 * - ✅ Middleware for data validation and business rules
 * - ✅ Production-ready with proper error handling and monitoring
 * 
 * Usage Examples:
 * 
 * @example
 * // Create new reservation
 * const reservation = new Reservation({
 *   cubicle: cubicleId,
 *   user: { uid: 'user123', email: 'user@example.com', displayName: 'John Doe' },
 *   date: new Date('2025-06-12'),
 *   metadata: { plannedDuration: 8, priority: 'normal' }
 * });
 * await reservation.save();
 * 
 * @example
 * // Manage reservation workflow
 * await reservation.checkIn();
 * // ... user works in cubicle ...
 * await reservation.checkOut();
 * 
 * @example
 * // Get user statistics
 * const userStats = await Reservation.getUserStatistics('user123', {
 *   startDate: new Date('2025-01-01'),
 *   endDate: new Date('2025-12-31')
 * });
 * 
 * @example
 * // Get daily utilization
 * const utilization = await Reservation.getDailyUtilization(
 *   new Date('2025-06-01'),
 *   new Date('2025-06-30')
 * );
 * 
 * @example
 * // Find active reservations for today
 * const todayReservations = await Reservation.findActiveForDate(new Date());
 */

/**
 * Get Day-of-Week Analytics
 * 
 * Calculates comprehensive analytics for a specific day of the week within a given month/year.
 * Uses MongoDB aggregation pipeline for efficient data processing and statistical calculations.
 * 
 * @param {String} dayName - Day name (Monday, Tuesday, etc.)
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @returns {Promise<Object>} Day-of-week analytics data
 * 
 * @example
 * const mondayAnalytics = await Reservation.getDayOfWeekAnalytics('Monday', 6, 2025);
 * // Returns: { dayName: 'Monday', totalReservations: 45, averageUtilization: 75, ... }
 */
ReservationSchema.statics.getDayOfWeekAnalytics = async function(dayName, month, year) {
  try {
    // Map day names to JavaScript day indices (0 = Sunday, 1 = Monday, etc.)
    const dayMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    const dayIndex = dayMap[dayName];
    if (dayIndex === undefined) {
      throw new Error(`Invalid day name: ${dayName}`);
    }
    
    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const pipeline = [
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          $expr: { $eq: [{ $dayOfWeek: '$date' }, dayIndex + 1] } // MongoDB uses 1-7 (Sunday = 1)
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          reservations: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user.email' },
          sections: { $push: '$cubicle.section' },
          avgDuration: { $avg: '$metadata.plannedDuration' }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          totalReservations: { $sum: '$reservations' },
          dailyReservations: { $push: '$reservations' },
          allUniqueUsers: { $addToSet: { $size: '$uniqueUsers' } },
          avgDailyReservations: { $avg: '$reservations' },
          peakDayReservations: { $max: '$reservations' },
          lowestDayReservations: { $min: '$reservations' },
          totalUniqueSections: { $addToSet: '$sections' }
        }
      }
    ];
    
    const result = await this.aggregate(pipeline).exec();
    
    if (!result || result.length === 0) {
      return {
        dayName,
        month,
        year,
        totalOccurrences: 0,
        totalReservations: 0,
        averageReservationsPerDay: 0,
        peakDayReservations: 0,
        lowestDayReservations: 0,
        totalUniqueUsers: 0,
        metadata: {
          analysisDate: new Date().toISOString(),
          dataSource: 'aggregation'
        }
      };
    }
    
    const data = result[0];
    
    return {
      dayName,
      month,
      year,
      totalOccurrences: data.totalDays,
      totalReservations: data.totalReservations,
      averageReservationsPerDay: Math.round(data.avgDailyReservations || 0),
      peakDayReservations: data.peakDayReservations || 0,
      lowestDayReservations: data.lowestDayReservations || 0,
      totalUniqueUsers: data.allUniqueUsers ? Math.max(...data.allUniqueUsers) : 0,
      consistency: data.totalDays > 1 ? {
        standardDeviation: calculateStandardDeviation(data.dailyReservations),
        variabilityScore: calculateVariabilityScore(data.dailyReservations)
      } : null,
      metadata: {
        analysisDate: new Date().toISOString(),
        dataSource: 'aggregation'
      }
    };
    
  } catch (error) {
    logger.error('Error in getDayOfWeekAnalytics:', error);
    throw new Error(`Failed to get day-of-week analytics: ${error.message}`);
  }
};

/**
 * Get All Days Comparison
 * 
 * Generates comparison analytics for all days of the week within a given month/year.
 * Provides insights into which days perform best and usage patterns across the week.
 * 
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year
 * @returns {Promise<Object>} All days comparison data
 * 
 * @example
 * const allDaysAnalytics = await Reservation.getAllDaysComparison(6, 2025);
 * // Returns: { month: 6, year: 2025, days: [...], insights: {...} }
 */
ReservationSchema.statics.getAllDaysComparison = async function(month, year) {
  try {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Get analytics for each day
    const daysAnalytics = await Promise.all(
      dayNames.map(async (dayName) => {
        const analytics = await this.getDayOfWeekAnalytics(dayName, month, year);
        return {
          dayName,
          ...analytics
        };
      })
    );
    
    // Calculate insights
    const validDays = daysAnalytics.filter(day => day.totalOccurrences > 0);
    
    if (validDays.length === 0) {
      return {
        month,
        year,
        days: daysAnalytics,
        insights: {
          message: 'No data available for comparison'
        }
      };
    }
    
    const bestDay = validDays.reduce((a, b) => 
      a.averageReservationsPerDay > b.averageReservationsPerDay ? a : b
    );
    
    const worstDay = validDays.reduce((a, b) => 
      a.averageReservationsPerDay < b.averageReservationsPerDay ? a : b
    );
    
    const mostConsistent = validDays.reduce((a, b) => {
      const aConsistency = a.consistency ? a.consistency.variabilityScore : Infinity;
      const bConsistency = b.consistency ? b.consistency.variabilityScore : Infinity;
      return aConsistency < bConsistency ? a : b;
    });
    
    const totalReservations = validDays.reduce((sum, day) => sum + day.totalReservations, 0);
    const avgAcrossAllDays = Math.round(
      validDays.reduce((sum, day) => sum + day.averageReservationsPerDay, 0) / validDays.length
    );
    
    return {
      month,
      year,
      days: daysAnalytics,
      insights: {
        bestPerformingDay: bestDay.dayName,
        worstPerformingDay: worstDay.dayName,
        mostConsistentDay: mostConsistent.dayName,
        totalReservationsInMonth: totalReservations,
        averageReservationsAcrossAllDays: avgAcrossAllDays,
        weekdaysVsWeekends: calculateWeekdayWeekendComparison(daysAnalytics)
      },
      metadata: {
        analysisDate: new Date().toISOString(),
        dataSource: 'aggregation',
        validDaysAnalyzed: validDays.length
      }
    };
    
  } catch (error) {
    logger.error('Error in getAllDaysComparison:', error);
    throw new Error(`Failed to get all days comparison: ${error.message}`);
  }
};

/**
 * Get Day-of-Week Trends
 * 
 * Analyzes trends for a specific day across multiple months to identify patterns,
 * seasonal variations, and growth/decline trends.
 * 
 * @param {String} dayName - Day name (Monday, Tuesday, etc.)
 * @param {Number} months - Number of months to analyze (default: 6)
 * @param {Date} endDate - End date for analysis (default: current date)
 * @returns {Promise<Object>} Day-of-week trends data
 * 
 * @example
 * const mondayTrends = await Reservation.getDayOfWeekTrends('Monday', 6);
 * // Returns: { dayName: 'Monday', trends: [...], insights: {...} }
 */
ReservationSchema.statics.getDayOfWeekTrends = async function(dayName, months = 6, endDate = new Date()) {
  try {
    const trends = [];
    const currentDate = new Date(endDate);
    
    // Analyze each month going backwards
    for (let i = 0; i < months; i++) {
      const monthToAnalyze = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = monthToAnalyze.getMonth() + 1;
      const year = monthToAnalyze.getFullYear();
      
      const monthAnalytics = await this.getDayOfWeekAnalytics(dayName, month, year);
      
      trends.unshift({
        month,
        year,
        monthName: monthToAnalyze.toLocaleDateString('en-US', { month: 'long' }),
        ...monthAnalytics
      });
    }
    
    // Calculate trend insights
    const validTrends = trends.filter(trend => trend.totalOccurrences > 0);
    
    if (validTrends.length < 2) {
      return {
        dayName,
        trends,
        insights: {
          message: 'Insufficient data for trend analysis',
          trendDirection: 'unknown'
        }
      };
    }
    
    // Calculate trend direction
    const firstHalf = validTrends.slice(0, Math.floor(validTrends.length / 2));
    const secondHalf = validTrends.slice(Math.floor(validTrends.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, t) => sum + t.averageReservationsPerDay, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, t) => sum + t.averageReservationsPerDay, 0) / secondHalf.length;
    
    const trendPercentage = firstHalfAvg > 0 ? 
      Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) : 0;
    
    let trendDirection = 'stable';
    if (trendPercentage > 10) trendDirection = 'increasing';
    else if (trendPercentage < -10) trendDirection = 'decreasing';
    
    const peakMonth = validTrends.reduce((a, b) => 
      a.averageReservationsPerDay > b.averageReservationsPerDay ? a : b
    );
    
    const lowestMonth = validTrends.reduce((a, b) => 
      a.averageReservationsPerDay < b.averageReservationsPerDay ? a : b
    );
    
    return {
      dayName,
      trends,
      insights: {
        trendDirection,
        trendPercentage,
        peakMonth: `${peakMonth.monthName} ${peakMonth.year}`,
        lowestMonth: `${lowestMonth.monthName} ${lowestMonth.year}`,
        averageGrowthRate: trendPercentage / months,
        seasonalPattern: detectSeasonalPattern(validTrends),
        consistency: calculateTrendsConsistency(validTrends)
      },
      metadata: {
        analysisDate: new Date().toISOString(),
        dataSource: 'aggregation',
        monthsAnalyzed: validTrends.length
      }
    };
    
  } catch (error) {
    logger.error('Error in getDayOfWeekTrends:', error);
    throw new Error(`Failed to get day-of-week trends: ${error.message}`);
  }
};

// ================================================================================
// HELPER FUNCTIONS FOR DAY-OF-WEEK ANALYTICS
// ================================================================================

/**
 * Calculate standard deviation for a set of values
 * @param {Array} values - Array of numbers
 * @returns {Number} Standard deviation
 */
function calculateStandardDeviation(values) {
  if (!values || values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  
  return Math.round(Math.sqrt(avgSquaredDiff) * 100) / 100;
}

/**
 * Calculate variability score (coefficient of variation)
 * @param {Array} values - Array of numbers
 * @returns {Number} Variability score
 */
function calculateVariabilityScore(values) {
  if (!values || values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  if (mean === 0) return 0;
  
  const stdDev = calculateStandardDeviation(values);
  return Math.round((stdDev / mean) * 100);
}

/**
 * Calculate weekdays vs weekends comparison
 * @param {Array} daysAnalytics - Analytics for all days
 * @returns {Object} Weekdays vs weekends comparison
 */
function calculateWeekdayWeekendComparison(daysAnalytics) {
  const weekdays = daysAnalytics.filter(day => 
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day.dayName)
  );
  
  const weekends = daysAnalytics.filter(day => 
    ['Saturday', 'Sunday'].includes(day.dayName)
  );
  
  const weekdayAvg = weekdays.length > 0 ? 
    Math.round(weekdays.reduce((sum, day) => sum + day.averageReservationsPerDay, 0) / weekdays.length) : 0;
  
  const weekendAvg = weekends.length > 0 ? 
    Math.round(weekends.reduce((sum, day) => sum + day.averageReservationsPerDay, 0) / weekends.length) : 0;
  
  return {
    weekdayAverage: weekdayAvg,
    weekendAverage: weekendAvg,
    difference: weekdayAvg - weekendAvg,
    weekdaysDominant: weekdayAvg > weekendAvg
  };
}

/**
 * Detect seasonal patterns in trends data
 * @param {Array} trends - Trends data
 * @returns {String} Seasonal pattern description
 */
function detectSeasonalPattern(trends) {
  if (trends.length < 4) return 'insufficient data';
  
  // Simple seasonal detection based on month numbers
  const monthlyAvgs = {};
  
  trends.forEach(trend => {
    const month = trend.month;
    if (!monthlyAvgs[month]) {
      monthlyAvgs[month] = [];
    }
    monthlyAvgs[month].push(trend.averageReservationsPerDay);
  });
  
  // Calculate average for each month
  const monthlyAverages = Object.entries(monthlyAvgs).map(([month, values]) => ({
    month: parseInt(month),
    average: values.reduce((sum, val) => sum + val, 0) / values.length
  }));
  
  if (monthlyAverages.length < 3) return 'no clear pattern';
  
  monthlyAverages.sort((a, b) => a.average - b.average);
  
  const lowestMonths = monthlyAverages.slice(0, Math.ceil(monthlyAverages.length / 3))
    .map(m => m.month);
  const highestMonths = monthlyAverages.slice(-Math.ceil(monthlyAverages.length / 3))
    .map(m => m.month);
  
  // Check for winter (Dec, Jan, Feb) vs summer (Jun, Jul, Aug) patterns
  const winterMonths = [12, 1, 2];
  const summerMonths = [6, 7, 8];
  
  const winterLow = winterMonths.some(m => lowestMonths.includes(m));
  const summerHigh = summerMonths.some(m => highestMonths.includes(m));
  
  if (winterLow && summerHigh) return 'summer peak, winter low';
  if (!winterLow && !summerHigh) return 'winter peak, summer low';
  
  return 'no clear seasonal pattern';
}

/**
 * Calculate consistency score for trends
 * @param {Array} trends - Trends data
 * @returns {Object} Consistency metrics
 */
function calculateTrendsConsistency(trends) {
  const values = trends.map(t => t.averageReservationsPerDay);
  const stdDev = calculateStandardDeviation(values);
  const variability = calculateVariabilityScore(values);
  
  let consistencyRating = 'high';
  if (variability > 30) consistencyRating = 'low';
  else if (variability > 15) consistencyRating = 'moderate';
  
  return {
    standardDeviation: stdDev,
    variabilityScore: variability,
    consistencyRating
  };
}

module.exports = mongoose.model('Reservation', ReservationSchema);
