/**
 * @fileoverview Notification Management Controller
 * @description Comprehensive notification operations with enterprise-grade validation,
 * security, performance optimizations, and multi-channel integration support
 * 
 * @version 2.1.0
 * @author Cubicle Management System - IBM Space Optimization
 * @since 1.0.0
 * 
 * @module NotificationController
 * 
 * API Endpoints:
 * - GET    /api/notifications/settings           - Get user notification settings
 * - PUT    /api/notifications/settings           - Update user notification settings
 * - POST   /api/notifications/send               - Send individual notification
 * - POST   /api/notifications/send-individual    - Send cubicle sequence to self
 * - POST   /api/notifications/send-bulk          - Send bulk notifications (admin)
 * - GET    /api/notifications/users-with-cubicles - Get users with cubicle data (admin)
 * - GET    /api/notifications/history            - Get notification history
 * - POST   /api/notifications/test               - Send test notification
 * - GET    /api/notifications/statistics         - Get notification statistics (admin)
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();
const NotificationOrchestrator = require('../services/notifications/NotificationOrchestrator');
const NotificationSettings = require('../models/NotificationSettings');
const NotificationHistory = require('../models/NotificationHistory');
const admin = require('../firebase');
const { validarUsuario, validarAdmin } = require('../middleware/auth');
const { rateLimiters, rateLimiterCombinations } = require('../middleware/rateLimiting');
const logger = require('../logger');

// ================================================================================
// CONFIGURATION CONSTANTS
// ================================================================================

/**
 * Supported notification types in the system
 * Used for validation and logging consistency
 */
const NOTIFICATION_TYPES = ['email', 'slack', 'bulk', 'individual', 'test', 'custom'];

/**
 * Notification status constants
 * Used for history tracking and filtering
 */
const NOTIFICATION_STATUS = ['success', 'error', 'warning', 'pending'];

/**
 * Date format regex for validation
 * Ensures consistent YYYY-MM-DD format across the system
 */
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

/**
 * Date format validation utility
 * Ensures date strings match YYYY-MM-DD format and are valid dates
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if date is valid and properly formatted
 * @example
 * isValidDateFormat('2025-06-14'); // true
 * isValidDateFormat('06/14/2025'); // false
 * isValidDateFormat('2025-13-01'); // false (invalid month)
 */
function isValidDateFormat(dateString) {
  if (!dateString || !DATE_FORMAT_REGEX.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString + 'T00:00:00.000Z');
  return date.toISOString().startsWith(dateString);
}

// ================================================================================
// NOTIFICATION CONTROLLER CLASS
// ================================================================================

class NotificationController {
  /**
   * Get notification settings for authenticated user
   * Creates default settings if none exist
   * @route GET /api/notifications/settings
   * @access Protected (user)
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user from middleware
   * @param {string} req.user.uid - Firebase user ID
   * @param {string} req.user.email - User email from Firebase token
   * @param {Object} res - Express response object
   * @returns {Object} Success response with notification settings
   */
  static async getSettings(req, res) {
    try {
      const { uid } = req.user;
      
      let settings = await NotificationSettings.findOne({ userId: uid });
      
      // Create default settings if none exist
      if (!settings) {
        settings = new NotificationSettings({
          userId: uid,
          email: req.user.email || `${uid}@example.com`, // Use user email from auth token or fallback
          emailEnabled: true,
          slackEnabled: false
        });
        await settings.save();
      }
      
      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error getting notification settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification settings'
      });
    }
  }

  /**
   * Update notification settings for authenticated user
   * Uses upsert to create settings if they don't exist
   * @route PUT /api/notifications/settings
   * @access Protected (user)
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user from middleware
   * @param {string} req.user.uid - Firebase user ID
   * @param {Object} req.body - Request body
   * @param {boolean} req.body.emailNotifications - Email notification preference
   * @param {boolean} req.body.slackNotifications - Slack notification preference
   * @param {Object} res - Express response object
   * @returns {Object} Success response with updated settings
   */
  static async updateSettings(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      const { uid } = req.user;
      const { emailNotifications, slackNotifications, email, frequency } = req.body;
      
      // Map frontend field names to schema field names
      const updateData = {};
      if (emailNotifications !== undefined) updateData.emailEnabled = emailNotifications;
      if (slackNotifications !== undefined) updateData.slackEnabled = slackNotifications;
      if (email !== undefined) updateData.email = email;
      if (frequency !== undefined) updateData.frequency = frequency;
      
      const settings = await NotificationSettings.findOneAndUpdate(
        { userId: uid },
        updateData,
        { new: true, upsert: true, runValidators: true }
      );
      
      res.status(200).json({
        success: true,
        data: settings,
        message: 'Notification settings updated successfully'
      });
    } catch (error) {
      logger.error('Error updating notification settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification settings'
      });
    }
  }

  /**
   * Send notification to a specific user
   * @route POST /api/notifications/send
   * @access Protected (user)
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user from middleware
   * @param {string} req.user.uid - Firebase user ID (sender)
   * @param {Object} req.body - Request body
   * @param {string} req.body.targetUserId - Target user Firebase UID
   * @param {string} [req.body.type='custom'] - Notification type
   * @param {string} req.body.message - Notification message content
   * @param {Object} res - Express response object
   * @returns {Object} Success response with notification result
   */
  static async sendNotification(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { uid } = req.user;
      const { targetUserId, type = 'custom', message } = req.body;
      
      const notificationOrchestrator = new NotificationOrchestrator();
      const result = await notificationOrchestrator.sendNotificationToUser(targetUserId, type, message);
      
      // Log the notification
      await NotificationOrchestrator.logNotification({
        type: 'individual',
        status: result.success ? 'success' : 'error',
        message: `Individual notification sent to ${targetUserId}`,
        recipients: [targetUserId],
        sentBy: uid,
        data: { originalMessage: message }
      });
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Notification sent successfully'
      });
    } catch (error) {
      logger.error('Error sending notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification'
      });
    }
  }

  /**
   * Send bulk notifications to all users with reservations
   * Admin-only functionality for system-wide announcements
   * @route POST /api/notifications/send-bulk
   * @access Protected (admin only)
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user from middleware
   * @param {string} req.user.uid - Firebase user ID (sender)
   * @param {Object} req.body - Request body
   * @param {string} [req.body.type='bulk'] - Notification type
   * @param {string} req.body.message - Notification message content
   * @param {Object} res - Express response object
   * @returns {Object} Success response with bulk notification results
   */
  static async sendBulkNotifications(req, res) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { uid } = req.user;
      const { type = 'bulk', message } = req.body;
      
      const notificationOrchestrator = new NotificationOrchestrator();
      const result = await notificationOrchestrator.sendBulkNotifications(type, message, uid);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Bulk notifications sent successfully'
      });
    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send bulk notifications'
      });
    }
  }

  /**
   * Get all users with their cubicle reservation sequences
   * Admin-only endpoint for privacy and security
   * @route GET /api/notifications/users-with-cubicles
   * @access Protected (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} Success response with users and cubicle data
   */
  static async getUsersWithCubicles(req, res) {
    try {
      const notificationOrchestrator = new NotificationOrchestrator();
      const users = await notificationOrchestrator.getUsersWithCubicleSequences();
      
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      logger.error('Error getting users with cubicles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users with cubicles'
      });
    }
  }

  /**
   * Get notification history with pagination and filtering
   * Allows users to view their notification activity log
   * @route GET /api/notifications/history
   * @access Protected (user)
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {number} [req.query.page=1] - Page number for pagination
   * @param {number} [req.query.limit=20] - Number of records per page (max 100)
   * @param {string} [req.query.type] - Filter by notification type
   * @param {string} [req.query.status] - Filter by notification status
   * @param {Object} res - Express response object
   * @returns {Object} Success response with paginated notification history
   * @example
   * GET /api/notifications/history?page=1&limit=10&type=email&status=success
   */
  static async getHistory(req, res) {
    try {
      const { page = 1, limit = 20, type, status } = req.query;
      
      const filter = {};
      if (type) filter.type = type;
      if (status) filter.status = status;
      
      const skip = (page - 1) * limit;
      
      const [history, total] = await Promise.all([
        NotificationHistory.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('sentBy', 'email displayName')
          .lean(),
        NotificationHistory.countDocuments(filter)
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          history,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting notification history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification history'
      });
    }
  }

  /**
   * Send test notification to verify system functionality
   * Useful for debugging and system health checks
   * @route POST /api/notifications/test
   * @access Protected (user)
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user from middleware
   * @param {string} req.user.uid - Firebase user ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.type='test'] - Test notification type
   * @param {Object} res - Express response object
   * @returns {Object} Success response with test notification result
   * @example
   * POST /api/notifications/test
   * Body: { "type": "test" }
   */
  static async testNotification(req, res) {
    try {
      const { uid } = req.user;
      const { type = 'test' } = req.body;
      
      // Get user info from Firebase
      const userRecord = await admin.auth().getUser(uid);
      
      if (!userRecord.email) {
        return res.status(400).json({
          success: false,
          message: 'User email not found in Firebase authentication'
        });
      }
      
      // Send test notification
      const notificationOrchestrator = new NotificationOrchestrator();
      const result = await notificationOrchestrator.sendNotificationToUser(uid, type, 'This is a test notification from the Cubicle Management System');
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Test notification sent successfully'
      });
    } catch (error) {
      logger.error(`Error sending test notification to user ${req.user.uid}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification'
      });
    }
  }

  /**
   * Send individual cubicle sequence notification to current user
   * Optionally filtered by a specific date for targeted reporting
   * @route POST /api/notifications/send-individual
   * @access Protected (user)
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user from middleware
   * @param {string} req.user.uid - Firebase user ID
   * @param {Object} req.body - Request body
   * @param {string} [req.body.date] - Optional date filter (YYYY-MM-DD format)
   * @param {Object} res - Express response object
   * @returns {Object} Success response with notification result
   * @example
   * POST /api/notifications/send-individual
   * Body: { "date": "2025-06-14" }
   * Response: { success: true, message: "Individual notification sent successfully for date 2025-06-14" }
   */
  static async sendIndividualNotification(req, res) {
    try {
      const { uid } = req.user;
      const { date } = req.body;
      
      // Validate date format if provided
      if (date && !isValidDateFormat(date)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD format (e.g., 2025-06-14).'
        });
      }
      
      const notificationOrchestrator = new NotificationOrchestrator();
      const result = await notificationOrchestrator.sendIndividualCubicleSequenceNotification(uid, uid, date);
      
      res.status(200).json({
        success: true,
        data: result,
        message: date 
          ? `Individual notification sent successfully for date ${date}`
          : 'Individual notification sent successfully'
      });
    } catch (error) {
      logger.error(`Error sending individual notification to user ${req.user.uid}${req.body.date ? ` for date ${req.body.date}` : ''}:`, error);
      res.status(500).json({
        success: false,
        message: 'Failed to send individual notification'
      });
    }
  }

  // Get notification statistics
  static async getStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const filter = {};
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }
      
      const [
        totalNotifications,
        successfulNotifications,
        failedNotifications,
        typeStats,
        recentActivity
      ] = await Promise.all([
        NotificationHistory.countDocuments(filter),
        NotificationHistory.countDocuments({ ...filter, status: 'success' }),
        NotificationHistory.countDocuments({ ...filter, status: 'error' }),
        NotificationHistory.aggregate([
          { $match: filter },
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        NotificationHistory.find(filter)
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('sentBy', 'email displayName')
          .lean()
      ]);
      
      res.status(200).json({
        success: true,
        data: {
          summary: {
            total: totalNotifications,
            successful: successfulNotifications,
            failed: failedNotifications,
            successRate: totalNotifications > 0 ? ((successfulNotifications / totalNotifications) * 100).toFixed(2) : 0
          },
          typeBreakdown: typeStats,
          recentActivity
        }
      });
    } catch (error) {
      logger.error('Error getting notification statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification statistics'
      });
    }
  }
}

// ================================================================================
// INPUT VALIDATION MIDDLEWARE
// ================================================================================

/**
 * Validation rules for updating notification settings
 */
const validateUpdateSettings = [
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('emailNotifications must be a boolean'),
  body('slackNotifications')
    .optional()
    .isBoolean()
    .withMessage('slackNotifications must be a boolean')
];

/**
 * Validation rules for sending individual notifications
 */
const validateSendNotification = [
  body('targetUserId')
    .notEmpty()
    .withMessage('Target user ID is required')
    .isString()
    .withMessage('Target user ID must be a string'),
  body('type')
    .optional()
    .isString()
    .withMessage('Type must be a string'),
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isString()
    .withMessage('Message must be a string')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
];

/**
 * Validation rules for bulk notifications
 */
const validateBulkNotification = [
  body('type')
    .optional()
    .isString()
    .withMessage('Type must be a string'),
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isString()
    .withMessage('Message must be a string')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
];

/**
 * Validation rules for notification history queries
 */
const validateHistoryQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isString()
    .withMessage('Type must be a string'),
  query('status')
    .optional()
    .isIn(['success', 'error', 'warning', 'pending'])
    .withMessage('Status must be one of: success, error, warning, pending')
];

/**
 * Validation rules for statistics queries
 */
const validateStatisticsQuery = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

// ================================================================================
// API ROUTES WITH VALIDATION
// ================================================================================

// Get user notification settings
router.get('/settings', validarUsuario, NotificationController.getSettings);

// Update user notification settings with validation
router.put('/settings', 
  validarUsuario, 
  validateUpdateSettings, 
  NotificationController.updateSettings
);

// Send individual notification with validation
router.post('/send', 
  ...rateLimiterCombinations.notificationOperation,
  validarUsuario, 
  validateSendNotification, 
  NotificationController.sendNotification
);

// Send cubicle sequence notification to self
router.post('/send-individual', 
  ...rateLimiterCombinations.notificationOperation,
  validarUsuario, 
  NotificationController.sendIndividualNotification
);

// Send bulk notifications (admin only) with validation
router.post('/send-bulk', 
  ...rateLimiterCombinations.adminOperation,
  validarUsuario, 
  validarAdmin, 
  validateBulkNotification, 
  NotificationController.sendBulkNotifications
);

// Get users with cubicles (admin only) - now restricted
router.get('/users-with-cubicles', 
  rateLimiters.admin,
  validarUsuario, 
  validarAdmin, 
  NotificationController.getUsersWithCubicles
);

// Get notification history with validation
router.get('/history', 
  rateLimiters.api,
  validarUsuario, 
  validateHistoryQuery, 
  NotificationController.getHistory
);

// Send test notification
router.post('/test', 
  ...rateLimiterCombinations.notificationOperation,
  validarUsuario, 
  NotificationController.testNotification
);

// Get notification statistics (admin only) with validation
router.get('/statistics', 
  validarUsuario, 
  validarAdmin, 
  validateStatisticsQuery, 
  NotificationController.getStatistics
);

module.exports = router;
