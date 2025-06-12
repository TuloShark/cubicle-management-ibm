const express = require('express');
const { param, body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const Cubicle = require('../models/Cubicle');
const Reservation = require('../models/Reservation');
const { validarUsuario, validarAdmin } = require('../middleware/auth');
const logger = require('../logger');

/**
 * @fileoverview Date-based Cubicle Controller
 * @description Handles cubicle operations for specific dates with proper validation, 
 * security, and performance optimizations
 * @version 2.0.0
 * @author Cubicle Management System
 */

// Rate limiting for reservation operations
const reservationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 reservation requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reservation requests. Please try again later.' }
});

/**
 * Utility function to create date range for a given date
 * Centralizes date parsing logic and handles timezone consistently
 * @param {Date} targetDate - The target date
 * @returns {Object} Object containing startOfDay and endOfDay dates
 */
function createDateRange(targetDate) {
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
}

/**
 * Utility function to format date consistently
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
function formatDateString(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Utility function to validate date is not in the past (except today)
 * @param {Date} date - Date to validate
 * @returns {boolean} True if date is valid for reservations
 */
function isValidReservationDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

/**
 * GET /date/:date
 * Get all cubicles with their status for a specific date
 * @route GET /api/cubicles/date/:date
 * @access Protected (user)
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {Object} Cubicles with date-specific status
 */
router.get('/date/:date', [
  validarUsuario,
  param('date').isISO8601().toDate().custom((value) => {
    if (isNaN(value.getTime())) {
      throw new Error('Invalid date format');
    }
    return true;
  }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const targetDate = req.params.date;
    const { startOfDay, endOfDay } = createDateRange(targetDate);

    // Optimized parallel queries
    const [cubicles, reservations] = await Promise.all([
      Cubicle.find().sort({ section: 1, row: 1, col: 1 }).lean(),
      Reservation.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).populate('cubicle', 'section row col').lean()
    ]);

    // Create efficient map for O(1) lookup
    const reservationMap = new Map();
    reservations.forEach(reservation => {
      if (reservation.cubicle) {
        reservationMap.set(reservation.cubicle._id.toString(), {
          user: reservation.user,
          reservationId: reservation._id,
          date: reservation.date
        });
      }
    });

    // Enhance cubicles with reservation status
    const enhancedCubicles = cubicles.map(cubicle => {
      const reservation = reservationMap.get(cubicle._id.toString());
      
      return {
        _id: cubicle._id,
        section: cubicle.section,
        row: cubicle.row,
        col: cubicle.col,
        serial: cubicle.serial,
        name: cubicle.name,
        status: cubicle.status === 'error' ? 'error' : (reservation ? 'reserved' : 'available'),
        reservedByUser: reservation ? reservation.user : null,
        reservationId: reservation ? reservation.reservationId : null
      };
    });

    res.json({
      date: formatDateString(targetDate),
      cubicles: enhancedCubicles,
      summary: {
        total: enhancedCubicles.length,
        available: enhancedCubicles.filter(c => c.status === 'available').length,
        reserved: enhancedCubicles.filter(c => c.status === 'reserved').length,
        error: enhancedCubicles.filter(c => c.status === 'error').length
      }
    });

  } catch (error) {
    logger.error('Error fetching cubicles for date:', { error: error.message, date: req.params.date });
    res.status(500).json({ error: 'Failed to fetch cubicles for date' });
  }
});

/**
 * GET /stats/date/:date
 * Get comprehensive statistics for a specific date
 * @route GET /api/cubicles/stats/date/:date
 * @access Protected (user)
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {Object} Statistics for the specified date
 */
router.get('/stats/date/:date', [
  validarUsuario,
  param('date').isISO8601().toDate(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const targetDate = req.params.date;
    const { startOfDay, endOfDay } = createDateRange(targetDate);

    // Optimized parallel queries with lean() for better performance
    const [cubicles, reservations] = await Promise.all([
      Cubicle.find().lean(),
      Reservation.find({
        date: { $gte: startOfDay, $lte: endOfDay }
      }).populate('cubicle', 'section').lean()
    ]);

    const stats = {
      date: formatDateString(targetDate),
      general: {
        total: cubicles.length,
        reserved: reservations.length,
        available: cubicles.length - reservations.length,
        error: cubicles.filter(c => c.status === 'error').length,
        percentReserved: cubicles.length > 0 ? Math.round((reservations.length / cubicles.length) * 100) : 0
      },
      sections: ['A', 'B', 'C'].map(section => {
        const sectionCubicles = cubicles.filter(c => c.section === section);
        const sectionReservations = reservations.filter(r => r.cubicle?.section === section);
        
        return {
          section,
          total: sectionCubicles.length,
          reserved: sectionReservations.length,
          available: sectionCubicles.length - sectionReservations.length,
          percentReserved: sectionCubicles.length > 0 
            ? Math.round((sectionReservations.length / sectionCubicles.length) * 100) 
            : 0
        };
      }),
      users: Object.entries(
        reservations.reduce((acc, r) => {
          if (r.user?.email) {
            const email = r.user.email;
            acc[email] = (acc[email] || 0) + 1;
          }
          return acc;
        }, {})
      ).map(([email, count]) => ({
        email: email.split('@')[0], // Privacy: show only username part
        reserved: count,
        percent: reservations.length > 0 ? Math.round((count / reservations.length) * 100) : 0
      })).sort((a, b) => b.reserved - a.reserved),
      timestamp: new Date().toISOString()
    };

    res.json(stats);

  } catch (error) {
    logger.error('Error fetching statistics for date:', { error: error.message, date: req.params.date });
    res.status(500).json({ error: 'Failed to fetch statistics for date' });
  }
});

/**
 * POST /reserve/date/:date
 * Reserve a cubicle for a specific date
 * @route POST /api/cubicles/reserve/date/:date
 * @access Protected (user) + Rate Limited
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @param {string} cubicleId - MongoDB ObjectId of the cubicle
 * @returns {Object} Reservation confirmation
 */
router.post('/reserve/date/:date', [
  reservationLimiter,
  validarUsuario,
  param('date').isISO8601().toDate().custom((value) => {
    if (!isValidReservationDate(value)) {
      throw new Error('Cannot reserve cubicles for past dates');
    }
    return true;
  }),
  body('cubicleId').isMongoId().withMessage('Invalid cubicle ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cubicleId } = req.body;
    const targetDate = req.params.date;
    const { startOfDay, endOfDay } = createDateRange(targetDate);

    // Check cubicle exists and validate status
    const cubicle = await Cubicle.findById(cubicleId).lean();
    if (!cubicle) {
      return res.status(404).json({ error: 'Cubicle not found' });
    }

    if (cubicle.status === 'error') {
      return res.status(400).json({ error: 'Cubicle is in maintenance mode' });
    }

    // Check for existing reservation (atomic operation)
    const existingReservation = await Reservation.findOne({
      cubicle: cubicleId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    if (existingReservation) {
      return res.status(409).json({ 
        error: 'Cubicle already reserved for this date',
        conflictWith: existingReservation.user.email
      });
    }

    // Create reservation with user info from authenticated token
    const userInfo = {
      uid: req.user.uid,
      email: req.user.email,
      displayName: req.user.name || req.user.displayName || null
    };

    const reservation = new Reservation({
      cubicle: cubicleId,
      user: userInfo,
      date: new Date(targetDate)
    });

    await reservation.save();
    await reservation.populate('cubicle', 'section row col serial name');

    // Emit real-time update (safe operation - no await)
    const io = req.app.get('io');
    if (io) {
      io.emit('dateReservationUpdate', {
        date: formatDateString(targetDate),
        cubicleId,
        status: 'reserved',
        user: userInfo
      });
    }

    logger.info('Cubicle reserved successfully', { 
      cubicleId, 
      cubicleSerial: reservation.cubicle.serial,
      date: formatDateString(targetDate),
      user: userInfo.email 
    });

    res.status(201).json({
      message: 'Cubicle reserved successfully',
      reservation: {
        id: reservation._id,
        cubicle: reservation.cubicle,
        user: userInfo,
        date: formatDateString(targetDate)
      }
    });

  } catch (error) {
    logger.error('Error reserving cubicle:', { 
      error: error.message, 
      cubicleId: req.body.cubicleId,
      date: req.params.date,
      user: req.user?.email 
    });
    
    if (error.code === 11000) { // MongoDB duplicate key error
      return res.status(409).json({ error: 'Cubicle already reserved for this date' });
    }
    
    res.status(500).json({ error: 'Failed to reserve cubicle' });
  }
});

/**
 * DELETE /reservation/:reservationId
 * Cancel a reservation (owner or admin only)
 * @route DELETE /api/cubicles/reservation/:reservationId
 * @access Protected (user - owner or admin)
 * @param {string} reservationId - MongoDB ObjectId of the reservation
 * @returns {Object} Cancellation confirmation
 */
router.delete('/reservation/:reservationId', [
  validarUsuario,
  param('reservationId').isMongoId().withMessage('Invalid reservation ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reservationId } = req.params;
    const reservation = await Reservation.findById(reservationId)
      .populate('cubicle', 'section row col serial name')
      .lean();

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Enhanced authorization check using JWT claims
    const isOwner = reservation.user.uid === req.user.uid;
    const isAdmin = req.user.admin === true; // Proper boolean check

    if (!isOwner && !isAdmin) {
      logger.warn('Unauthorized reservation cancellation attempt', {
        reservationId,
        requestUser: req.user.email,
        reservationOwner: reservation.user.email
      });
      return res.status(403).json({ error: 'Not authorized to cancel this reservation' });
    }

    // Perform deletion
    await Reservation.findByIdAndDelete(reservationId);

    const reservationDate = formatDateString(reservation.date);
    const cubicleId = reservation.cubicle._id.toString();

    // Emit real-time update (non-blocking)
    const io = req.app.get('io');
    if (io) {
      io.emit('dateReservationUpdate', {
        date: reservationDate,
        cubicleId,
        status: 'available',
        reservation: null
      });
    }

    logger.info('Reservation cancelled successfully', { 
      reservationId, 
      cubicleSerial: reservation.cubicle.serial,
      date: reservationDate,
      cancelledBy: req.user.email,
      originalOwner: reservation.user.email
    });

    res.json({ 
      message: 'Reservation cancelled successfully',
      details: {
        date: reservationDate,
        cubicle: reservation.cubicle,
        cancelledBy: req.user.email
      }
    });

  } catch (error) {
    logger.error('Error cancelling reservation:', { 
      error: error.message, 
      reservationId: req.params.reservationId,
      user: req.user?.email 
    });
    res.status(500).json({ error: 'Failed to cancel reservation' });
  }
});

/**
 * GET /reservations/date/:date
 * Get all reservations for a specific date (admin only)
 * @route GET /api/cubicles/reservations/date/:date
 * @access Protected (admin)
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {Object} All reservations for the specified date
 */
router.get('/reservations/date/:date', [
  validarUsuario,
  validarAdmin,
  param('date').isISO8601().toDate(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const targetDate = req.params.date;
    const { startOfDay, endOfDay } = createDateRange(targetDate);

    const reservations = await Reservation.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate('cubicle', 'section row col serial name status')
    .sort({ 'cubicle.section': 1, 'cubicle.row': 1, 'cubicle.col': 1 })
    .lean();

    // Format response with privacy considerations
    const formattedReservations = reservations.map(r => ({
      id: r._id,
      cubicle: r.cubicle,
      user: {
        email: r.user.email,
        displayName: r.user.displayName
      },
      reservedAt: r.createdAt || r.date,
      date: formatDateString(r.date)
    }));

    res.json({
      date: formatDateString(targetDate),
      reservations: formattedReservations,
      summary: {
        total: formattedReservations.length,
        sections: ['A', 'B', 'C'].map(section => ({
          section,
          count: formattedReservations.filter(r => r.cubicle.section === section).length
        }))
      }
    });

  } catch (error) {
    logger.error('Error fetching reservations for date:', { 
      error: error.message, 
      date: req.params.date,
      adminUser: req.user?.email 
    });
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

module.exports = router;
