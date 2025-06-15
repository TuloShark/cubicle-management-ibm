/**
 * @fileoverview Notification Orchestrator Service
 * @description Enterprise-grade notification coordination service that manages 
 * the interaction between Email, Slack, and User Data services. Provides unified 
 * notification processing with comprehensive error handling, logging, and 
 * multi-channel support for the IBM Space Optimization platform.
 * 
 * @version 2.0.0
 * @author IBM Space Optimization Team
 * @since 2.0.0
 * 
 * @module NotificationOrchestrator
 * 
 * Key Features:
 * - Multi-channel notification orchestration (Email, Slack)
 * - Unified error handling and logging
 * - Individual and bulk notification processing
 * - User preference management integration
 * - Comprehensive audit trail
 * - Business logic coordination
 * 
 * Dependencies:
 * - UserDataService: Handles user data processing and aggregation
 * - EmailNotificationService: Manages email-specific operations
 * - SlackNotificationService: Manages Slack-specific operations
 * - NotificationHistory: Database model for audit logging
 * - NotificationSettings: User preference management
 */

const logger = require('../../logger');
const NotificationHistory = require('../../models/NotificationHistory');
const NotificationSettings = require('../../models/NotificationSettings');

const UserDataService = require('./UserDataService');
const EmailNotificationService = require('./EmailNotificationService');
const SlackNotificationService = require('./SlackNotificationService');

/**
 * @class NotificationOrchestrator
 * @description Main orchestrator class that coordinates notification delivery across 
 * multiple channels while maintaining business logic, error handling, and audit compliance.
 * 
 * This service acts as the primary interface for the notification system, delegating 
 * specific operations to specialized services while maintaining overall control flow 
 * and ensuring consistency across all notification channels.
 * 
 * @example
 * ```javascript
 * const orchestrator = new NotificationOrchestrator();
 * 
 * // Send individual notification with date filter
 * const result = await orchestrator.sendIndividualCubicleSequenceNotification(
 *   'user-123', 
 *   'admin-456', 
 *   '2024-12-15'
 * );
 * 
 * // Send bulk notifications to all users
 * const bulkResult = await orchestrator.sendBulkNotifications(
 *   'email', 
 *   'Monthly utilization report available',
 *   'admin-456'
 * );
 * ```
 */
class NotificationOrchestrator {
  /**
   * Initialize the NotificationOrchestrator with all required services
   * 
   * @constructor
   * @description Creates a new orchestrator instance and initializes all 
   * dependent services. Each service is responsible for its own configuration 
   * validation and error handling.
   * 
   * @example
   * ```javascript
   * const orchestrator = new NotificationOrchestrator();
   * console.log('Email configured:', orchestrator.emailService.isConfigured());
   * console.log('Slack configured:', orchestrator.slackService.isConfigured());
   * ```
   */
  constructor() {
    this.userDataService = new UserDataService();
    this.emailService = new EmailNotificationService();
    this.slackService = new SlackNotificationService();
    
    logger.info('NotificationOrchestrator initialized successfully', {
      emailConfigured: this.emailService.isConfigured(),
      slackConfigured: this.slackService.isConfigured()
    });
  }

  /**
   * Send individual cubicle sequence notification to a specific user
   * 
   * @async
   * @method sendIndividualCubicleSequenceNotification
   * @description Sends a personalized cubicle sequence notification to a specific user 
   * via both email and Slack channels (if configured). Includes comprehensive user 
   * statistics, reservation history, and cubicle sequence data. Supports optional 
   * date filtering for historical data requests.
   * 
   * @param {string} userId - Firebase user ID of the notification recipient
   * @param {string|null} [sentBy=null] - Firebase user ID of the person initiating the notification (for audit logging)
   * @param {string|null} [date=null] - Optional date filter in YYYY-MM-DD format for historical data
   * 
   * @returns {Promise<Object>} Notification result object containing delivery status for each channel
   * @returns {Object} returns.email - Email delivery result with success status and error details
   * @returns {Object} returns.slack - Slack delivery result with success status and error details  
   * @returns {string} returns.user - Email address of the recipient
   * @returns {string|null} returns.date - Date filter used (if any)
   * 
   * @throws {Error} When userId is missing or invalid
   * @throws {Error} When date format is invalid (must be YYYY-MM-DD)
   * @throws {Error} When user is not found or has no reservations
   * @throws {Error} When database connection fails
   * 
   * @example
   * ```javascript
   * // Send current cubicle sequence to user
   * const result = await orchestrator.sendIndividualCubicleSequenceNotification(
   *   'firebase-user-123',
   *   'admin-user-456'
   * );
   * 
   * // Send historical data for specific date
   * const historicalResult = await orchestrator.sendIndividualCubicleSequenceNotification(
   *   'firebase-user-123',
   *   'admin-user-456',
   *   '2024-12-15'
   * );
   * 
   * console.log('Email sent:', result.email.success);
   * console.log('Slack sent:', result.slack.success);
   * ```
   * 
   * @since 2.0.0
   */
  async sendIndividualCubicleSequenceNotification(userId, sentBy = null, date = null) {
    // Validate input parameters
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    if (date && !this.userDataService.isValidDateFormat(date)) {
      throw new Error('Date must be in YYYY-MM-DD format');
    }

    try {
      const user = await this.userDataService.getUserCubicleSequence(userId, date);
      if (!user) {
        const dateMsg = date ? ` for date ${date}` : '';
        throw new Error(`User not found or has no reservations${dateMsg}`);
      }

      const results = {
        email: null,
        slack: null,
        user: user.email,
        date
      };

      // Send email notification if configured
      if (this.emailService.isConfigured()) {
        try {
          await this.emailService.sendCubicleSequenceEmail(user, date);
          results.email = { success: true };
          
          // Log successful email
          await this.logNotification({
            type: 'individual_email',
            status: 'success',
            message: `Individual cubicle sequence email sent to ${user.email}${date ? ` for date ${date}` : ''}`,
            recipients: [user.email],
            sentBy,
            data: { 
              cubicleSequence: user.cubicleSequence, 
              reservationCount: user.totalReservations,
              date: date || null
            }
          });
        } catch (emailError) {
          logger.error(`Failed to send email to ${user.email}:`, emailError.message);
          results.email = { success: false, error: emailError.message };
          
          // Log email error
          await this.logNotification({
            type: 'individual_email',
            status: 'error',
            message: `Failed to send individual email to ${user.email}`,
            recipients: [user.email],
            error: emailError.message,
            sentBy
          });
        }
      } else {
        results.email = { success: false, error: 'Email service not configured' };
      }

      // Send Slack notification if configured
      if (this.slackService.isConfigured()) {
        try {
          await this.slackService.sendCubicleSequenceNotification(user, date);
          results.slack = { success: true };
          
          // Log successful Slack
          await this.logNotification({
            type: 'individual_slack',
            status: 'success',
            message: `Individual cubicle sequence Slack sent to ${user.email}${date ? ` for date ${date}` : ''}`,
            recipients: [user.email],
            sentBy,
            data: { 
              cubicleSequence: user.cubicleSequence, 
              reservationCount: user.totalReservations,
              date: date || null
            }
          });
        } catch (slackError) {
          logger.error(`Failed to send Slack notification to ${user.email}:`, slackError.message);
          results.slack = { success: false, error: slackError.message };
          
          // Log Slack error
          await this.logNotification({
            type: 'individual_slack',
            status: 'error',
            message: `Failed to send individual Slack to ${user.email}`,
            recipients: [user.email],
            error: slackError.message,
            sentBy
          });
        }
      } else {
        results.slack = { success: false, error: 'Slack service not configured' };
      }

      // Determine overall success
      const overallSuccess = (results.email?.success || results.slack?.success);
      
      logger.info(`Individual notification to ${user.email}: Email=${results.email?.success}, Slack=${results.slack?.success}`);
      
      return {
        success: overallSuccess,
        ...results
      };

    } catch (error) {
      logger.error(`Error sending individual notification to user ${userId}:`, error);
      
      // Log general error
      await this.logNotification({
        type: 'individual',
        status: 'error',
        message: `Failed to send individual notification to user ${userId}`,
        recipients: [],
        error: error.message,
        sentBy
      });
      
      throw error;
    }
  }

  /**
   * Send cubicle sequence notifications to all users with reservations
   * @param {string} [sentBy] - User ID who initiated the notification (for logging)
   * @returns {Object} Result object with success count and details
   */
  async sendCubicleSequenceNotifications(sentBy = null) {
    try {
      // Get all users with reservations
      const usersWithReservations = await this.userDataService.getUsersWithCubicleSequences();
      
      if (usersWithReservations.length === 0) {
        logger.info('No users with reservations found for notification');
        return { sentCount: 0, users: [], totalUsers: 0 };
      }

      const results = {
        email: null,
        slack: null,
        totalUsers: usersWithReservations.length,
        successCount: 0
      };

      // Send bulk emails if configured
      if (this.emailService.isConfigured()) {
        try {
          results.email = await this.emailService.sendBulkEmails(usersWithReservations, sentBy);
          
          // Log bulk email operation
          await this.logNotification({
            type: 'bulk_email',
            status: 'success',
            message: `Bulk email notifications completed - ${results.email.sentCount}/${results.email.totalUsers} sent`,
            recipients: results.email.successEmails,
            sentBy,
            data: { totalUsers: results.email.totalUsers, successCount: results.email.sentCount }
          });
        } catch (emailError) {
          logger.error('Bulk email notification failed:', emailError.message);
          results.email = { success: false, error: emailError.message, sentCount: 0 };
          
          // Log bulk email error
          await this.logNotification({
            type: 'bulk_email',
            status: 'error',
            message: `Bulk email notifications failed: ${emailError.message}`,
            recipients: [],
            error: emailError.message,
            sentBy
          });
        }
      } else {
        results.email = { success: false, error: 'Email service not configured', sentCount: 0 };
      }

      // Send bulk Slack notifications if configured
      if (this.slackService.isConfigured()) {
        try {
          results.slack = await this.slackService.sendBulkUserNotifications(usersWithReservations, sentBy);
          
          // Log bulk Slack operation
          await this.logNotification({
            type: 'bulk_slack',
            status: 'success',
            message: `Bulk Slack notifications completed - ${results.slack.sentCount}/${results.slack.totalUsers} sent`,
            recipients: results.slack.successEmails,
            sentBy,
            data: { totalUsers: results.slack.totalUsers, successCount: results.slack.sentCount }
          });
        } catch (slackError) {
          logger.error('Bulk Slack notification failed:', slackError.message);
          results.slack = { success: false, error: slackError.message, sentCount: 0 };
          
          // Log bulk Slack error
          await this.logNotification({
            type: 'bulk_slack',
            status: 'error',
            message: `Bulk Slack notifications failed: ${slackError.message}`,
            recipients: [],
            error: slackError.message,
            sentBy
          });
        }
      } else {
        results.slack = { success: false, error: 'Slack service not configured', sentCount: 0 };
      }

      // Calculate overall success count
      results.successCount = Math.max(results.email?.sentCount || 0, results.slack?.sentCount || 0);
      
      logger.info(`Bulk notifications completed: ${results.successCount}/${results.totalUsers} users reached`);
      
      return {
        sentCount: results.successCount,
        users: results,
        totalUsers: results.totalUsers
      };

    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications to all users with reservations
   * 
   * @async
   * @method sendBulkNotifications
   * @description Processes and sends notifications to all users with active reservations 
   * via specified channel(s). Supports individual channel delivery (email/slack) or 
   * multi-channel delivery (bulk). Includes comprehensive error handling to ensure 
   * individual failures don't break the entire operation.
   * 
   * @param {string} type - Notification delivery type
   * @param {string} type.slack - Send only Slack notifications to all users
   * @param {string} type.email - Send only email notifications to all users  
   * @param {string} type.cubicle_sequence - Send email notifications with cubicle sequences
   * @param {string} type.bulk - Send both email and Slack notifications
   * @param {string|null} [message=null] - Custom message content for notifications
   * @param {string|null} [sentBy=null] - Firebase user ID of the notification sender (for audit logging)
   * 
   * @returns {Promise<Object>} Bulk notification result object
   * @returns {number|Object} returns.sentCount - Number of successful deliveries (email) or detailed results (bulk)
   * @returns {Array<Object>} [returns.users] - Array of delivery results per user (email)
   * @returns {Object} [returns.email] - Email delivery results (bulk only)
   * @returns {Object} [returns.slack] - Slack delivery results (bulk only)
   * @returns {boolean} returns.success - Overall operation success status (bulk only)
   * @returns {string} returns.message - Operation summary message (bulk only)
   * 
   * @throws {Error} When notification type is missing or invalid
   * @throws {Error} When database connection fails
   * @throws {Error} When no users with reservations are found
   * @throws {Error} When all notification services are unavailable
   * 
   * @example
   * ```javascript
   * // Send email notifications to all users
   * const emailResult = await orchestrator.sendBulkNotifications(
   *   'email', 
   *   'Monthly utilization report is now available',
   *   'admin-user-123'
   * );
   * console.log(`Emails sent: ${emailResult.sentCount}/${emailResult.users.length}`);
   * 
   * // Send both email and Slack notifications
   * const bulkResult = await orchestrator.sendBulkNotifications(
   *   'bulk',
   *   'Quarterly space optimization summary available',
   *   'admin-user-123'
   * );
   * console.log('Email success:', bulkResult.email.sentCount);
   * console.log('Slack success:', bulkResult.slack.sentCount);
   * ```
   * 
   * @since 2.0.0
   */
  async sendBulkNotifications(type, message, sentBy = null) {
    // Validate input parameters
    if (!type || typeof type !== 'string') {
      throw new Error('Valid notification type is required');
    }

    const validTypes = ['slack', 'email', 'cubicle_sequence', 'bulk'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid notification type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    try {
      logger.info(`Starting bulk notification of type: ${type}`);
      
      switch (type) {
        case 'slack':
          // Send Slack channel notification + individual user notifications
          const slackResults = {
            channel: null,
            users: null,
            success: true
          };
          
          // Send channel notification
          if (this.slackService.isConfigured()) {
            try {
              slackResults.channel = await this.slackService.sendBulkChannelNotification(message, sentBy);
            } catch (error) {
              logger.error('Slack channel notification failed:', error.message);
              slackResults.channel = { success: false, error: error.message };
            }
            
            // Send user notifications
            try {
              const users = await this.userDataService.getUsersWithCubicleSequences();
              slackResults.users = await this.slackService.sendBulkUserNotifications(users, sentBy);
            } catch (error) {
              logger.error('Slack user notifications failed:', error.message);
              slackResults.users = { success: false, error: error.message };
            }
          } else {
            throw new Error('Slack service not configured');
          }
          
          slackResults.success = (slackResults.channel?.success || slackResults.users?.sentCount > 0);
          return slackResults;
          
        case 'email':
        case 'cubicle_sequence':
          return await this.sendCubicleSequenceNotifications(sentBy);
          
        case 'bulk':
          // Send all types
          const bulkResults = {
            slack: null,
            email: null,
            success: true,
            message: 'Bulk notifications completed'
          };
          
          // Send Slack notifications
          try {
            if (this.slackService.isConfigured()) {
              bulkResults.slack = await this.slackService.sendBulkChannelNotification(message, sentBy);
            } else {
              bulkResults.slack = { success: false, error: 'Slack service not configured' };
            }
          } catch (error) {
            logger.error('Slack bulk notification failed:', error.message);
            bulkResults.slack = { success: false, error: error.message };
          }
          
          // Send email notifications
          try {
            bulkResults.email = await this.sendCubicleSequenceNotifications(sentBy);
          } catch (error) {
            logger.error('Email bulk notification failed:', error.message);
            bulkResults.email = { success: false, error: error.message };
          }
          
          // Determine overall success
          bulkResults.success = (bulkResults.slack?.success !== false) && (bulkResults.email?.sentCount > 0);
          
          return bulkResults;
          
        default:
          throw new Error(`Unknown notification type: ${type}`);
      }
    } catch (error) {
      logger.error(`Bulk notification failed for type ${type}:`, error.message);
      throw error;
    }
  }

  /**
   * Send notification to a specific user (backward compatibility method)
   * @param {string} userId - User ID to send notification to
   * @param {string} type - Type of notification ('email' or 'slack')
   * @param {string} message - Custom message for the notification
   * @returns {Object} Result of notification sending
   */
  async sendNotificationToUser(userId, type, message) {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    if (!type || !['email', 'slack'].includes(type)) {
      throw new Error('Type must be "email" or "slack"');
    }

    try {
      const user = await this.userDataService.getUserCubicleSequence(userId);
      if (!user) {
        throw new Error('User not found or has no reservations');
      }

      const result = {
        success: false,
        user: user.email,
        type
      };

      if (type === 'email' && this.emailService.isConfigured()) {
        try {
          await this.emailService.sendCustomEmail(user, message);
          result.success = true;
          
          await this.logNotification({
            type: 'custom_email',
            status: 'success',
            message: `Custom email sent to ${user.email}`,
            recipients: [user.email],
            data: { customMessage: message }
          });
        } catch (error) {
          result.error = error.message;
          await this.logNotification({
            type: 'custom_email',
            status: 'error',
            message: `Failed to send custom email to ${user.email}`,
            recipients: [user.email],
            error: error.message
          });
        }
      } else if (type === 'slack' && this.slackService.isConfigured()) {
        try {
          await this.slackService.sendCustomMessage(user, message);
          result.success = true;
          
          await this.logNotification({
            type: 'custom_slack',
            status: 'success',
            message: `Custom Slack message sent to ${user.email}`,
            recipients: [user.email],
            data: { customMessage: message }
          });
        } catch (error) {
          result.error = error.message;
          await this.logNotification({
            type: 'custom_slack',
            status: 'error',
            message: `Failed to send custom Slack message to ${user.email}`,
            recipients: [user.email],
            error: error.message
          });
        }
      } else {
        result.error = `${type} service not configured`;
      }

      return result;
    } catch (error) {
      logger.error(`Error sending notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Log notification to history (static method for backward compatibility)
   * @param {Object} data - Notification data to log
   * @returns {Object} Saved notification record
   */
  static async logNotification(data) {
    try {
      const notification = new NotificationHistory(data);
      await notification.save();
      return notification;
    } catch (error) {
      logger.error('Error logging notification:', error);
      // Don't throw here to avoid breaking the main notification flow
    }
  }

  /**
   * Get users with their cubicle sequences (delegates to UserDataService)
   * @returns {Promise<Array>} Array of user objects with computed statistics
   */
  async getUsersWithCubicleSequences() {
    return this.userDataService.getUsersWithCubicleSequences();
  }

  /**
   * Log notification to history
   * @param {Object} data - Notification data to log
   * @returns {Promise<Object|null>} Notification history object or null if failed
   */
  async logNotification(data) {
    try {
      const notification = new NotificationHistory(data);
      await notification.save();
      return notification;
    } catch (error) {
      logger.error('Error logging notification:', error);
      // Don't throw here to avoid breaking the main notification flow
      return null;
    }
  }

  /**
   * Check if user should receive notification based on their preferences
   * @param {String} userId - Firebase user ID
   * @param {String} type - Notification type ('email' or 'slack')
   * @returns {Boolean} Whether notification should be sent
   */
  async shouldSendNotification(userId, type) {
    try {
      const settings = await NotificationSettings.findOne({ userId });
      if (!settings) {
        // If no settings exist, create default ones and allow notification
        const defaultSettings = new NotificationSettings({
          userId,
          email: `${userId}@example.com`, // This should be updated with real email
          emailEnabled: true,
          slackEnabled: false
        });
        await defaultSettings.save();
        return type === 'email'; // Default to email enabled
      }
      
      return settings.shouldReceiveNotification(type);
    } catch (error) {
      logger.error(`Error checking notification preferences for user ${userId}:`, error);
      return false; // Fail safe - don't send if we can't determine preference
    }
  }

  /**
   * Update last notification timestamp for a user
   * @param {String} userId - Firebase user ID
   * @returns {Promise<void>}
   */
  async updateUserLastNotification(userId) {
    try {
      await NotificationSettings.updateLastNotification(userId);
    } catch (error) {
      logger.error(`Error updating last notification for user ${userId}:`, error);
      // Don't throw - this is not critical for notification delivery
    }
  }

  /**
   * Get users with specific notification preferences enabled
   * @param {String} type - Notification type ('email' or 'slack')
   * @param {String} frequency - Optional frequency filter
   * @returns {Array} Users with the specified notification type enabled
   */
  async getUsersWithNotificationsEnabled(type, frequency = null) {
    try {
      if (type === 'email') {
        return await NotificationSettings.getEmailEnabledUsers(frequency);
      } else if (type === 'slack') {
        return await NotificationSettings.getSlackEnabledUsers(frequency);
      } else {
        throw new Error(`Invalid notification type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error getting users with ${type} notifications enabled:`, error);
      return [];
    }
  }

  /**
   * Get service status
   * @returns {Object} Status of all notification services
   */
  getServiceStatus() {
    return {
      email: {
        configured: this.emailService.isConfigured(),
        service: 'EmailNotificationService'
      },
      slack: {
        configured: this.slackService.isConfigured(),
        service: 'SlackNotificationService'
      },
      userData: {
        configured: true,
        service: 'UserDataService'
      }
    };
  }
}

module.exports = NotificationOrchestrator;
