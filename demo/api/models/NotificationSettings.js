/**
 * @fileoverview NotificationSettings Model
 * 
 * Enterprise-grade user notification preference management for the IBM Space Optimization application.
 * Stores and manages user notification settings across multiple channels (email, Slack) with proper
 * validation, audit trail, and enterprise security features.
 * 
 * @author IBM Space Optimization Team
 * @version 2.1.0
 * @since 1.0.0
 */

const mongoose = require('mongoose');

/**
 * NotificationSettings Schema
 * 
 * Manages user notification preferences for the cubicle management system.
 * Provides granular control over notification channels, frequency, and delivery preferences
 * with comprehensive validation and audit trail capabilities.
 * 
 * @typedef {Object} NotificationSettings
 * @property {String} userId - Firebase user ID (unique identifier)
 * @property {String} email - User email address for notifications
 * @property {Boolean} emailEnabled - Whether email notifications are enabled
 * @property {Boolean} slackEnabled - Whether Slack notifications are enabled
 * @property {String} frequency - Notification frequency preference
 * @property {Date} lastNotification - Timestamp of last notification sent
 * @property {Date} createdAt - Record creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 */
const NotificationSettingsSchema = new mongoose.Schema({
  /**
   * User Identifier
   * 
   * Firebase user ID that uniquely identifies the user across the system.
   * Used for linking notification preferences to specific users.
   * 
   * @type {String}
   * @required
   * @unique
   * @index
   * @validation Must be valid Firebase UID format
   */
  userId: { 
    type: String, 
    required: [true, 'User ID is required for notification settings'],
    unique: true,
    index: true,
    trim: true,
    maxlength: [128, 'User ID cannot exceed 128 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9_-]+$/.test(v);
      },
      message: 'User ID must contain only alphanumeric characters, hyphens, and underscores'
    }
  },

  /**
   * User Email Address
   * 
   * Primary email address for sending notifications.
   * Must be valid email format and is used for email notification delivery.
   * 
   * @type {String}
   * @required
   * @validation Valid email format required
   * @index For efficient email-based queries
   */
  email: { 
    type: String, 
    required: [true, 'Email address is required for notifications'],
    trim: true,
    lowercase: true,
    maxlength: [255, 'Email address cannot exceed 255 characters'],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    index: true
  },

  /**
   * Email Notification Preference
   * 
   * Controls whether the user receives email notifications.
   * When disabled, no email notifications will be sent to this user.
   * 
   * @type {Boolean}
   * @default true
   * @index For filtering enabled users
   */
  emailEnabled: { 
    type: Boolean, 
    default: true,
    index: true
  },

  /**
   * Slack Notification Preference
   * 
   * Controls whether the user receives Slack notifications.
   * When disabled, no Slack notifications will be sent to this user.
   * 
   * @type {Boolean}
   * @default false
   * @index For filtering enabled users
   */
  slackEnabled: { 
    type: Boolean, 
    default: false,
    index: true
  },

  /**
   * Notification Frequency
   * 
   * Determines how often the user receives notifications.
   * Used to control notification batching and delivery timing.
   * 
   * @type {String}
   * @enum {String} realtime - Immediate notifications
   * @enum {String} hourly - Hourly digest notifications
   * @enum {String} daily - Daily digest notifications  
   * @enum {String} weekly - Weekly digest notifications
   * @default daily
   * @index For frequency-based filtering
   */
  frequency: { 
    type: String, 
    enum: {
      values: ['realtime', 'hourly', 'daily', 'weekly'],
      message: 'Invalid frequency. Must be one of: realtime, hourly, daily, weekly'
    },
    default: 'daily',
    index: true
  },

  /**
   * Last Notification Timestamp
   * 
   * Records when the last notification was sent to this user.
   * Used for frequency-based notification scheduling and audit purposes.
   * 
   * @type {Date}
   * @optional
   * @index For frequency-based filtering and scheduling
   */
  lastNotification: { 
    type: Date,
    index: true
  }
}, {
  // Schema Options
  timestamps: true, // Automatically handles createdAt and updatedAt
  collection: 'notification_settings',
  
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
 * - User preference lookups
 * - Enabled user filtering for bulk operations
 * - Frequency-based notification scheduling
 */

// Email-enabled users for bulk email operations
NotificationSettingsSchema.index({ 
  emailEnabled: 1, 
  frequency: 1,
  lastNotification: 1 
}, {
  name: 'email_scheduling',
  background: true,
  partialFilterExpression: { emailEnabled: true }
});

// Slack-enabled users for bulk Slack operations
NotificationSettingsSchema.index({ 
  slackEnabled: 1,
  frequency: 1,
  lastNotification: 1 
}, {
  name: 'slack_scheduling',
  background: true,
  partialFilterExpression: { slackEnabled: true }
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
NotificationSettingsSchema.pre('save', function(next) {
  try {
    // Ensure email is properly formatted
    if (this.email) {
      this.email = this.email.trim().toLowerCase();
    }

    // Validate at least one notification method is enabled
    if (!this.emailEnabled && !this.slackEnabled) {
      const error = new Error('At least one notification method must be enabled');
      error.name = 'ValidationError';
      return next(error);
    }

    // Reset lastNotification if all notifications are disabled
    if (!this.emailEnabled && !this.slackEnabled) {
      this.lastNotification = undefined;
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
NotificationSettingsSchema.pre('validate', function(next) {
  try {
    // Validate email domain if provided (basic business rule)
    if (this.email) {
      const domain = this.email.split('@')[1];
      if (domain && domain.length > 100) {
        this.invalidate('email', 'Email domain is too long');
      }
    }

    // Validate frequency makes sense with notification settings
    if (this.frequency === 'realtime' && !this.emailEnabled && !this.slackEnabled) {
      this.invalidate('frequency', 'Realtime frequency requires at least one notification method enabled');
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
 * Static Methods for Queries and Management
 * 
 * Provides convenient methods for common notification settings operations
 * with proper error handling and performance optimization.
 */

/**
 * Get all users with email notifications enabled
 * @param {String} frequency - Optional frequency filter
 * @returns {Array} Users with email enabled
 */
NotificationSettingsSchema.statics.getEmailEnabledUsers = async function(frequency = null) {
  try {
    const filter = { emailEnabled: true };
    if (frequency) filter.frequency = frequency;
    
    return await this.find(filter)
      .select('userId email frequency lastNotification')
      .lean();
  } catch (error) {
    throw new Error(`Failed to get email-enabled users: ${error.message}`);
  }
};

/**
 * Get all users with Slack notifications enabled
 * @param {String} frequency - Optional frequency filter
 * @returns {Array} Users with Slack enabled
 */
NotificationSettingsSchema.statics.getSlackEnabledUsers = async function(frequency = null) {
  try {
    const filter = { slackEnabled: true };
    if (frequency) filter.frequency = frequency;
    
    return await this.find(filter)
      .select('userId email frequency lastNotification')
      .lean();
  } catch (error) {
    throw new Error(`Failed to get Slack-enabled users: ${error.message}`);
  }
};

/**
 * Update last notification timestamp for a user
 * @param {String} userId - User ID to update
 * @returns {Object} Update result
 */
NotificationSettingsSchema.statics.updateLastNotification = async function(userId) {
  try {
    return await this.findOneAndUpdate(
      { userId },
      { lastNotification: new Date() },
      { new: true }
    );
  } catch (error) {
    throw new Error(`Failed to update last notification: ${error.message}`);
  }
};

// ====================================
// INSTANCE METHODS
// ====================================

/**
 * Instance Methods for Individual Operations
 * 
 * Provides methods for working with individual notification settings records
 * with proper validation and error handling.
 */

/**
 * Check if user should receive notification based on frequency
 * @param {String} type - Notification type ('email' or 'slack')
 * @returns {Boolean} Whether notification should be sent
 */
NotificationSettingsSchema.methods.shouldReceiveNotification = function(type) {
  // Check if notification type is enabled
  const isEnabled = type === 'email' ? this.emailEnabled : this.slackEnabled;
  if (!isEnabled) return false;

  // For realtime, always send
  if (this.frequency === 'realtime') return true;

  // Check frequency-based rules
  if (!this.lastNotification) return true;

  const now = new Date();
  const timeDiff = now - this.lastNotification;
  
  switch (this.frequency) {
    case 'hourly':
      return timeDiff >= (60 * 60 * 1000); // 1 hour
    case 'daily':
      return timeDiff >= (24 * 60 * 60 * 1000); // 24 hours
    case 'weekly':
      return timeDiff >= (7 * 24 * 60 * 60 * 1000); // 7 days
    default:
      return true;
  }
};

/**
 * Get user notification preferences summary
 * @returns {Object} Summary object for logging/display
 */
NotificationSettingsSchema.methods.getPreferencesSummary = function() {
  return {
    userId: this.userId,
    email: this.email,
    channels: {
      email: this.emailEnabled,
      slack: this.slackEnabled
    },
    frequency: this.frequency,
    lastNotification: this.lastNotification,
    totalChannels: (this.emailEnabled ? 1 : 0) + (this.slackEnabled ? 1 : 0)
  };
};

module.exports = mongoose.model('NotificationSettings', NotificationSettingsSchema);
