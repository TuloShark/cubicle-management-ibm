/**
 * CubicleGridDate model
 * @module CubicleGridDate
 */

/**
 * CubicleGridDate schema
 * Tracks dates that have active grids with reservations
 * Used for managing multiple grids and cleanup of empty grids
 * 
 * @typedef CubicleGridDate
 * @type {object}
 * @property {string} dateString.required - Date in YYYY-MM-DD format
 * @property {Date} date.required - Full date object
 * @property {number} totalReservations - Count of reservations for this date
 * @property {Date} createdAt - When this grid was first created
 * @property {Date} lastActivity - Last time there was activity on this date
 * @property {boolean} isActive - Whether this grid has active reservations
 */

const mongoose = require('mongoose');

const cubicleGridDateSchema = new mongoose.Schema({
  dateString: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    match: /^\d{4}-\d{2}-\d{2}$/ // Ensure YYYY-MM-DD format
  },
  date: { type: Date, required: true, index: true },
  totalReservations: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

// Pre-save hook to automatically set date from dateString
cubicleGridDateSchema.pre('save', function(next) {
  if (this.dateString && !this.date) {
    this.date = new Date(this.dateString + 'T00:00:00.000Z');
  }
  next();
});

// Method to check if grid should be cleaned up (no reservations)
cubicleGridDateSchema.methods.shouldCleanup = function() {
  return this.totalReservations === 0 && this.isActive;
};

// Static method to find or create a grid date
cubicleGridDateSchema.statics.findOrCreate = async function(dateString) {
  let gridDate = await this.findOne({ dateString });
  if (!gridDate) {
    gridDate = new this({
      dateString,
      date: new Date(dateString + 'T00:00:00.000Z'),
      totalReservations: 0,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    });
    await gridDate.save();
  }
  return gridDate;
};

// Static method to update reservation count
cubicleGridDateSchema.statics.updateReservationCount = async function(dateString) {
  const Reservation = require('./Reservation');
  const count = await Reservation.countDocuments({ dateString });
  
  await this.findOneAndUpdate(
    { dateString },
    { 
      totalReservations: count,
      lastActivity: new Date(),
      isActive: count > 0
    },
    { upsert: true, new: true }
  );
  
  return count;
};

module.exports = mongoose.model('CubicleGridDate', cubicleGridDateSchema);
