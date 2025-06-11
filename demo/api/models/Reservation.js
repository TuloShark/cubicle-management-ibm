// Assisted by watsonx Code Assistant 
/**
 * Reservation model
 * @module Reservation
 */

/**
 * Reservation schema
 * @typedef Reservation
 * @type {object}
 * @property {string} cubicle - The ID of the cubicle associated with the reservation
 * @property {object} user - The user associated with the reservation
 * @property {string} user.uid - The unique ID of the user
 * @property {string} user.email - The email of the user
 * @property {string} user.displayName - The display name of the user
 * @property {Date} date - The date of the reservation
 */

const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  cubicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Cubicle', required: true, index: true },
  user: {
    uid: String,
    email: String,
    displayName: String
  },
  date: { type: Date, required: true, index: true },
  // Date string in YYYY-MM-DD format for easy querying
  dateString: { type: String, required: true, index: true }
});

// Create compound index for efficient date + cubicle queries
reservationSchema.index({ dateString: 1, cubicle: 1 }, { unique: true });

// Pre-save hook to automatically set dateString
reservationSchema.pre('save', function(next) {
  if (this.date) {
    const dateObj = new Date(this.date);
    this.dateString = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  next();
});

module.exports = mongoose.model('Reservation', reservationSchema);
