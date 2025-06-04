// Assisted by watsonx Code Assistant 
/**
 * UtilizationReport model
 * @module UtilizationReport
 */

/**
 * UtilizationReport schema
 * @typedef UtilizationReport
 * @type {object}
 * @property {Date} weekStartDate - The start date of the week
 * @property {Date} weekEndDate - The end date of the week
 * @property {Date} generatedAt - When the report was generated
 * @property {object} summary - Summary statistics for the week
 * @property {object} daily - Daily breakdown
 * @property {object} sections - Section analysis
 * @property {Array} users - User activity during the week
 * @property {object} advanced - Advanced analytics
 */

const mongoose = require('mongoose');

const utilizationReportSchema = new mongoose.Schema({
  weekStartDate: { type: Date, required: true, index: true },
  weekEndDate: { type: Date, required: true },
  generatedAt: { type: Date, default: Date.now },
  
  // Summary statistics
  summary: {
    totalCubicles: { type: Number, default: 0 },
    avgUtilization: { type: Number, default: 0 },
    peakUtilization: { type: Number, default: 0 },
    lowestUtilization: { type: Number, default: 0 },
    totalReservations: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    errorIncidents: { type: Number, default: 0 }
  },
  
  // Daily breakdown (7 days)
  daily: [{
    date: { type: Date, required: true },
    dayOfWeek: { type: String, required: true },
    reserved: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    error: { type: Number, default: 0 },
    utilizationPercent: { type: Number, default: 0 },
    reservations: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 }
  }],
  
  // Section analysis
  sections: [{
    section: { type: String, required: true },
    totalCubicles: { type: Number, default: 0 },
    avgUtilization: { type: Number, default: 0 },
    peakUtilization: { type: Number, default: 0 },
    totalReservations: { type: Number, default: 0 },
    errorIncidents: { type: Number, default: 0 }
  }],
  
  // User activity
  users: [{
    email: { type: String, required: true },
    displayName: { type: String },
    totalReservations: { type: Number, default: 0 },
    daysActive: { type: Number, default: 0 },
    favoriteSection: { type: String },
    avgDailyReservations: { type: Number, default: 0 },
    cubicleSequence: { type: String, default: '' }
  }],
  
  // Advanced analytics
  advanced: {
    peakHours: [{ 
      hour: { type: Number },
      utilizationPercent: { type: Number }
    }],
    trendAnalysis: {
      weekOverWeekChange: { type: Number, default: 0 },
      utilizationTrend: { type: String, enum: ['increasing', 'decreasing', 'stable'], default: 'stable' },
      predictedNextWeek: { type: Number, default: 0 }
    },
    efficiency: {
      spaceTurnover: { type: Number, default: 0 },
      averageSessionDuration: { type: Number, default: 0 },
      utilizationEfficiency: { type: Number, default: 0 }
    }
  }
});

// Create compound index for week queries (removed unique constraint to allow updates)
utilizationReportSchema.index({ weekStartDate: 1, weekEndDate: 1 });

module.exports = mongoose.model('UtilizationReport', utilizationReportSchema);
