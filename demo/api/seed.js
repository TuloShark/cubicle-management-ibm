// Assisted by watsonx Code Assistant 
/**
 * Module dependencies.
 */
const mongoose = require('mongoose');
const logger = require('./logger');
const Cubicle = require('./models/Cubicle');

/**
 * Connect to MongoDB.
 */
mongoose.connect(process.env.MONGO_URI).then(async () => {
  /**
   * Delete all cubicles.
   */
  await Cubicle.deleteMany({});

  /**
   * Insert cubicles.
   */
  await Cubicle.insertMany([
    { section: 'A', row: 1, col: 1, serial: 'A-101', name: 'A-101' },
    { section: 'A', row: 1, col: 2, serial: 'A-102', name: 'A-102' },
    { section: 'B', row: 2, col: 1, serial: 'B-201', name: 'B-201' },
    { section: 'B', row: 2, col: 2, serial: 'B-202', name: 'B-202' }
  ]);

  logger.info('Seeded cubicles');
  process.exit();
}).catch(err => { logger.error(err); });
