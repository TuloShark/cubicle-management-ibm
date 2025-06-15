/**
 * @fileoverview NotificationHistory Model
 * 
 * Enterprise-grade notification tracking model for the IBM Space Optimization application.
 * Provides comprehensive audit trail, statistics tracking, and notification lifecycle management
 * with proper validation, indexing, and enterprise security features.
 * 
 * @author IBM Space Optimization Team
 * @version 2.1.0
 * @since 1.0.0
 */

const mongoose = require('mongoose');

/**
 * NotificationHistory Schema
 * 
 * Comprehensive notification tracking model for audit compliance and system analytics.
 * Tracks all notification activities across email and Slack channels with full audit trail
 * capabilities and enterprise-grade security features.
 * 
 * @typedef {Object} NotificationHistory
 * @property {String} type - Notification channel type (email, slack, individual, bulk, system)
 * @property {String} status - Delivery status (success, error, warning, pending)
 * @property {String} message - Notification content or description
 * @property {Array<String>} recipients - List of notification recipients
 * @property {Object} data - Additional notification metadata
 * @property {String} error - Error message if notification failed
 * @property {Object} sentBy - Information about who sent the notification
 * @property {Date} timestamp - When the notification was sent
 * @property {Object} metadata - Rich tracking data for analytics and compliance
 */
const NotificationHistorySchema = new mongoose.Schema({
  /**
   * Notification Type
   * 
   * Specifies the channel or method used for notification delivery.
   * Supports email, Slack, individual, bulk, and system notifications.
   * 
   * @type {String}
   * @required
   * @enum {String} email - Email notifications
   * @enum {String} slack - Slack notifications  
   * @enum {String} individual - Single user notifications
   * @enum {String} bulk - Mass notifications
   * @enum {String} system - System-generated notifications
   */
  type: { 
    type: String, 
    required: [true, 'Notification type is required'],
    enum: {
      values: ['email', 'slack', 'individual', 'bulk', 'system'],
      message: 'Invalid notification type. Must be one of: email, slack, individual, bulk, system'
    },
    index: true
  },
  /**
   * Notification Status
   * 
   * Tracks the delivery status of the notification for monitoring and debugging.
   * Enables comprehensive tracking of notification success rates and failure analysis.
   * 
   * @type {String}
   * @required
   * @enum {String} success - Notification delivered successfully
   * @enum {String} error - Notification delivery failed
   * @enum {String} warning - Notification delivered with warnings
   * @enum {String} pending - Notification queued for delivery
   * @default pending
   */
  status: { 
    type: String, 
    required: [true, 'Notification status is required'],
    enum: {
      values: ['success', 'error', 'warning', 'pending'],
      message: 'Invalid status. Must be one of: success, error, warning, pending'
    },
    default: 'pending',
    index: true
  },

  /**
   * Notification Message
   * 
   * Contains the notification content or a description of what was sent.
   * Used for audit purposes and debugging notification issues.
   * 
   * @type {String}
   * @required
   * @validation Maximum length of 2000 characters
   */
  message: { 
    type: String, 
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },

  /**
   * Recipients List
   * 
   * Array of recipients who received or should receive the notification.
   * Can contain email addresses, user IDs, or other identifier formats.
   * 
   * @type {Array<String>}
   * @validation Each recipient must be a valid string
   */
  recipients: [{ 
    type: String,
    trim: true,
    maxlength: [255, 'Recipient identifier cannot exceed 255 characters']
  }],

  /**
   * Additional Data
   * 
   * Flexible storage for notification-specific metadata and context.
   * Structure varies based on notification type and requirements.
   * 
   * @type {Object}
   * @default Empty object
   */
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  /**
   * Error Information
   * 
   * Contains detailed error message if notification delivery failed.
   * Essential for debugging and monitoring notification system health.
   * 
   * @type {String}
   * @optional
   * @validation Maximum length of 1000 characters
   */
  error: {
    type: String,
    trim: true,
    maxlength: [1000, 'Error message cannot exceed 1000 characters']
  },
  /**
   * Sender Information
   * 
   * Tracks who initiated the notification for audit trail and accountability.
   * Contains user identification and display information for compliance.
   * 
   * @type {Object}
   * @property {String} uid - Firebase user ID (required for audit)
   * @property {String} email - User email address with validation
   * @property {String} displayName - User display name for UI purposes
   */
  sentBy: {
    uid: {
      type: String,
      required: [true, 'Sender UID is required for audit trail'],
      trim: true,
      maxlength: [128, 'UID cannot exceed 128 characters'],
      index: true
    },
    email: {
      type: String,
      required: [true, 'Sender email is required'],
      trim: true,
      lowercase: true,
      maxlength: [255, 'Email cannot exceed 255 characters'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters']
    }
  },

  /**
   * Timestamp
   * 
   * Records when the notification was sent or attempted.
   * Essential for chronological sorting and time-based analytics.
   * 
   * @type {Date}
   * @default Current timestamp
   * @index Optimized for time-based queries
   */
  timestamp: { 
    type: Date, 
    default: Date.now,
    required: [true, 'Timestamp is required'],
    index: true
  },
  /**
   * Rich Metadata
   * 
   * Comprehensive tracking data for business intelligence and compliance.
   * Stores contextual information about the notification for analytics.
   * 
   * @type {Object}
   * @property {Number} cubicleCount - Number of cubicles referenced
   * @property {Number} userCount - Number of users affected
   * @property {Number} utilizationRate - System utilization at time of notification
   * @property {String} reportId - Associated report identifier
   * @property {String} taskId - Associated task identifier
   * @property {Object} integrationData - External system integration data
   */
  metadata: {
    cubicleCount: {
      type: Number,
      min: [0, 'Cubicle count cannot be negative'],
      max: [10000, 'Cubicle count exceeds reasonable limit']
    },
    userCount: {
      type: Number,
      min: [0, 'User count cannot be negative'],
      max: [100000, 'User count exceeds reasonable limit']
    },
    utilizationRate: {
      type: Number,
      min: [0, 'Utilization rate cannot be negative'],
      max: [100, 'Utilization rate cannot exceed 100%']
    },
    reportId: {
      type: String,
      trim: true,
      maxlength: [50, 'Report ID cannot exceed 50 characters']
    },
    taskId: {
      type: String,
      trim: true,
      maxlength: [50, 'Task ID cannot exceed 50 characters']
    },
    integrationData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }
}, {
  // Schema Options
  timestamps: true, // Adds createdAt and updatedAt automatically
  collection: 'notificationhistories',
  
  // Performance Optimization
  bufferCommands: true,
  autoCreate: true,
  
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
 * - Time-based notification history
 * - User-specific activity tracking
 * - Type-based filtering and analytics
 * - Status-based monitoring and alerts
 */

// Primary time-based queries with type filtering
NotificationHistorySchema.index({ 
  timestamp: -1, 
  type: 1 
}, {
  name: 'timestamp_type_analytics',
  background: true
});

// User activity tracking and audit trail
NotificationHistorySchema.index({ 
  'sentBy.uid': 1, 
  timestamp: -1 
}, {
  name: 'user_activity_audit',
  background: true
});

// Status monitoring and error tracking
NotificationHistorySchema.index({ 
  status: 1, 
  timestamp: -1,
  type: 1
}, {
  name: 'status_monitoring',
  background: true
});

// Recipients-based queries for user notification history
NotificationHistorySchema.index({ 
  recipients: 1, 
  timestamp: -1 
}, {
  name: 'recipient_history',
  background: true,
  sparse: true // Only index documents with recipients
});

// Metadata-based analytics queries
NotificationHistorySchema.index({ 
  'metadata.reportId': 1, 
  timestamp: -1 
}, {
  name: 'report_notifications',
  background: true,
  partialFilterExpression: { 'metadata.reportId': { $exists: true, $ne: null } }
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
 * Get age of notification in hours
 * @returns {Number} Hours since notification was sent
 */
NotificationHistorySchema.virtual('ageInHours').get(function() {
  return Math.floor((new Date() - this.timestamp) / (1000 * 60 * 60));
});

/**
 * Check if notification is recent (within last 24 hours)
 * @returns {Boolean} True if notification is less than 24 hours old
 */
NotificationHistorySchema.virtual('isRecent').get(function() {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  return this.timestamp >= twentyFourHoursAgo;
});

/**
 * Get formatted timestamp for display
 * @returns {String} Human-readable timestamp
 */
NotificationHistorySchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
});

/**
 * Check if notification has error details
 * @returns {Boolean} True if notification failed with error details
 */
NotificationHistorySchema.virtual('hasError').get(function() {
  return this.status === 'error' && this.error && this.error.trim().length > 0;
});

/**
 * Get success indicator for UI
 * @returns {String} Success status for display purposes
 */
NotificationHistorySchema.virtual('successIndicator').get(function() {
  switch (this.status) {
    case 'success': return '✅ Success';
    case 'error': return '❌ Failed';
    case 'warning': return '⚠️ Warning';
    case 'pending': return '⏳ Pending';
    default: return '❓ Unknown';
  }
});

// ====================================
// MIDDLEWARE FOR BUSINESS LOGIC
// ====================================

/**
 * Pre-save Middleware
 * 
 * Automatically handles data transformation and validation before saving.
 * Ensures data consistency and business rule enforcement.
 */
NotificationHistorySchema.pre('save', function(next) {
  try {
    // Ensure recipients array has valid entries
    if (this.recipients && this.recipients.length > 0) {
      this.recipients = this.recipients.filter(recipient => 
        recipient && typeof recipient === 'string' && recipient.trim().length > 0
      );
    }

    // Auto-set error status if error field is populated
    if (this.error && this.error.trim().length > 0 && this.status === 'pending') {
      this.status = 'error';
    }

    // Validate that success status doesn't have error message
    if (this.status === 'success' && this.error) {
      this.error = undefined;
    }

    // Ensure timestamp is set for audit compliance
    if (!this.timestamp) {
      this.timestamp = new Date();
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-validate Middleware
 * 
 * Additional validation beyond schema constraints.
 * Implements business rules and cross-field validation.
 */
NotificationHistorySchema.pre('validate', function(next) {
  try {
    // Validate that error notifications have error details
    if (this.status === 'error' && (!this.error || this.error.trim().length === 0)) {
      this.invalidate('error', 'Error status requires error message details');
    }

    // Validate recipients array has reasonable size
    if (this.recipients && this.recipients.length > 10000) {
      this.invalidate('recipients', 'Recipients list cannot exceed 10,000 entries');
    }

    // Validate sender information completeness
    if (this.sentBy && this.sentBy.uid && !this.sentBy.email) {
      this.invalidate('sentBy.email', 'Sender email is required when UID is provided');
    }

    // Validate timestamp is not in the future
    if (this.timestamp && this.timestamp > new Date()) {
      this.invalidate('timestamp', 'Timestamp cannot be in the future');
    }

    next();
  } catch (error) {
    next(error);
  }
});

// ====================================
// STATIC METHODS
// ====================================

/**
 * Static Methods for Queries and Analytics
 * 
 * Provides convenient methods for common notification history operations
 * and analytics with proper error handling and performance optimization.
 */

/**
 * Get notification statistics for a time period
 * @param {Date} startDate - Start of the period
 * @param {Date} endDate - End of the period
 * @returns {Object} Statistics summary
 */
NotificationHistorySchema.statics.getStatistics = async function(startDate, endDate) {
  try {
    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const [totalCount, successCount, errorCount, typeBreakdown] = await Promise.all([
      this.countDocuments(filter),
      this.countDocuments({ ...filter, status: 'success' }),
      this.countDocuments({ ...filter, status: 'error' }),
      this.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    return {
      total: totalCount,
      successful: successCount,
      failed: errorCount,
      successRate: totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : 0,
      typeBreakdown
    };
  } catch (error) {
    throw new Error(`Failed to get notification statistics: ${error.message}`);
  }
};

/**
 * Get recent notifications for a user
 * @param {String} userUid - User UID to search for
 * @param {Number} limit - Maximum number of results (default: 50)
 * @returns {Array} Recent notifications sent by the user
 */
NotificationHistorySchema.statics.getRecentByUser = async function(userUid, limit = 50) {
  try {
    return await this.find({ 'sentBy.uid': userUid })
      .sort({ timestamp: -1 })
      .limit(Math.min(limit, 100)) // Cap at 100 for performance
      .lean();
  } catch (error) {
    throw new Error(`Failed to get user notifications: ${error.message}`);
  }
};

/**
 * Clean up old notifications based on retention policy
 * @param {Number} retentionDays - Number of days to retain (default: 90)
 * @returns {Object} Cleanup results
 */
NotificationHistorySchema.statics.cleanup = async function(retentionDays = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.deleteMany({
      timestamp: { $lt: cutoffDate },
      status: { $in: ['success', 'error'] } // Keep pending/warning for debugging
    });

    return {
      deletedCount: result.deletedCount,
      cutoffDate: cutoffDate.toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to cleanup old notifications: ${error.message}`);
  }
};

// ====================================
// INSTANCE METHODS
// ====================================

/**
 * Instance Methods for Individual Operations
 * 
 * Provides methods for working with individual notification history records
 * with proper validation and error handling.
 */

/**
 * Mark notification as successful
 * @returns {Promise<NotificationHistory>} Updated notification record
 */
NotificationHistorySchema.methods.markAsSuccess = function() {
  this.status = 'success';
  this.error = undefined;
  return this.save();
};

/**
 * Mark notification as failed with error details
 * @param {String} errorMessage - Error description
 * @returns {Promise<NotificationHistory>} Updated notification record
 */
NotificationHistorySchema.methods.markAsError = function(errorMessage) {
  this.status = 'error';
  this.error = errorMessage;
  return this.save();
};

/**
 * Add recipient to the notification
 * @param {String} recipient - Recipient identifier to add
 * @returns {Promise<NotificationHistory>} Updated notification record
 */
NotificationHistorySchema.methods.addRecipient = function(recipient) {
  if (!this.recipients.includes(recipient)) {
    this.recipients.push(recipient);
  }
  return this.save();
};

/**
 * Get notification summary for logging
 * @returns {Object} Summary object for logging purposes
 */
NotificationHistorySchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type,
    status: this.status,
    recipientCount: this.recipients.length,
    timestamp: this.timestamp,
    hasError: this.hasError,
    ageInHours: this.ageInHours
  };
};

module.exports = mongoose.model('NotificationHistory', NotificationHistorySchema);
