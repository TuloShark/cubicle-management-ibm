/**
 * @fileoverview Email Notification Service
 * @description Enterprise-grade email notification service for the IBM Space Optimization 
 * platform. Provides rich HTML email generation, SMTP configuration management, 
 * and comprehensive error handling for all email-based notifications.
 * 
 * @version 2.0.0
 * @author IBM Space Optimization Team
 * @since 2.0.0
 * 
 * @module EmailNotificationService
 * 
 * Key Features:
 * - Rich HTML email templates with IBM branding
 * - SMTP configuration validation and management
 * - Responsive email design for all devices
 * - Comprehensive error handling and logging
 * - Support for both HTML and text email formats
 * - Custom email content generation
 * - Professional email formatting with statistics
 * 
 * Dependencies:
 * - nodemailer: SMTP email sending functionality
 * - logger: Application logging service
 * 
 * Environment Variables Required:
 * - SMTP_HOST: Email server hostname (default: smtp.gmail.com)
 * - SMTP_PORT: Email server port (default: 587)
 * - SMTP_USER: Email authentication username
 * - SMTP_PASSWORD: Email authentication password
 * - FRONTEND_URL: Frontend application URL for email links
 */

const nodemailer = require('nodemailer');
const logger = require('../../logger');

/**
 * @class EmailNotificationService
 * @description Specialized service for handling all email-based notifications 
 * within the IBM Space Optimization platform. Manages SMTP configuration, 
 * email template generation, and delivery with comprehensive error handling.
 * 
 * This service generates professional, responsive HTML emails with IBM branding 
 * and includes fallback text versions for all email clients.
 * 
 * @example
 * ```javascript
 * const emailService = new EmailNotificationService();
 * 
 * if (emailService.isConfigured()) {
 *   await emailService.sendCubicleSequenceEmail(userData, '2024-12-15');
 * }
 * 
 * // Send custom message
 * await emailService.sendCustomEmail(userData, 'Important system update');
 * ```
 */
class EmailNotificationService {
  /**
   * Initialize the Email Notification Service with SMTP configuration
   * 
   * @constructor
   * @description Creates a new email service instance, validates SMTP configuration,
   * and initializes the nodemailer transporter. Performs comprehensive validation
   * of environment variables and provides clear error messages for configuration issues.
   * 
   * @throws {Error} When SMTP configuration is invalid or incomplete
   * 
   * @example
   * ```javascript
   * const emailService = new EmailNotificationService();
   * console.log('Email service ready:', emailService.isConfigured());
   * ```
   */
  constructor() {
    // Email configuration
    this.emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };
    
    // Validate port is a number
    if (isNaN(this.emailConfig.port)) {
      logger.warn('Invalid SMTP_PORT, using default 587');
      this.emailConfig.port = 587;
    }
    
    // Initialize email transporter with error handling
    if (this.emailConfig.auth.user && this.emailConfig.auth.pass) {
      try {
        this.emailTransporter = nodemailer.createTransporter(this.emailConfig);
        logger.info('Email transporter initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize email transporter:', error.message);
        this.emailTransporter = null;
      }
    } else {
      logger.warn('Email configuration incomplete - email notifications disabled');
      this.emailTransporter = null;
    }
  }

  /**
   * Check if email service is configured and ready
   * @returns {boolean} True if email service is available
   */
  isConfigured() {
    return !!this.emailTransporter;
  }

  /**
   * Send cubicle sequence email to a specific user
   * 
   * @async
   * @method sendCubicleSequenceEmail
   * @description Sends a comprehensive, professionally formatted email containing 
   * the user's cubicle reservation sequence, statistics, and usage analytics. 
   * Generates responsive HTML content with IBM branding and includes fallback 
   * text version for all email clients.
   * 
   * @param {Object} user - User data object containing reservation and sequence information
   * @param {string} user.email - User's email address
   * @param {string} [user.displayName] - User's display name (fallback to email)
   * @param {string} user.cubicleSequence - Compressed cubicle sequence string
   * @param {number} user.totalReservations - Total number of reservations
   * @param {number} user.daysActive - Number of unique days with reservations
   * @param {string} [user.favoriteSection] - Most frequently used cubicle section
   * @param {number} user.avgDailyReservations - Average reservations per day
   * @param {string|null} [date=null] - Optional date filter in YYYY-MM-DD format for historical context
   * 
   * @returns {Promise<void>} Resolves when email is successfully sent
   * 
   * @throws {Error} When email service is not configured
   * @throws {Error} When SMTP authentication fails
   * @throws {Error} When email sending fails
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
   *   avgDailyReservations: 1.67
   * };
   * 
   * // Send current data
   * await emailService.sendCubicleSequenceEmail(userData);
   * 
   * // Send historical data for specific date
   * await emailService.sendCubicleSequenceEmail(userData, '2024-12-15');
   * ```
   * 
   * @since 2.0.0
   */
  async sendCubicleSequenceEmail(user, date = null) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const { subject, htmlContent, textContent } = this.generateEmailTemplate(user, date);

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
   * Send bulk emails to multiple users
   * @param {Array} users - Array of user objects
   * @param {string} [sentBy] - User ID who initiated the bulk send
   * @returns {Promise<Object>} Result object with success count and details
   */
  async sendBulkEmails(users, sentBy = null) {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const results = [];
    let successCount = 0;

    for (const user of users) {
      try {
        await this.sendCubicleSequenceEmail(user);
        results.push({ email: user.email, status: 'success' });
        successCount++;
        logger.debug(`Email sent successfully to ${user.email}`);
      } catch (error) {
        logger.error(`Failed to send email to ${user.email}:`, error.message);
        results.push({ email: user.email, status: 'error', error: error.message });
      }
    }

    logger.info(`Bulk emails completed: ${successCount}/${users.length} sent successfully`);
    
    return {
      sentCount: successCount,
      totalUsers: users.length,
      results: results,
      successEmails: results.filter(r => r.status === 'success').map(r => r.email)
    };
  }

  /**
   * Generate email template (HTML and text) for cubicle sequence notification
   * @param {Object} user - User data
   * @param {string} [date] - Optional date filter
   * @returns {Object} Object containing subject, htmlContent, and textContent
   */
  generateEmailTemplate(user, date = null) {
    const dateContext = date ? ` for ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : '';
    const subject = `🏢 Your Cubicle Reservation Summary${dateContext} - IBM Space Optimization`;
    
    const htmlContent = this.generateHtmlTemplate(user, date, dateContext);
    const textContent = this.generateTextTemplate(user, dateContext);

    return { subject, htmlContent, textContent };
  }

  /**
   * Generate HTML email template
   * @param {Object} user - User data
   * @param {string} [date] - Date filter
   * @param {string} dateContext - Formatted date context
   * @returns {string} HTML content
   */
  generateHtmlTemplate(user, date, dateContext) {
    return `
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
            .date-notice { background: #d1ecf1; border: 1px solid #bee5eb; padding: 1rem; border-radius: 4px; margin: 1rem 0; color: #0c5460; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏢 IBM Space Optimization</h1>
                <p>Your Cubicle Reservation Summary${dateContext}</p>
            </div>
            
            <div class="content">
                <h2>Hello ${user.displayName || user.email}!</h2>
                ${date ? `<div class="date-notice">
                    <strong>📅 Date-Specific Report:</strong> This summary shows your reservations for ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
                </div>` : ''}
                <p>Here's your ${date ? 'date-specific' : 'current'} cubicle reservation information and sequence data:</p>
                
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
  }

  /**
   * Generate plain text email template
   * @param {Object} user - User data
   * @param {string} dateContext - Formatted date context
   * @returns {string} Plain text content
   */
  generateTextTemplate(user, dateContext) {
    return `
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
  }

  /**
   * Send custom email to a user
   * @param {Object} user - User object with email and display name
   * @param {string} message - Custom message content
   */
  async sendCustomEmail(user, message) {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    const subject = `📧 Custom Notification - IBM Space Optimization`;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Custom Notification</title>
        <style>
            body { font-family: 'IBM Plex Sans', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(90deg, #0f62fe 0%, #0043ce 100%); color: white; padding: 2rem; text-align: center; }
            .header h1 { margin: 0; font-size: 1.5rem; font-weight: 400; }
            .content { padding: 2rem; }
            .message { background: #f8f9fa; border-left: 4px solid #0f62fe; padding: 1.5rem; margin: 1rem 0; border-radius: 4px; }
            .footer { background: #f4f4f4; padding: 1rem; text-align: center; font-size: 0.875rem; color: #525252; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📧 IBM Space Optimization</h1>
                <p>Custom Notification</p>
            </div>
            
            <div class="content">
                <h2>Hello ${user.displayName || user.email}!</h2>
                
                <div class="message">
                    ${message}
                </div>
                
                <p>If you have any questions, please contact your system administrator.</p>
            </div>
            
            <div class="footer">
                <p>This is an automated message from IBM Space Optimization System</p>
                <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </body>
    </html>`;

    const textContent = `
IBM Space Optimization - Custom Notification

Hello ${user.displayName || user.email}!

${message}

This is an automated message from IBM Space Optimization System.
Generated on ${new Date().toLocaleString()}
    `;

    const mailOptions = {
      from: `"IBM Space Optimization" <${this.config.auth.user}>`,
      to: user.email,
      subject: subject,
      text: textContent,
      html: htmlContent
    };

    await this.transporter.sendMail(mailOptions);
    logger.info(`Custom email sent successfully to ${user.email}`);
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>} True if email configuration is working
   */
  async testConfiguration() {
    if (!this.emailTransporter) {
      return false;
    }

    try {
      await this.emailTransporter.verify();
      logger.info('Email configuration test successful');
      return true;
    } catch (error) {
      logger.error('Email configuration test failed:', error.message);
      return false;
    }
  }
}

module.exports = EmailNotificationService;
