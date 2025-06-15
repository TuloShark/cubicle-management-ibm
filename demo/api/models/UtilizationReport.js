/**
 * @fileoverview UtilizationReport Model
 * 
 * Enterprise-grade utilization report management for the IBM Space Optimization application.
 * Provides comprehensive analytics data storage with proper validation, indexing, and audit trails
 * for business intelligence, reporting, and performance monitoring capabilities.
 * 
 * @author IBM Space Optimization Team
 * @version 2.1.0
 * @since 1.0.0
 */

const mongoose = require('mongoose');

/**
 * UtilizationReport Schema
 * 
 * Comprehensive analytics data model for office space utilization reporting.
 * Stores pre-computed metrics, daily breakdowns, section analysis, user activity,
 * and advanced analytics with enterprise-grade features and validation.
 * 
 * @typedef {Object} UtilizationReport
 * @property {Date} reportStartDate - Start date of the reporting period
 * @property {Date} reportEndDate - End date of the reporting period  
 * @property {Date} generatedAt - Timestamp when the report was generated
 * @property {Object} summary - Summary statistics for the reporting period
 * @property {Array<Object>} daily - Daily breakdown data with utilization metrics
 * @property {Array<Object>} sections - Section-wise analysis and statistics
 * @property {Array<Object>} users - User activity and engagement metrics
 * @property {Object} advanced - Advanced analytics and trend analysis
 * @property {Object} metadata - Report metadata and audit information
 * @property {Date} createdAt - Automatic creation timestamp
 * @property {Date} updatedAt - Automatic update timestamp
 */

/**
 * UtilizationReport Schema Definition
 * 
 * Enterprise-grade schema for storing comprehensive utilization analytics
 * with proper validation, indexing, and business logic enforcement.
 */
const utilizationReportSchema = new mongoose.Schema({
  /**
   * Report Start Date
   * 
   * The beginning date of the reporting period.
   * Normalized to start of day for consistency.
   * 
   * @type {Date}
   * @required
   * @index Primary index for date-range queries
   */
  reportStartDate: { 
    type: Date, 
    required: [true, 'Report start date is required'],
    index: true,
    validate: {
      validator: function(date) {
        // Ensure report start date is not in the future
        return date <= new Date();
      },
      message: 'Report start date cannot be in the future'
    }
  },

  /**
   * Report End Date
   * 
   * The ending date of the reporting period.
   * Must be greater than or equal to start date.
   * 
   * @type {Date}
   * @required
   * @index Secondary index for date-range queries
   */
  reportEndDate: { 
    type: Date, 
    required: [true, 'Report end date is required'],
    index: true,
    validate: {
      validator: function(date) {
        // Ensure end date is not before start date
        if (this.reportStartDate && date < this.reportStartDate) {
          return false;
        }
        return date <= new Date();
      },
      message: 'Report end date must be after start date and not in the future'
    }
  },

  /**
   * Generation Timestamp
   * 
   * When this report was generated or last updated.
   * Used for cache invalidation and freshness tracking.
   * 
   * @type {Date}
   * @default Date.now
   * @index For chronological sorting and cleanup
   */
  generatedAt: { 
    type: Date, 
    default: Date.now,
    index: true,
    required: [true, 'Generation timestamp is required']
  },
  /**
   * Summary Statistics
   * 
   * High-level metrics and KPIs for the reporting period.
   * All percentage values are validated to be within 0-100 range.
   * 
   * @type {Object}
   */
  summary: {
    /**
     * Total number of cubicles in the system
     * @type {Number}
     * @min 0
     * @default 0
     */
    totalCubicles: { 
      type: Number, 
      default: 0,
      min: [0, 'Total cubicles cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Total cubicles must be an integer'
      }
    },

    /**
     * Average utilization percentage across the reporting period
     * @type {Number}
     * @min 0
     * @max 100
     * @default 0
     */
    avgUtilization: { 
      type: Number, 
      default: 0,
      min: [0, 'Average utilization cannot be negative'],
      max: [100, 'Average utilization cannot exceed 100%'],
      validate: {
        validator: function(value) {
          return Number.isFinite(value);
        },
        message: 'Average utilization must be a valid number'
      }
    },

    /**
     * Peak utilization percentage during the reporting period
     * @type {Number}
     * @min 0
     * @max 100
     * @default 0
     */
    peakUtilization: { 
      type: Number, 
      default: 0,
      min: [0, 'Peak utilization cannot be negative'],
      max: [100, 'Peak utilization cannot exceed 100%']
    },

    /**
     * Lowest utilization percentage during the reporting period
     * @type {Number}
     * @min 0
     * @max 100
     * @default 0
     */
    lowestUtilization: { 
      type: Number, 
      default: 0,
      min: [0, 'Lowest utilization cannot be negative'],
      max: [100, 'Lowest utilization cannot exceed 100%']
    },

    /**
     * Total number of reservations made during the period
     * @type {Number}
     * @min 0
     * @default 0
     */
    totalReservations: { 
      type: Number, 
      default: 0,
      min: [0, 'Total reservations cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Total reservations must be an integer'
      }
    },

    /**
     * Number of unique users who made reservations
     * @type {Number}
     * @min 0
     * @default 0
     */
    uniqueUsers: { 
      type: Number, 
      default: 0,
      min: [0, 'Unique users cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Unique users must be an integer'
      }
    },

    /**
     * Number of error incidents (cubicles in error state)
     * @type {Number}
     * @min 0
     * @default 0
     */
    errorIncidents: { 
      type: Number, 
      default: 0,
      min: [0, 'Error incidents cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Error incidents must be an integer'
      }
    }
  },
  /**
   * Daily Breakdown Data
   * 
   * Day-by-day analysis of utilization metrics.
   * Each entry represents one day within the reporting period.
   * 
   * @type {Array<Object>}
   */
  daily: [{
    /**
     * Date for this daily entry
     * @type {Date}
     * @required
     * @index For daily lookups and sorting
     */
    date: { 
      type: Date, 
      required: [true, 'Daily entry date is required'],
      index: true
    },

    /**
     * Day of the week (e.g., "Monday", "Tuesday")
     * @type {String}
     * @required
     * @enum {String} Valid day names
     */
    dayOfWeek: { 
      type: String, 
      required: [true, 'Day of week is required'],
      enum: {
        values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        message: 'Invalid day of week'
      },
      trim: true
    },

    /**
     * Number of reserved cubicles on this day
     * @type {Number}
     * @min 0
     * @default 0
     */
    reserved: { 
      type: Number, 
      default: 0,
      min: [0, 'Reserved count cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Reserved count must be an integer'
      }
    },

    /**
     * Number of available cubicles on this day
     * @type {Number}
     * @min 0
     * @default 0
     */
    available: { 
      type: Number, 
      default: 0,
      min: [0, 'Available count cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Available count must be an integer'
      }
    },

    /**
     * Number of cubicles in error state on this day
     * @type {Number}
     * @min 0
     * @default 0
     */
    error: { 
      type: Number, 
      default: 0,
      min: [0, 'Error count cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Error count must be an integer'
      }
    },

    /**
     * Utilization percentage for this day
     * @type {Number}
     * @min 0
     * @max 100
     * @default 0
     */
    utilizationPercent: { 
      type: Number, 
      default: 0,
      min: [0, 'Utilization percentage cannot be negative'],
      max: [100, 'Utilization percentage cannot exceed 100%']
    },

    /**
     * Total number of reservations made on this day
     * @type {Number}
     * @min 0
     * @default 0
     */
    reservations: { 
      type: Number, 
      default: 0,
      min: [0, 'Reservations count cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Reservations count must be an integer'
      }
    },

    /**
     * Number of unique active users on this day
     * @type {Number}
     * @min 0
     * @default 0
     */
    activeUsers: { 
      type: Number, 
      default: 0,
      min: [0, 'Active users count cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Active users count must be an integer'
      }
    }
  }],
  /**
   * Section Analysis Data
   * 
   * Analytics broken down by office sections (A, B, C, etc.).
   * Provides insights into space utilization patterns by physical area.
   * 
   * @type {Array<Object>}
   */
  sections: [{
    /**
     * Section identifier (e.g., "A", "B", "C")
     * @type {String}
     * @required
     * @enum {String} Valid section identifiers
     */
    section: { 
      type: String, 
      required: [true, 'Section identifier is required'],
      enum: {
        values: ['A', 'B', 'C', 'D', 'E', 'F'],
        message: 'Invalid section identifier'
      },
      uppercase: true,
      trim: true,
      index: true
    },

    /**
     * Total number of cubicles in this section
     * @type {Number}
     * @min 0
     * @default 0
     */
    totalCubicles: { 
      type: Number, 
      default: 0,
      min: [0, 'Total cubicles cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Total cubicles must be an integer'
      }
    },

    /**
     * Average utilization percentage for this section
     * @type {Number}
     * @min 0
     * @max 100
     * @default 0
     */
    avgUtilization: { 
      type: Number, 
      default: 0,
      min: [0, 'Average utilization cannot be negative'],
      max: [100, 'Average utilization cannot exceed 100%']
    },

    /**
     * Peak utilization percentage for this section
     * @type {Number}
     * @min 0
     * @max 100
     * @default 0
     */
    peakUtilization: { 
      type: Number, 
      default: 0,
      min: [0, 'Peak utilization cannot be negative'],
      max: [100, 'Peak utilization cannot exceed 100%']
    },

    /**
     * Total reservations made in this section
     * @type {Number}
     * @min 0
     * @default 0
     */
    totalReservations: { 
      type: Number, 
      default: 0,
      min: [0, 'Total reservations cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Total reservations must be an integer'
      }
    },

    /**
     * Number of error incidents in this section
     * @type {Number}  
     * @min 0
     * @default 0
     */
    errorIncidents: { 
      type: Number, 
      default: 0,
      min: [0, 'Error incidents cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Error incidents must be an integer'
      }
    }
  }],
  /**
   * User Activity Analysis
   * 
   * Individual user engagement and utilization patterns during the reporting period.
   * Includes reservation counts, activity levels, and behavioral analytics.
   * 
   * @type {Array<Object>}
   */
  users: [{
    /**
     * User email address (primary identifier)
     * @type {String}
     * @required
     * @format email
     * @index For user-based queries
     */
    email: { 
      type: String, 
      required: [true, 'User email is required'],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
      index: true
    },

    /**
     * User display name for UI presentation
     * @type {String}
     * @optional
     * @maxlength 100
     */
    displayName: { 
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters']
    },

    /**
     * Total number of reservations made by this user
     * @type {Number}
     * @min 0
     * @default 0
     */
    totalReservations: { 
      type: Number, 
      default: 0,
      min: [0, 'Total reservations cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Total reservations must be an integer'
      }
    },

    /**
     * Number of unique days this user was active
     * @type {Number}
     * @min 0
     * @default 0
     */
    daysActive: { 
      type: Number, 
      default: 0,
      min: [0, 'Days active cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Days active must be an integer'
      }
    },

    /**
     * User's most frequently used section
     * @type {String}
     * @optional
     * @enum {String} Valid section identifiers
     */
    favoriteSection: { 
      type: String,
      enum: {
        values: ['A', 'B', 'C', 'D', 'E', 'F'],
        message: 'Invalid favorite section'
      },
      uppercase: true,
      trim: true
    },

    /**
     * Average number of reservations per active day
     * @type {Number}
     * @min 0
     * @default 0
     */
    avgDailyReservations: { 
      type: Number, 
      default: 0,
      min: [0, 'Average daily reservations cannot be negative'],
      validate: {
        validator: function(value) {
          return Number.isFinite(value);
        },
        message: 'Average daily reservations must be a valid number'
      }
    },

    /**
     * Compressed sequence of cubicle codes used (e.g., "A1-A5, B3, C7-C9")
     * @type {String}
     * @default empty string
     * @maxlength 500
     */
    cubicleSequence: { 
      type: String, 
      default: '',
      trim: true,
      maxlength: [500, 'Cubicle sequence cannot exceed 500 characters'],
      validate: {
        validator: function(sequence) {
          // Allow empty string or validate cubicle sequence format
          if (!sequence) return true;
          return /^[A-F]\d+(-[A-F]\d+)?(,\s*[A-F]\d+(-[A-F]\d+)?)*$/i.test(sequence);
        },
        message: 'Invalid cubicle sequence format'
      }
    }
  }],
  /**
   * Advanced Analytics Data
   * 
   * Sophisticated analytics including peak hours, trend analysis, and efficiency metrics.
   * Used for business intelligence and predictive insights.
   * 
   * @type {Object}
   */
  advanced: {
    /**
     * Peak usage hours with utilization percentages
     * @type {Array<Object>}
     */
    peakHours: [{ 
      /**
       * Hour of the day (0-23)
       * @type {Number}  
       * @min 0
       * @max 23
       */
      hour: { 
        type: Number,
        min: [0, 'Hour must be between 0 and 23'],
        max: [23, 'Hour must be between 0 and 23'],
        validate: {
          validator: Number.isInteger,
          message: 'Hour must be an integer'
        }
      },

      /**
       * Utilization percentage for this hour
       * @type {Number}
       * @min 0
       * @max 100
       */
      utilizationPercent: { 
        type: Number,
        min: [0, 'Utilization percentage cannot be negative'],
        max: [100, 'Utilization percentage cannot exceed 100%']
      }
    }],

    /**
     * Trend analysis and predictive insights
     * @type {Object}
     */
    trendAnalysis: {
      /**
       * Week-over-week change percentage
       * @type {Number}
       * @default 0
       */
      weekOverWeekChange: { 
        type: Number, 
        default: 0,
        validate: {
          validator: function(value) {
            return Number.isFinite(value);
          },
          message: 'Week over week change must be a valid number'
        }
      },

      /**
       * Overall utilization trend direction
       * @type {String}
       * @enum {String} Trend directions
       * @default 'stable'
       */
      utilizationTrend: { 
        type: String, 
        enum: {
          values: ['increasing', 'decreasing', 'stable'],
          message: 'Invalid utilization trend'
        },
        default: 'stable',
        lowercase: true,
        trim: true
      },

      /**
       * Predicted utilization for next reporting period
       * @type {Number}
       * @min 0
       * @max 100
       * @default 0
       */
      predictedNextWeek: { 
        type: Number, 
        default: 0,
        min: [0, 'Predicted utilization cannot be negative'],
        max: [100, 'Predicted utilization cannot exceed 100%']
      }
    },

    /**
     * Efficiency and performance metrics
     * @type {Object}
     */
    efficiency: {
      /**
       * Space turnover ratio (cubicles per reservation)
       * @type {Number}
       * @min 0
       * @default 0
       */
      spaceTurnover: { 
        type: Number, 
        default: 0,
        min: [0, 'Space turnover cannot be negative'],
        validate: {
          validator: function(value) {
            return Number.isFinite(value);
          },
          message: 'Space turnover must be a valid number'
        }
      },

      /**
       * Average session duration in hours
       * @type {Number}
       * @min 0
       * @max 24
       * @default 0
       */
      averageSessionDuration: { 
        type: Number, 
        default: 0,
        min: [0, 'Average session duration cannot be negative'],
        max: [24, 'Average session duration cannot exceed 24 hours']
      },

      /**
       * Overall utilization efficiency percentage
       * @type {Number}
       * @min 0
       * @max 100
       * @default 0
       */
      utilizationEfficiency: { 
        type: Number, 
        default: 0,
        min: [0, 'Utilization efficiency cannot be negative'],
        max: [100, 'Utilization efficiency cannot exceed 100%']
      }
    }
  },

  /**
   * Report Metadata and Audit Information
   * 
   * Additional context about report generation, versioning, and audit trail.
   * Used for tracking, debugging, and compliance purposes.
   * 
   * @type {Object}
   */
  metadata: {
    /**
     * Report generation method/source
     * @type {String}
     * @enum {String} Generation sources
     * @default 'manual'
     */
    generationSource: {
      type: String,
      enum: {
        values: ['manual', 'scheduled', 'api', 'admin', 'system'],
        message: 'Invalid generation source'
      },
      default: 'manual',
      lowercase: true,
      trim: true
    },

    /**
     * User who generated the report
     * @type {Object}
     * @optional
     */
    generatedBy: {
      /**
       * User unique identifier
       * @type {String}
       * @optional
       */
      uid: {
        type: String,
        trim: true,
        maxlength: [255, 'User UID cannot exceed 255 characters']
      },

      /**
       * User email address
       * @type {String}
       * @optional
       * @format email
       */
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
      }
    },

    /**
     * Report version for tracking changes
     * @type {Number}
     * @min 1
     * @default 1
     */
    version: {
      type: Number,
      default: 1,
      min: [1, 'Version must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Version must be an integer'
      }
    },

    /**
     * Data sources used for report generation
     * @type {Array<String>}
     * @default ['reservations', 'cubicles']
     */
    dataSources: {
      type: [String],
      default: ['reservations', 'cubicles'],
      validate: {
        validator: function(sources) {
          const validSources = ['reservations', 'cubicles', 'users', 'notifications'];
          return sources.every(source => validSources.includes(source));
        },
        message: 'Invalid data source specified'
      }
    },

    /**
     * Processing time in milliseconds
     * @type {Number}
     * @min 0
     * @optional
     */
    processTimeMs: {
      type: Number,
      min: [0, 'Processing time cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Processing time must be an integer'
      }
    }
  }
}, {
  // Schema Options for Production Optimization
  timestamps: true, // Adds createdAt and updatedAt automatically
  collection: 'utilizationreports', // Explicit collection name
  
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
 * - Date range queries for report retrieval
 * - Chronological sorting by generation time
 * - User-based analytics lookups
 * - Section-based performance analysis
 */

// Primary compound index for date range queries
utilizationReportSchema.index({ 
  reportStartDate: 1, 
  reportEndDate: 1 
}, {
  name: 'date_range_reports',
  background: true
});

// Chronological sorting and cleanup queries
utilizationReportSchema.index({ 
  generatedAt: -1 
}, {
  name: 'generation_chronological',
  background: true
});

// User email lookups in user analytics
utilizationReportSchema.index({ 
  'users.email': 1 
}, {
  name: 'user_email_analytics',
  background: true,
  sparse: true
});

// Section-based analysis queries  
utilizationReportSchema.index({ 
  'sections.section': 1,
  'sections.avgUtilization': -1
}, {
  name: 'section_utilization_analysis',
  background: true
});

// Utilization performance queries
utilizationReportSchema.index({ 
  'summary.avgUtilization': -1,
  generatedAt: -1
}, {
  name: 'utilization_performance',
  background: true
});

// Daily date lookups for specific day analysis
utilizationReportSchema.index({ 
  'daily.date': 1,
  'daily.utilizationPercent': -1
}, {
  name: 'daily_utilization_analysis',
  background: true
});

// TTL index for automatic cleanup of old reports (180 days)
utilizationReportSchema.index({ 
  generatedAt: 1 
}, {
  name: 'ttl_cleanup',
  expireAfterSeconds: 15552000, // 180 days in seconds
  background: true
});

// ====================================
// MIDDLEWARE FOR BUSINESS LOGIC
// ====================================

/**
 * Pre-save Middleware
 * 
 * Executes business logic before saving utilization reports.
 * Handles data validation, normalization, and automatic field population.
 */
utilizationReportSchema.pre('save', async function(next) {
  try {
    // Normalize dates to proper boundaries
    if (this.reportStartDate) {
      const startDate = new Date(this.reportStartDate);
      startDate.setHours(0, 0, 0, 0);
      this.reportStartDate = startDate;
    }
    
    if (this.reportEndDate) {
      const endDate = new Date(this.reportEndDate);
      endDate.setHours(23, 59, 59, 999);
      this.reportEndDate = endDate;
    }
    
    // Initialize metadata if not present
    if (!this.metadata) {
      this.metadata = {
        generationSource: 'manual',
        version: 1,
        dataSources: ['reservations', 'cubicles']
      };
    }
    
    // Increment version for updates
    if (!this.isNew) {
      this.metadata.version = (this.metadata.version || 1) + 1;
    }
    
    // Validate data consistency
    if (this.summary) {
      // Ensure peak utilization is >= average utilization
      if (this.summary.peakUtilization < this.summary.avgUtilization) {
        this.summary.peakUtilization = this.summary.avgUtilization;
      }
      
      // Ensure lowest utilization is <= average utilization
      if (this.summary.lowestUtilization > this.summary.avgUtilization) {
        this.summary.lowestUtilization = this.summary.avgUtilization;
      }
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
utilizationReportSchema.pre('validate', function(next) {
  try {
    // Validate date range consistency
    if (this.reportStartDate && this.reportEndDate && this.reportEndDate < this.reportStartDate) {
      throw new Error('Report end date must be after start date');
    }
    
    // Validate utilization percentages are consistent
    if (this.summary) {
      const { avgUtilization, peakUtilization, lowestUtilization } = this.summary;
      
      if (peakUtilization < avgUtilization) {
        throw new Error('Peak utilization cannot be less than average utilization');
      }
      
      if (lowestUtilization > avgUtilization) {
        throw new Error('Lowest utilization cannot be greater than average utilization');
      }
    }
    
    // Validate daily data consistency
    if (this.daily && this.daily.length > 0) {
      for (const day of this.daily) {
        const total = day.reserved + day.available + day.error;
        if (total > 0) {
          const calculatedUtilization = Math.round((day.reserved / (day.reserved + day.available)) * 100);
          // Allow small rounding differences
          if (Math.abs(day.utilizationPercent - calculatedUtilization) > 2) {
            console.warn(`Utilization calculation mismatch for ${day.date}: expected ${calculatedUtilization}%, got ${day.utilizationPercent}%`);
          }
        }
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
 * Handles logging and performance monitoring.
 */
utilizationReportSchema.post('save', async function(doc) {
  try {
    // Log report generation for monitoring
    console.log(`Utilization report saved: ${doc._id}`, {
      reportPeriod: `${doc.reportStartDate.toISOString().split('T')[0]} to ${doc.reportEndDate.toISOString().split('T')[0]}`,
      avgUtilization: doc.summary?.avgUtilization || 0,
      totalReservations: doc.summary?.totalReservations || 0,
      version: doc.metadata?.version || 1,
      processingTime: doc.metadata?.processTimeMs || 'unknown'
    });
    
    // Performance monitoring for large reports
    if (doc.users && doc.users.length > 100) {
      console.warn(`Large user dataset in report: ${doc.users.length} users`, {
        reportId: doc._id,
        userCount: doc.users.length
      });
    }
  } catch (error) {
    // Don't throw errors in post-save to avoid breaking the save operation
    console.error('Error in UtilizationReport post-save middleware:', error);
  }
});

// ====================================
// EXPORT WITH COMPREHENSIVE DOCUMENTATION
// ====================================

/**
 * UtilizationReport Model Export
 * 
 * Enterprise-grade utilization report storage with comprehensive features:
 * 
 * Key Features:
 * - ✅ Comprehensive data validation with business rules
 * - ✅ Strategic indexing for optimal query performance
 * - ✅ Automatic data normalization and consistency checks
 * - ✅ TTL-based automatic cleanup of old reports
 * - ✅ Rich metadata for audit trails and versioning
 * - ✅ Middleware for business logic enforcement
 * - ✅ Production-ready with proper error handling
 * - ✅ Flexible schema supporting multiple analytics types
 * 
 * Usage Examples:
 * 
 * @example
 * // Create new utilization report
 * const report = new UtilizationReport({
 *   reportStartDate: new Date('2025-06-14'),
 *   reportEndDate: new Date('2025-06-14'),
 *   summary: { totalCubicles: 100, avgUtilization: 75 },
 *   metadata: { generationSource: 'api', generatedBy: { email: 'admin@company.com' } }
 * });
 * await report.save();
 * 
 * @example
 * // Query reports by date range
 * const reports = await UtilizationReport.find({
 *   reportStartDate: { $gte: startDate },
 *   reportEndDate: { $lte: endDate }
 * }).sort({ generatedAt: -1 });
 * 
 * @example
 * // Find reports with high utilization
 * const highUtilizationReports = await UtilizationReport.find({
 *   'summary.avgUtilization': { $gte: 80 }
 * });
 */
module.exports = mongoose.model('UtilizationReport', utilizationReportSchema);
