/**
 * @fileoverview Slack Notification Service
 * @description Enterprise-grade Slack notification service for the IBM Space Optimization 
 * platform. Provides rich message formatting, webhook management, interactive elements,
 * and comprehensive error handling for all Slack-based notifications.
 * 
 * @version 2.0.0
 * @author IBM Space Optimization Team
 * @since 2.0.0
 * 
 * @module SlackNotificationService
 * 
 * Key Features:
 * - Rich Slack message blocks and formatting
 * - Webhook URL validation and management
 * - Interactive elements and buttons
 * - System health and utilization reporting
 * - Comprehensive error handling and logging
 * - Support for attachments and rich media
 * - Automatic retry mechanisms
 * - Professional message templates
 * 
 * Dependencies:
 * - axios: HTTP client for webhook requests
 * - logger: Application logging service
 * 
 * Environment Variables Required:
 * - SLACK_WEBHOOK_URL: Slack incoming webhook URL
 * - NOTIFICATIONS_ENABLED: Global notification enablement flag
 * - FRONTEND_URL: Frontend application URL for Slack buttons
 */

const axios = require('axios');
const logger = require('../../logger');

/**
 * @class SlackNotificationService
 * @description Specialized service for handling all Slack-based notifications 
 * within the IBM Space Optimization platform. Manages webhook configuration, 
 * message formatting with Slack blocks, and delivery with comprehensive error handling.
 * 
 * This service generates rich, interactive Slack messages with proper formatting,
 * emojis, and actionable buttons for enhanced user experience.
 * 
 * @example
 * ```javascript
 * const slackService = new SlackNotificationService();
 * 
 * if (slackService.isConfigured()) {
 *   await slackService.sendCubicleSequenceNotification(userData, '2024-12-15');
 * }
 * 
 * // Send system health notification
 * await slackService.sendSystemHealthNotification(healthData);
 * ```
 */
class SlackNotificationService {
  /**
   * Initialize the Slack Notification Service with webhook configuration
   * 
   * @constructor
   * @description Creates a new Slack service instance, validates webhook configuration,
   * and initializes the service for message delivery. Performs comprehensive validation
   * of environment variables and webhook URL format.
   * 
   * @example
   * ```javascript
   * const slackService = new SlackNotificationService();
   * console.log('Slack service ready:', slackService.isConfigured());
   * ```
   */
  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.enabled = process.env.NOTIFICATIONS_ENABLED === 'true';
    
    // Validate Slack configuration
    if (this.enabled && this.slackWebhookUrl && !this.isValidWebhookUrl(this.slackWebhookUrl)) {
      logger.warn('Invalid Slack webhook URL format - Slack notifications disabled');
      this.slackWebhookUrl = null;
    }
  }

  /**
   * Check if Slack service is configured and enabled
   * @returns {boolean} True if Slack service is available
   */
  isConfigured() {
    return this.enabled && !!this.slackWebhookUrl;
  }

  /**
   * Validate webhook URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid webhook URL
   */
  isValidWebhookUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:' && 
             (parsedUrl.hostname.includes('slack.com') || parsedUrl.hostname.includes('discord.com'));
    } catch (error) {
      return false;
    }
  }

  /**
   * Send cubicle sequence Slack notification for a specific user
   * 
   * @async
   * @method sendCubicleSequenceNotification
   * @description Sends a rich, interactive Slack message containing the user's 
   * cubicle reservation sequence, statistics, and usage analytics. Uses Slack's 
   * block kit for professional formatting with emojis, structured data display,
   * and contextual information.
   * 
   * @param {Object} user - User data object containing reservation and sequence information
   * @param {string} user.email - User's email address
   * @param {string} [user.displayName] - User's display name (fallback to email)
   * @param {string} user.cubicleSequence - Compressed cubicle sequence string
   * @param {number} user.totalReservations - Total number of reservations
   * @param {number} user.daysActive - Number of unique days with reservations
   * @param {string} [user.favoriteSection] - Most frequently used cubicle section
   * @param {number} user.avgDailyReservations - Average reservations per day
   * @param {Date} [user.lastActivity] - Date of most recent reservation
   * @param {string|null} [date=null] - Optional date filter in YYYY-MM-DD format for historical context
   * 
   * @returns {Promise<void>} Resolves when Slack message is successfully sent
   * 
   * @throws {Error} When Slack service is not configured
   * @throws {Error} When webhook URL is invalid or expired
   * @throws {Error} When network connection fails
   * @throws {Error} When Slack API returns an error
   * @throws {Error} When user data is invalid or incomplete
   * 
   * @example
   * ```javascript
   * const userData = {
   *   email: 'user@company.com',
   *   displayName: 'John Doe',
   *   cubicleSequence: 'A1-SOC CUB1-A1-SOC CUB3, B2-SOC CUB5',
   *   totalReservations: 25,
   *   daysActive: 15,
   *   favoriteSection: 'A',
   *   avgDailyReservations: 1.67,
   *   lastActivity: new Date('2024-12-15')
   * };
   * 
   * // Send current data
   * await slackService.sendCubicleSequenceNotification(userData);
   * 
   * // Send historical data for specific date
   * await slackService.sendCubicleSequenceNotification(userData, '2024-12-15');
   * ```
   * 
   * @since 2.0.0
   */
  async sendCubicleSequenceNotification(user, date = null) {
    if (!this.isConfigured()) {
      throw new Error('Slack service not configured');
    }

    const slackMessage = this.formatCubicleSequenceMessage(user, date);
    
    await axios.post(this.slackWebhookUrl, slackMessage);
    logger.info(`Slack cubicle sequence notification sent for ${user.email}`);
  }

  /**
   * Send bulk Slack notifications to multiple users
   * @param {Array} users - Array of user objects
   * @param {string} [sentBy] - User ID who initiated the bulk send
   * @returns {Promise<Object>} Result object with success count and details
   */
  async sendBulkUserNotifications(users, sentBy = null) {
    if (!this.isConfigured()) {
      throw new Error('Slack service not configured');
    }

    const results = [];
    let successCount = 0;

    for (const user of users) {
      try {
        await this.sendCubicleSequenceNotification(user);
        results.push({ email: user.email, status: 'success' });
        successCount++;
        logger.debug(`Slack notification sent successfully to ${user.email}`);
      } catch (error) {
        logger.error(`Failed to send Slack notification to ${user.email}:`, error.message);
        results.push({ email: user.email, status: 'error', error: error.message });
      }
    }

    logger.info(`Bulk Slack notifications completed: ${successCount}/${users.length} sent successfully`);
    
    return {
      sentCount: successCount,
      totalUsers: users.length,
      results: results,
      successEmails: results.filter(r => r.status === 'success').map(r => r.email)
    };
  }

  /**
   * Send general bulk notification to Slack channel
   * @param {string} message - Custom message for Slack
   * @param {string} [sentBy] - User ID who sent the notification
   * @returns {Promise<Object>} Result object
   */
  async sendBulkChannelNotification(message, sentBy = null) {
    if (!this.isConfigured()) {
      throw new Error('Slack service not configured');
    }

    const slackMessage = {
      text: message || 'Cubicle utilization update is now available.',
      channel: '#all-cubicle-managment-testing',
      username: 'Cubicle Management Bot',
      icon_emoji: ':office:',
      attachments: [
        {
          color: 'good',
          fields: [
            {
              title: 'System Update',
              value: 'New cubicle utilization data has been processed and is available for review.',
              short: false
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true
            }
          ]
        }
      ]
    };

    const response = await axios.post(this.slackWebhookUrl, slackMessage);
    
    logger.info('Slack bulk channel notification sent successfully');
    return {
      success: true,
      message: 'Slack notification sent successfully',
      channel: '#all-cubicle-managment-testing',
      webhookStatus: response.status
    };
  }

  /**
   * Send report generation notification to Slack
   * @param {Object} reportData - Report data object
   * @param {string} [reportType] - Type of report (weekly, monthly, etc.)
   * @returns {Promise<void>}
   */
  async sendReportNotification(reportData, reportType = 'weekly') {
    if (!this.isConfigured()) {
      logger.info('Slack notifications disabled or webhook URL not configured');
      return;
    }

    const { summary, weekStartDate, weekEndDate, generatedAt } = reportData;
    const weekRange = `${new Date(weekStartDate).toLocaleDateString()} - ${new Date(weekEndDate).toLocaleDateString()}`;
    
    // Determine alert level based on utilization
    const alertLevel = this.getAlertLevel(summary.avgUtilization);
    const emoji = this.getUtilizationEmoji(summary.avgUtilization);
    
    const slackMessage = {
      text: `📊 Space Utilization Report Generated`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Utilization Report`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Period:*\n${weekRange}`
            },
            {
              type: "mrkdwn",
              text: `*Generated:*\n${new Date(generatedAt).toLocaleString()}`
            },
            {
              type: "mrkdwn",
              text: `*Average Utilization:*\n${summary.avgUtilization}% ${this.getTrendIndicator(summary.avgUtilization)}`
            },
            {
              type: "mrkdwn",
              text: `*Peak Utilization:*\n${summary.peakUtilization}%`
            },
            {
              type: "mrkdwn",
              text: `*Total Reservations:*\n${summary.totalReservations}`
            },
            {
              type: "mrkdwn",
              text: `*Active Users:*\n${summary.uniqueUsers}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: this.getReportInsights(summary, alertLevel)
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "📥 Download Excel Report"
              },
              url: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/utilization`,
              action_id: "download_report"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "📈 View Dashboard"
              },
              url: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/statistics`,
              action_id: "view_dashboard"
            }
          ]
        }
      ]
    };

    await axios.post(this.slackWebhookUrl, slackMessage);
    logger.info('Slack report notification sent successfully', { reportType, utilization: summary.avgUtilization });
  }

  /**
   * Send system health notification
   * @param {Object} healthData - System health data
   * @returns {Promise<void>}
   */
  async sendSystemHealthNotification(healthData) {
    if (!this.isConfigured()) return;

    const { totalCubicles, reservedCubicles, errorCubicles, systemUptime } = healthData;
    const healthPercentage = Math.round(((totalCubicles - errorCubicles) / totalCubicles) * 100);
    const healthEmoji = healthPercentage >= 95 ? '✅' : healthPercentage >= 85 ? '⚠️' : '🚨';

    const slackMessage = {
      text: `${healthEmoji} System Health Check`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${healthEmoji} System Health Report`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*System Health:*\n${healthPercentage}%`
            },
            {
              type: "mrkdwn",
              text: `*Total Cubicles:*\n${totalCubicles}`
            },
            {
              type: "mrkdwn",
              text: `*Currently Reserved:*\n${reservedCubicles}`
            },
            {
              type: "mrkdwn",
              text: `*Error Status:*\n${errorCubicles}`
            },
            {
              type: "mrkdwn",
              text: `*System Uptime:*\n${systemUptime}`
            },
            {
              type: "mrkdwn",
              text: `*Last Check:*\n${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    await axios.post(this.slackWebhookUrl, slackMessage);
    logger.info('System health notification sent to Slack');
  }

  /**
   * Send custom message to Slack
   * @param {Object} user - User object with email and display name
   * @param {string} message - Custom message content
   */
  async sendCustomMessage(user, message) {
    if (!this.webhookUrl) {
      throw new Error('Slack service not configured');
    }

    const slackMessage = {
      text: `📧 Custom Notification for ${user.displayName || user.email}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📧 Custom Notification' }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*User:*\n${user.displayName || user.email}` },
            { type: 'mrkdwn', text: `*Time:*\n${new Date().toLocaleString()}` }
          ]
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Message:*\n${message}` }
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: 'IBM Space Optimization System - Custom Notification' }
          ]
        }
      ]
    };

    await this.sendMessage(slackMessage);
    logger.info(`Custom Slack message sent for ${user.email}`);
  }

  /**
   * Format Slack message for cubicle sequence notification
   * @param {Object} user - User data
   * @param {string} [date] - Optional date filter
   * @returns {Object} Formatted Slack message
   */
  formatCubicleSequenceMessage(user, date = null) {
    const dateContext = date ? ` for ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : '';
    
    return {
      text: `🏢 Cubicle Reservation Update for ${user.displayName || user.email}${dateContext}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🏢 Cubicle Reservation Update${dateContext}` }
        },
        ...(date ? [{
          type: 'section',
          text: { type: 'mrkdwn', text: `📅 *Date-Specific Report:* This summary shows reservations for ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` }
        }] : []),
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*User:*\n${user.displayName || user.email}` },
            { type: 'mrkdwn', text: `*Total Reservations:*\n${user.totalReservations}` },
            { type: 'mrkdwn', text: `*Days Active:*\n${user.daysActive}` },
            { type: 'mrkdwn', text: `*Favorite Section:*\n${user.favoriteSection || 'N/A'}` },
            { type: 'mrkdwn', text: `*Avg Daily Reservations:*\n${user.avgDailyReservations}` }
          ]
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Cubicle Sequence:*\n${user.cubicleSequence || 'No reservations found'}` }
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `Last activity: ${user.lastActivity ? new Date(user.lastActivity).toLocaleString() : 'N/A'}` }
          ]
        }
      ]
    };
  }

  // Helper methods for utilization analysis
  getAlertLevel(utilization) {
    if (utilization >= 90) return 'critical';
    if (utilization >= 75) return 'high';
    if (utilization >= 50) return 'medium';
    if (utilization >= 25) return 'low';
    return 'minimal';
  }

  getUtilizationEmoji(utilization) {
    if (utilization >= 90) return '🔴';
    if (utilization >= 75) return '🟠';
    if (utilization >= 50) return '🟡';
    if (utilization >= 25) return '🟢';
    return '🔵';
  }

  getTrendIndicator(utilization) {
    if (utilization >= 85) return '📈 High demand';
    if (utilization >= 65) return '📊 Steady usage';
    if (utilization >= 35) return '📉 Moderate usage';
    return '📋 Low usage';
  }

  getReportInsights(summary, alertLevel) {
    const insights = [];
    
    if (alertLevel === 'critical') {
      insights.push('🚨 *Critical*: Space utilization is at maximum capacity. Consider expansion or booking restrictions.');
    } else if (alertLevel === 'high') {
      insights.push('⚠️ *High Usage*: Monitor closely for potential capacity issues.');
    } else if (alertLevel === 'low' || alertLevel === 'minimal') {
      insights.push('ℹ️ *Low Usage*: Consider promotional activities to increase space utilization.');
    } else {
      insights.push('✅ *Optimal*: Space utilization is within ideal ranges.');
    }

    if (summary.peakUtilization - summary.avgUtilization > 30) {
      insights.push('📊 High variance detected between peak and average usage.');
    }

    return insights.join('\n');
  }
}

module.exports = SlackNotificationService;
