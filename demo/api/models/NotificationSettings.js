const mongoose = require('mongoose');

/**
 * NotificationSettings model
 * Stores user notification preferences
 */
const NotificationSettingsSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  email: { 
    type: String, 
    required: true 
  },
  emailEnabled: { 
    type: Boolean, 
    default: true 
  },
  slackEnabled: { 
    type: Boolean, 
    default: true 
  },
  mondayEnabled: { 
    type: Boolean, 
    default: true 
  },
  frequency: { 
    type: String, 
    enum: ['realtime', 'hourly', 'daily', 'weekly'], 
    default: 'daily' 
  },
  lastNotification: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
NotificationSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('NotificationSettings', NotificationSettingsSchema);
