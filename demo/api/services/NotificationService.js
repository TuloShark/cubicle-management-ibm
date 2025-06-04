const axios = require('axios');
const nodemailer = require('nodemailer');
const logger = require('../logger');
const NotificationHistory = require('../models/NotificationHistory');
const NotificationSettings = require('../models/NotificationSettings');
const Reservation = require('../models/Reservation');
const Cubicle = require('../models/Cubicle');

/**
 * Notification Service for Slack, Monday.com, and Email integrations
 * Handles automated notifications for report generation and system events
 */
class NotificationService {
  constructor() {
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.mondayApiKey = process.env.MONDAY_API_KEY;
    this.mondayBoardId = process.env.MONDAY_BOARD_ID;
    this.mondayApiUrl = 'https://api.monday.com/v2';
    this.enabled = process.env.NOTIFICATIONS_ENABLED === 'true';
    
    // Email configuration
    this.emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };
    
    // Initialize email transporter
    if (this.emailConfig.auth.user && this.emailConfig.auth.pass) {
      this.emailTransporter = nodemailer.createTransport(this.emailConfig);
    } else {
      logger.warn('Email configuration incomplete - email notifications disabled');
    }
  }

  /**
   * Send cubicle sequence notification to all users with reservations
   */
  async sendCubicleSequenceNotifications(sentBy = null) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    try {
      // Get all users with reservations and their cubicle sequences
      const usersWithReservations = await this.getUsersWithCubicleSequences();
      
      if (usersWithReservations.length === 0) {
        logger.info('No users with reservations found for notification');
        return { sentCount: 0, users: [] };
      }

      const results = [];
      let successCount = 0;

      for (const user of usersWithReservations) {
        try {
          await this.sendCubicleSequenceEmail(user);
          // --- SLACK INTEGRATION ---
          if (this.enabled && this.slackWebhookUrl) {
            try {
              await this.sendSlackCubicleSequenceNotification(user);
            } catch (slackErr) {
              logger.error(`Failed to send Slack notification to ${user.email}:`, slackErr.message);
            }
          }
          // --- MONDAY.COM INTEGRATION (optional, only for important cases) ---
          if (this.enabled && this.mondayApiKey && this.mondayBoardId) {
            const needsAction = this.determineActionNeeded({
              avgUtilization: user.avgDailyReservations * 10, // Example: treat avgDailyReservations as utilization proxy
              peakUtilization: user.totalReservations, // Not perfect, but for demo
              totalReservations: user.totalReservations,
              uniqueUsers: 1 // single user
            });
            if (needsAction.required) {
              try {
                await this.createMondayTaskForUser(user, needsAction);
              } catch (mondayErr) {
                logger.error(`Failed to create Monday.com task for ${user.email}:`, mondayErr.message);
              }
            }
          }
          results.push({ email: user.email, status: 'success' });
          successCount++;
          // Log to history
          await this.logNotification({
            type: 'email',
            status: 'success',
            message: `Cubicle sequence sent to ${user.email}`,
            recipients: [user.email],
            sentBy,
            data: { cubicleSequence: user.cubicleSequence, reservationCount: user.totalReservations }
          });
        } catch (error) {
          logger.error(`Failed to send email to ${user.email}:`, error.message);
          results.push({ email: user.email, status: 'error', error: error.message });
          // Log error to history
          await this.logNotification({
            type: 'email',
            status: 'error',
            message: `Failed to send cubicle sequence to ${user.email}`,
            recipients: [user.email],
            error: error.message,
            sentBy
          });
        }
      }

      // Log bulk operation
      await this.logNotification({
        type: 'bulk',
        status: 'success',
        message: `Bulk cubicle sequence notification completed - ${successCount}/${usersWithReservations.length} sent`,
        recipients: results.filter(r => r.status === 'success').map(r => r.email),
        sentBy,
        data: { totalUsers: usersWithReservations.length, successCount }
      });
      logger.info(`Cubicle sequence notifications sent to ${successCount}/${usersWithReservations.length} users`);
      return { sentCount: successCount, users: results };
    } catch (error) {
      logger.error('Error sending cubicle sequence notifications:', error);
      throw error;
    }
  }

  /**
   * Send individual cubicle sequence notification
   */
  async sendIndividualCubicleSequenceNotification(userId, sentBy = null) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    try {
      const user = await this.getUserCubicleSequence(userId);
      if (!user) {
        throw new Error('User not found or has no reservations');
      }
      await this.sendCubicleSequenceEmail(user);
      // --- SLACK INTEGRATION ---
      if (this.enabled && this.slackWebhookUrl) {
        try {
          await this.sendSlackCubicleSequenceNotification(user);
        } catch (slackErr) {
          logger.error(`Failed to send Slack notification to ${user.email}:`, slackErr.message);
        }
      }
      // --- MONDAY.COM INTEGRATION (optional, only for important cases) ---
      if (this.enabled && this.mondayApiKey && this.mondayBoardId) {
        const needsAction = this.determineActionNeeded({
          avgUtilization: user.avgDailyReservations * 10,
          peakUtilization: user.totalReservations,
          totalReservations: user.totalReservations,
          uniqueUsers: 1
        });
        if (needsAction.required) {
          try {
            await this.createMondayTaskForUser(user, needsAction);
          } catch (mondayErr) {
            logger.error(`Failed to create Monday.com task for ${user.email}:`, mondayErr.message);
          }
        }
      }
      // Log to history
      await this.logNotification({
        type: 'individual',
        status: 'success',
        message: `Individual cubicle sequence sent to ${user.email}`,
        recipients: [user.email],
        sentBy,
        data: { cubicleSequence: user.cubicleSequence, reservationCount: user.totalReservations }
      });
      logger.info(`Individual cubicle sequence notification sent to ${user.email}`);
      return { success: true, user: user.email };
    } catch (error) {
      logger.error(`Error sending individual notification to user ${userId}:`, error);
      // Try to log error even if we don't have user details
      await this.logNotification({
        type: 'individual',
        status: 'error',
        message: `Failed to send individual cubicle sequence to user ${userId}`,
        recipients: [],
        error: error.message,
        sentBy
      });
      throw error;
    }
  }

  /**
   * Send cubicle sequence email to a specific user
   */
  async sendCubicleSequenceEmail(user) {
    const subject = '🏢 Your Cubicle Reservation Summary - IBM Space Optimization';
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cubicle Reservation Summary</title>
        <style>
            body { font-family: 'IBM Plex Sans', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(90deg, #0f62fe 0%, #0043ce 100%); color: white; padding: 2rem; text-align: center; }
            .header h1 { margin: 0; font-size: 1.5rem; font-weight: 400; }
            .content { padding: 2rem; }
            .summary-card { background: #f8f9fa; border-left: 4px solid #0f62fe; padding: 1.5rem; margin: 1rem 0; border-radius: 4px; }
            .metric { display: flex; justify-content: space-between; align-items: center; margin: 0.5rem 0; }
            .metric-label { font-weight: 600; color: #525252; }
            .metric-value { font-weight: 400; color: #161616; font-family: 'IBM Plex Mono', monospace; }
            .cubicle-sequence { background: #e8f5e8; border: 1px solid #24a148; padding: 1rem; border-radius: 4px; font-family: 'IBM Plex Mono', monospace; font-size: 0.9rem; word-break: break-all; margin: 1rem 0; }
            .footer { background: #f4f4f4; padding: 1rem; text-align: center; font-size: 0.875rem; color: #525252; }
            .button { display: inline-block; background: #0f62fe; color: white; padding: 0.75rem 1.5rem; border-radius: 4px; text-decoration: none; margin: 1rem 0; }
            .divider { height: 1px; background: #e0e0e0; margin: 1.5rem 0; }
            .icon { font-size: 1.2em; margin-right: 0.5rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏢 IBM Space Optimization</h1>
                <p>Your Cubicle Reservation Summary</p>
            </div>
            
            <div class="content">
                <h2>Hello ${user.displayName || user.email}!</h2>
                <p>Here's your current cubicle reservation information and sequence data:</p>
                
                <div class="summary-card">
                    <h3><span class="icon">📊</span>Reservation Summary</h3>
                    <div class="metric">
                        <span class="metric-label">Total Reservations:</span>
                        <span class="metric-value">${user.totalReservations || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Days Active:</span>
                        <span class="metric-value">${user.daysActive || 0}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Favorite Section:</span>
                        <span class="metric-value">${user.favoriteSection || 'N/A'}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Avg Daily Reservations:</span>
                        <span class="metric-value">${user.avgDailyReservations || 0}</span>
                    </div>
                </div>
                
                <h3><span class="icon">🔢</span>Your Cubicle Sequence</h3>
                <p>This sequence represents all the cubicles you've reserved, organized by date and grouped for easy reference:</p>
                
                <div class="cubicle-sequence">
                    ${user.cubicleSequence || 'No reservations found'}
                </div>
                
                <div class="divider"></div>
                
                <h3><span class="icon">ℹ️</span>What does this mean?</h3>
                <ul>
                    <li><strong>Sequence Format:</strong> Cubicles are listed by their serial codes (e.g., A1-SOC CUB1)</li>
                    <li><strong>Date Grouping:</strong> Your reservations are organized by date</li>
                    <li><strong>Consecutive Ranges:</strong> Sequential cubicles are shown as ranges (e.g., A1-A3)</li>
                    <li><strong>Section Codes:</strong> A = Section A, B = Section B, C = Section C</li>
                </ul>
                
                <div style="text-align: center; margin: 2rem 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/reservations" class="button">
                        View Current Reservations
                    </a>
                </div>
                
                <div class="divider"></div>
                
                <p><strong>Need help?</strong> Contact your system administrator or visit the reservations dashboard for more information.</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from IBM Space Optimization System</p>
                <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </body>
    </html>`;

    const textContent = `
IBM Space Optimization - Cubicle Reservation Summary

Hello ${user.displayName || user.email}!

Your Reservation Summary:
- Total Reservations: ${user.totalReservations || 0}
- Days Active: ${user.daysActive || 0}  
- Favorite Section: ${user.favoriteSection || 'N/A'}
- Avg Daily Reservations: ${user.avgDailyReservations || 0}

Your Cubicle Sequence:
${user.cubicleSequence || 'No reservations found'}

Visit ${process.env.FRONTEND_URL || 'http://localhost:8080'}/reservations to view your current reservations.

This is an automated message from IBM Space Optimization System.
Generated on ${new Date().toLocaleString()}
    `;

    const mailOptions = {
      from: `"IBM Space Optimization" <${this.emailConfig.auth.user}>`,
      to: user.email,
      subject: subject,
      text: textContent,
      html: htmlContent
    };

    await this.emailTransporter.sendMail(mailOptions);
    logger.info(`Cubicle sequence email sent successfully to ${user.email}`);
  }

  /**
   * Get users with their cubicle sequences
   */
  async getUsersWithCubicleSequences() {
    try {
      // Get all reservations with user and cubicle data
      const reservations = await Reservation.find()
        .populate('cubicle')
        .lean();

      if (reservations.length === 0) {
        return [];
      }

      // Group reservations by user
      const userMap = {};
      reservations.forEach(reservation => {
        if (!reservation.user || !reservation.user.email) return;
        
        const email = reservation.user.email;
        if (!userMap[email]) {
          userMap[email] = {
            email: email,
            displayName: reservation.user.displayName || '',
            uid: reservation.user.uid || '',
            reservations: [],
            sections: {}
          };
        }
        
        userMap[email].reservations.push(reservation);
        
        // Track section usage
        if (reservation.cubicle && reservation.cubicle.section) {
          const section = reservation.cubicle.section;
          userMap[email].sections[section] = (userMap[email].sections[section] || 0) + 1;
        }
      });

      // Convert to array and add computed fields
      return Object.values(userMap).map(userData => {
        const totalReservations = userData.reservations.length;
        const daysActive = new Set(
          userData.reservations.map(r => r.date.toDateString())
        ).size;
        
        // Find favorite section
        let favoriteSection = '';
        let maxCount = 0;
        Object.entries(userData.sections).forEach(([section, count]) => {
          if (count > maxCount) {
            maxCount = count;
            favoriteSection = section;
          }
        });
        
        // Generate cubicle sequence
        const cubicleSequence = this.generateCubicleCodeSequence(userData.reservations);
        
        return {
          email: userData.email,
          displayName: userData.displayName,
          uid: userData.uid,
          totalReservations,
          daysActive,
          favoriteSection,
          avgDailyReservations: daysActive > 0 ? +(totalReservations / daysActive).toFixed(2) : 0,
          cubicleSequence,
          lastActivity: userData.reservations.length > 0 ? 
            new Date(Math.max(...userData.reservations.map(r => new Date(r.date)))) : null
        };
      });

    } catch (error) {
      logger.error('Error getting users with cubicle sequences:', error);
      throw error;
    }
  }

  /**
   * Get single user's cubicle sequence
   */
  async getUserCubicleSequence(userId) {
    try {
      const reservations = await Reservation.find({ 'user.uid': userId })
        .populate('cubicle')
        .lean();

      if (reservations.length === 0) {
        return null;
      }

      const userData = {
        email: reservations[0].user.email,
        displayName: reservations[0].user.displayName || '',
        uid: reservations[0].user.uid,
        reservations: reservations,
        sections: {}
      };

      // Track section usage
      reservations.forEach(reservation => {
        if (reservation.cubicle && reservation.cubicle.section) {
          const section = reservation.cubicle.section;
          userData.sections[section] = (userData.sections[section] || 0) + 1;
        }
      });

      const totalReservations = reservations.length;
      const daysActive = new Set(
        reservations.map(r => r.date.toDateString())
      ).size;
      
      // Find favorite section
      let favoriteSection = '';
      let maxCount = 0;
      Object.entries(userData.sections).forEach(([section, count]) => {
        if (count > maxCount) {
          maxCount = count;
          favoriteSection = section;
        }
      });
      
      return {
        email: userData.email,
        displayName: userData.displayName,
        uid: userData.uid,
        totalReservations,
        daysActive,
        favoriteSection,
        avgDailyReservations: daysActive > 0 ? +(totalReservations / daysActive).toFixed(2) : 0,
        cubicleSequence: this.generateCubicleCodeSequence(reservations),
        lastActivity: new Date(Math.max(...reservations.map(r => new Date(r.date))))
      };

    } catch (error) {
      logger.error(`Error getting cubicle sequence for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Generate cubicle code sequences for reservations
   */
  generateCubicleCodeSequence(reservations) {
    if (!reservations || reservations.length === 0) return '';
    
    // Sort reservations by date and cubicle serial
    const sortedReservations = reservations
      .filter(r => r.cubicle && r.cubicle.serial)
      .sort((a, b) => {
        const dateComparison = new Date(a.date) - new Date(b.date);
        if (dateComparison !== 0) return dateComparison;
        return a.cubicle.serial.localeCompare(b.cubicle.serial);
      });

    if (sortedReservations.length === 0) return '';
    
    // Group by date first, then process sequences
    const dateGroups = {};
    sortedReservations.forEach(r => {
      const dateStr = r.date.toDateString();
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = [];
      }
      dateGroups[dateStr].push(r.cubicle.serial);
    });
    
    const allCodes = [];
    
    // Process each date group for sequences
    Object.keys(dateGroups).sort().forEach(dateStr => {
      const codes = dateGroups[dateStr].sort();
      const sequences = [];
      
      let sequenceStart = codes[0];
      let sequenceEnd = sequenceStart;
      
      for (let i = 1; i < codes.length; i++) {
        if (this.isSequentialCode(sequenceEnd, codes[i])) {
          sequenceEnd = codes[i];
        } else {
          // End current sequence and start a new one
          if (sequenceStart === sequenceEnd) {
            sequences.push(sequenceStart);
          } else {
            sequences.push(`${sequenceStart}-${sequenceEnd}`);
          }
          sequenceStart = codes[i];
          sequenceEnd = codes[i];
        }
      }
      
      // Add the last sequence
      if (sequenceStart === sequenceEnd) {
        sequences.push(sequenceStart);
      } else {
        sequences.push(`${sequenceStart}-${sequenceEnd}`);
      }
      
      allCodes.push(...sequences);
    });
    
    return allCodes.join(', ');
  }

  /**
   * Check if two cubicle codes are sequential
   */
  isSequentialCode(code1, code2) {
    // Extract section, row, and number from codes like "A1-SOC CUB1"
    const regex = /([ABC])(\d+)-SOC CUB(\d+)/;
    const match1 = code1.match(regex);
    const match2 = code2.match(regex);
    
    if (!match1 || !match2) return false;
    
    const [, section1, row1, num1] = match1;
    const [, section2, row2, num2] = match2;
    
    // Must be same section and row, with consecutive numbers
    return section1 === section2 && 
           row1 === row2 && 
           parseInt(num2) === parseInt(num1) + 1;
  }

  /**
   * Log notification to history
   */
  async logNotification(data) {
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

  /**
   * Send a Slack message with cubicle sequence summary for a user
   */
  async sendSlackCubicleSequenceNotification(user) {
    const slackMessage = {
      text: `🏢 Cubicle Reservation Update for ${user.displayName || user.email}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🏢 Cubicle Reservation Update` }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*User:*
${user.displayName || user.email}` },
            { type: 'mrkdwn', text: `*Total Reservations:*
${user.totalReservations}` },
            { type: 'mrkdwn', text: `*Days Active:*
${user.daysActive}` },
            { type: 'mrkdwn', text: `*Favorite Section:*
${user.favoriteSection || 'N/A'}` },
            { type: 'mrkdwn', text: `*Avg Daily Reservations:*
${user.avgDailyReservations}` }
          ]
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Cubicle Sequence:*
${user.cubicleSequence || 'No reservations found'}` }
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `Last activity: ${user.lastActivity ? new Date(user.lastActivity).toLocaleString() : 'N/A'}` }
          ]
        }
      ]
    };
    await axios.post(this.slackWebhookUrl, slackMessage);
    logger.info(`Slack cubicle sequence notification sent for ${user.email}`);
  }

  /**
   * Create a Monday.com task for a user (if needed)
   */
  async createMondayTaskForUser(user, needsAction) {
    const mutation = `
      mutation {
        create_item (
          board_id: ${this.mondayBoardId},
          item_name: "Cubicle Sequence Alert: ${user.displayName || user.email}",
          column_values: ${JSON.stringify(JSON.stringify({
            status: { label: needsAction.urgency },
            priority: { label: needsAction.urgency },
            text: `Cubicle sequence: ${user.cubicleSequence}\nTotal Reservations: ${user.totalReservations}\nDays Active: ${user.daysActive}`,
            date: new Date().toISOString().split('T')[0],
            numbers: user.totalReservations
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
    logger.info('Monday.com cubicle sequence task created', { taskId: createdTask.id, taskName: createdTask.name });
    // Optionally, send a Slack notification about the Monday.com task
    await this.sendSlackTaskNotification(createdTask, needsAction);
  }
}

module.exports = NotificationService;
