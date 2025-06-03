// Assisted by watsonx Code Assistant 
/**
 * Cubicle model
 * @module Cubicle
 */

/**
 * Cubicle schema
 * @typedef Cubicle
 * @type {object}
 * @property {string} section.required - The section of the cubicle
 * @property {number} row.required - The row of the cubicle
 * @property {number} col.required - The column of the cubicle
 * @property {string} serial.required - The unique serial code of the cubicle
 * @property {string} name.required - The name of the cubicle
 * @property {string} status - The status of the cubicle
 * @property {string} description - The description of the cubicle
 */

const mongoose = require('mongoose');
module.exports = mongoose.model('Cubicle', new mongoose.Schema({
  section: { type: String, required: true },
  row: { type: Number, required: true },
  col: { type: Number, required: true },
  serial: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['available','reserved','error'], default: 'available' },
  description: { type: String, default: 'More details about this cubicle will be added later.' }
}));
