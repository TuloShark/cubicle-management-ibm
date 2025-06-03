const axios = require('axios');
const logger = require('../logger');

/**
 * Notification Service for Slack and Monday.com integrations
 * Handles automated notifications for report generation and system events
 */
class NotificationService {
  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.mondayApiKey = process.env.MONDAY_API_KEY;
    this.mondayBoardId = process.env.MONDAY_BOARD_ID;
    this.mondayApiUrl = 'https://api.monday.com/v2';
    this.enabled = process.env.NOTIFICATIONS_ENABLED === 'true';
  }

  /**
   * Send report generation notification to Slack
   */
  async sendSlackReportNotification(reportData, reportType = 'weekly') {
    if (!this.enabled || !this.slackWebhookUrl) {
      logger.info('Slack notifications disabled or webhook URL not configured');
      return;
    }

    try {
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

      const response = await axios.post(this.slackWebhookUrl, slackMessage);
      logger.info('Slack notification sent successfully', { reportType, utilization: summary.avgUtilization });
      
    } catch (error) {
      logger.error('Failed to send Slack notification:', error.message);
    }
  }

  /**
   * Create task in Monday.com for report follow-up
   */
  async createMondayTask(reportData, priority = 'medium') {
    if (!this.enabled || !this.mondayApiKey || !this.mondayBoardId) {
      logger.info('Monday.com integration disabled or credentials not configured');
      return;
    }

    try {
      const { summary, weekStartDate, weekEndDate } = reportData;
      const weekRange = `${new Date(weekStartDate).toLocaleDateString()} - ${new Date(weekEndDate).toLocaleDateString()}`;
      
      // Determine if action is needed based on utilization levels
      const needsAction = this.determineActionNeeded(summary);
      
      if (!needsAction.required) {
        logger.info('No Monday.com task needed - utilization within normal ranges');
        return;
      }

      const taskName = `Space Utilization Review: ${weekRange}`;
      const taskDescription = this.generateTaskDescription(summary, needsAction);
      
      const mutation = `
        mutation {
          create_item (
            board_id: ${this.mondayBoardId},
            item_name: "${taskName}",
            column_values: ${JSON.stringify(JSON.stringify({
              status: { label: needsAction.urgency },
              priority: { label: priority },
              text: taskDescription,
              date: new Date().toISOString().split('T')[0],
              numbers: summary.avgUtilization
            }))}
          ) {
            id
            name
            url
          }
        }
      `;

      const response = await axios.post(this.mondayApiUrl, 
        { query: mutation },
        {
          headers: {
            'Authorization': this.mondayApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.errors) {
        throw new Error(`Monday.com API error: ${JSON.stringify(response.data.errors)}`);
      }

      const createdTask = response.data.data.create_item;
      logger.info('Monday.com task created successfully', { 
        taskId: createdTask.id, 
        taskName: createdTask.name,
        urgency: needsAction.urgency 
      });

      // Send Slack notification about Monday.com task creation
      await this.sendSlackTaskNotification(createdTask, needsAction);

    } catch (error) {
      logger.error('Failed to create Monday.com task:', error.message);
    }
  }

  /**
   * Send system health notification
   */
  async sendSystemHealthNotification(healthData) {
    if (!this.enabled || !this.slackWebhookUrl) return;

    try {
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

    } catch (error) {
      logger.error('Failed to send system health notification:', error.message);
    }
  }

  /**
   * Helper methods
   */
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

  determineActionNeeded(summary) {
    const { avgUtilization, peakUtilization, totalReservations } = summary;
    
    // Critical: Over 90% utilization
    if (avgUtilization >= 90) {
      return {
        required: true,
        urgency: 'urgent',
        reason: 'Critical capacity reached - immediate action required'
      };
    }
    
    // High: Over 85% utilization or high peak variance
    if (avgUtilization >= 85 || (peakUtilization - avgUtilization > 40)) {
      return {
        required: true,
        urgency: 'high',
        reason: 'High utilization or significant peak variance detected'
      };
    }
    
    // Low: Under 25% utilization
    if (avgUtilization < 25 && totalReservations < 10) {
      return {
        required: true,
        urgency: 'medium',
        reason: 'Low utilization - consider promotional strategies'
      };
    }

    return { required: false };
  }

  generateTaskDescription(summary, actionNeeded) {
    return `
Space Utilization Report Follow-up

📊 **Key Metrics:**
- Average Utilization: ${summary.avgUtilization}%
- Peak Utilization: ${summary.peakUtilization}%
- Total Reservations: ${summary.totalReservations}
- Active Users: ${summary.uniqueUsers}

🎯 **Action Required:**
${actionNeeded.reason}

📋 **Recommended Actions:**
${this.getRecommendedActions(summary, actionNeeded.urgency)}

🔗 **Resources:**
- View detailed report in dashboard
- Download Excel analytics
- Review user feedback and patterns
    `.trim();
  }

  getRecommendedActions(summary, urgency) {
    if (urgency === 'urgent') {
      return `
- Implement immediate booking restrictions
- Consider temporary capacity expansion
- Notify users of high demand periods
- Review and optimize space allocation`;
    } else if (urgency === 'high') {
      return `
- Monitor capacity trends daily
- Plan for potential expansion
- Optimize peak hour management
- Review user booking patterns`;
    } else {
      return `
- Develop utilization improvement strategies
- Consider promotional campaigns
- Review space configuration
- Analyze user engagement metrics`;
    }
  }

  async sendSlackTaskNotification(mondayTask, actionNeeded) {
    if (!this.slackWebhookUrl) return;

    try {
      const message = {
        text: "📋 Monday.com Task Created",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📋 *New task created in Monday.com*\n\n*Task:* ${mondayTask.name}\n*Urgency:* ${actionNeeded.urgency}\n*Reason:* ${actionNeeded.reason}`
            },
            accessory: {
              type: "button",
              text: {
                type: "plain_text",
                text: "Open Task"
              },
              url: mondayTask.url,
              action_id: "open_monday_task"
            }
          }
        ]
      };

      await axios.post(this.slackWebhookUrl, message);
      logger.info('Monday.com task notification sent to Slack');

    } catch (error) {
      logger.error('Failed to send Monday.com task notification:', error.message);
    }
  }
}

module.exports = NotificationService;
