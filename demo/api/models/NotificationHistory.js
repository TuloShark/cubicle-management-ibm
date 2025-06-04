const mongoose = require('mongoose');

/**
 * NotificationHistory model
 * Tracks all notification activities
 */
const NotificationHistorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  type: { 
    type: String, 
    required: true,
    enum: ['email', 'slack', 'monday', 'individual', 'bulk', 'system']
  },
  status: { 
    type: String, 
    required: true,
    enum: ['success', 'error', 'warning', 'pending'],
    default: 'pending'
  },
  message: { 
    type: String, 
    required: true 
  },
  recipients: [{ 
    type: String 
  }],
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  error: {
    type: String
  },
  sentBy: {
    uid: String,
    email: String,
    displayName: String
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  // Metadata for tracking
  metadata: {
    cubicleCount: Number,
    userCount: Number,
    utilizationRate: Number,
    reportId: String,
    taskId: String,
    integrationData: mongoose.Schema.Types.Mixed
  }
});

// Index for efficient querying
NotificationHistorySchema.index({ timestamp: -1, type: 1 });
NotificationHistorySchema.index({ 'sentBy.uid': 1, timestamp: -1 });

module.exports = mongoose.model('NotificationHistory', NotificationHistorySchema);
