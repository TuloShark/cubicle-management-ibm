const express = require('express');
const router = express.Router();
const NotificationService = require('../services/NotificationService');
const NotificationSettings = require('../models/NotificationSettings');
const NotificationHistory = require('../models/NotificationHistory');
const admin = require('../firebase');
const { validarUsuario, validarAdmin } = require('../middleware/auth');

class NotificationController {
  // Get notification settings for a user
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
          slackEnabled: false,
          mondayEnabled: false
        });
        await settings.save();
      }
      
      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting notification settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification settings',
        error: error.message
      });
    }
  }

  // Update notification settings for a user
  static async updateSettings(req, res) {
    try {
      const { uid } = req.user;
      const { emailNotifications, slackNotifications, mondayComNotifications } = req.body;
      
      const settings = await NotificationSettings.findOneAndUpdate(
        { userId: uid },
        {
          emailNotifications,
          slackNotifications,
          mondayComNotifications,
          updatedAt: new Date()
        },
        { new: true, upsert: true }
      );
      
      res.status(200).json({
        success: true,
        data: settings,
        message: 'Notification settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notification settings',
        error: error.message
      });
    }
  }

  // Send notification to a specific user
  static async sendNotification(req, res) {
    try {
      const { uid } = req.user;
      const { targetUserId, type = 'custom', message } = req.body;
      
      if (!targetUserId) {
        return res.status(400).json({
          success: false,
          message: 'Target user ID is required'
        });
      }
      
      const result = await NotificationService.sendNotificationToUser(targetUserId, type, message);
      
      // Log the notification
      await NotificationService.logNotification(
        uid,
        [targetUserId],
        type,
        'individual',
        result.success
      );
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Notification sent successfully'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: error.message
      });
    }
  }

  // Send bulk notifications to all users
  static async sendBulkNotifications(req, res) {
    try {
      const { uid } = req.user;
      const { type = 'bulk', message } = req.body;
      
      const notificationService = new NotificationService();
      const result = await notificationService.sendBulkNotifications(type, message, uid);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Bulk notifications sent successfully'
      });
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send bulk notifications',
        error: error.message
      });
    }
  }

  // Get all users with their cubicle sequences
  static async getUsersWithCubicles(req, res) {
    try {
      const notificationService = new NotificationService();
      const users = await notificationService.getUsersWithCubicleSequences();
      
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error getting users with cubicles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users with cubicles',
        error: error.message
      });
    }
  }

  // Get notification history
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
      console.error('Error getting notification history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification history',
        error: error.message
      });
    }
  }

  // Test notification functionality
  static async testNotification(req, res) {
    try {
      const { uid } = req.user;
      const { type = 'test' } = req.body;
      
      // Get user info from Firebase
      const userRecord = await admin.auth().getUser(uid);
      
      if (!userRecord.email) {
        return res.status(400).json({
          success: false,
          message: 'User email not found'
        });
      }
      
      // Send test notification
      const result = await NotificationService.sendNotificationToUser(uid, type, 'This is a test notification');
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Test notification sent successfully'
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: error.message
      });
    }
  }

  // Send individual notification to current user
  static async sendIndividualNotification(req, res) {
    try {
      const { uid } = req.user;
      
      const notificationService = new NotificationService();
      const result = await notificationService.sendIndividualCubicleSequenceNotification(uid, uid);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'Individual notification sent successfully'
      });
    } catch (error) {
      console.error('Error sending individual notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send individual notification',
        error: error.message
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
        NotificationHistory.countDocuments({ ...filter, status: 'sent' }),
        NotificationHistory.countDocuments({ ...filter, status: 'failed' }),
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
      console.error('Error getting notification statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification statistics',
        error: error.message
      });
    }
  }
}

// API Routes
router.get('/settings', validarUsuario, NotificationController.getSettings);
router.put('/settings', validarUsuario, NotificationController.updateSettings);
router.post('/send', validarUsuario, NotificationController.sendNotification);
router.post('/send-individual', validarUsuario, NotificationController.sendIndividualNotification);
router.post('/send-bulk', validarUsuario, validarAdmin, NotificationController.sendBulkNotifications);
router.get('/users-with-cubicles', validarUsuario, NotificationController.getUsersWithCubicles);
router.get('/history', validarUsuario, NotificationController.getHistory);
router.post('/test', validarUsuario, NotificationController.testNotification);
router.get('/statistics', validarUsuario, validarAdmin, NotificationController.getStatistics);

module.exports = router;
