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
module.exports = mongoose.model('Reservation', new mongoose.Schema({
  cubicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Cubicle', required: true, index: true },
  user: {
    uid: String,
    email: String,
    displayName: String
  },
  date: Date
}));
