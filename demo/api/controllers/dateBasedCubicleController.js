const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();

// Internal dependencies
const Cubicle = require('../models/Cubicle');
const Reservation = require('../models/Reservation');
const CubicleGridDate = require('../models/CubicleGridDate');
const { validarUsuario, validarAdmin } = require('../middleware/auth');

/**
 * @file dateBasedCubicleController.js
 * Express router for date-based cubicle management endpoints.
 * Handles multiple grids based on dates, grid cleanup, and date-specific operations.
 */

/**
 * GET /api/cubicles/date/:dateString
 * Get all cubicles with their reservation status for a specific date
 * @route GET /api/cubicles/date/:dateString
 * @access Protected (user)
 */
router.get('/date/:dateString', validarUsuario, [
  param('dateString').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { dateString } = req.params;
    
    // Get all cubicles
    const cubicles = await Cubicle.find().lean();
    
    // Get reservations for this specific date
    const reservations = await Reservation.find({ dateString }).populate('cubicle').lean();
    
    // Create a map of cubicle ID to reservation info
    const reservationMap = {};
    reservations.forEach(reservation => {
      if (reservation.cubicle) {
        reservationMap[reservation.cubicle._id.toString()] = {
          user: reservation.user,
          date: reservation.date,
          dateString: reservation.dateString
        };
      }
    });
    
    // Enhance cubicles with reservation info for this date
    const enhancedCubicles = cubicles.map(cubicle => {
      const reservation = reservationMap[cubicle._id.toString()];
      return {
        ...cubicle,
        status: reservation ? 'reserved' : 'available', // Override status based on date
        reservedByUser: reservation ? reservation.user : null,
        reservationDate: reservation ? reservation.date : null
      };
    });
    
    // Only create or update grid date tracking if there are actual reservations
    // This prevents empty grids from being created automatically
    if (reservations.length > 0) {
      await CubicleGridDate.findOrCreate(dateString);
    }
    
    res.json({
      date: dateString,
      cubicles: enhancedCubicles,
      totalReservations: reservations.length
    });
  } catch (err) {
    console.error('Error fetching cubicles for date:', err);
    res.status(500).json({ error: 'Error fetching cubicles for date', details: err.message });
  }
});

/**
 * POST /api/cubicles/reserve-for-date
 * Reserve a cubicle for a specific date
 * @route POST /api/cubicles/reserve-for-date
 * @access Protected (user)
 */
router.post('/reserve-for-date', validarUsuario, [
  body('cubicleId').isMongoId().withMessage('Valid cubicle ID required'),
  body('dateString').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { cubicleId, dateString } = req.body;
    
    // Check if cubicle exists
    const cubicle = await Cubicle.findById(cubicleId);
    if (!cubicle) {
      return res.status(404).json({ error: 'Cubicle not found' });
    }
    
    // Check if cubicle is already reserved for this date
    const existingReservation = await Reservation.findOne({ 
      cubicle: cubicleId, 
      dateString 
    });
    
    if (existingReservation) {
      return res.status(400).json({ 
        error: 'Cubicle already reserved for this date',
        reservedBy: existingReservation.user.email
      });
    }
    
    // Create reservation
    const userInfo = {
      uid: req.user.uid,
      email: req.user.email,
      displayName: req.user.name || req.user.displayName || null
    };
    
    const reservation = new Reservation({
      cubicle: cubicleId,
      user: userInfo,
      date: new Date(dateString + 'T00:00:00.000Z'),
      dateString
    });
    
    await reservation.save();
    
    // Update grid date tracking
    await CubicleGridDate.updateReservationCount(dateString);
    
    // Emit statistics update for real-time updates
    const io = req.app.get('io');
    const emitStatisticsUpdate = req.app.get('emitStatisticsUpdate');
    if (io && emitStatisticsUpdate) {
      try {
        await emitStatisticsUpdate();
        console.log('[DATE RESERVATION] Statistics update emitted');
      } catch (err) {
        console.error('[DATE RESERVATION] Error emitting statistics update:', err);
      }
    }
    
    res.json({
      message: 'Cubicle reserved successfully',
      reservation: {
        cubicle: cubicle,
        user: userInfo,
        date: reservation.date,
        dateString: reservation.dateString
      }
    });
    
  } catch (err) {
    console.error('Error reserving cubicle for date:', err);
    res.status(500).json({ error: 'Error reserving cubicle for date', details: err.message });
  }
});

/**
 * DELETE /api/cubicles/release-for-date
 * Release a cubicle reservation for a specific date
 * @route DELETE /api/cubicles/release-for-date
 * @access Protected (user)
 */
router.delete('/release-for-date', validarUsuario, [
  body('cubicleId').isMongoId().withMessage('Valid cubicle ID required'),
  body('dateString').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { cubicleId, dateString } = req.body;
    
    // Find the reservation
    const reservation = await Reservation.findOne({ 
      cubicle: cubicleId, 
      dateString 
    });
    
    if (!reservation) {
      return res.status(404).json({ error: 'No reservation found for this cubicle on this date' });
    }
    
    // Check if user can release this reservation (own reservation or admin)
    const isAdmin = req.user.isAdmin || false; // Assuming admin flag exists
    const canRelease = reservation.user.uid === req.user.uid || isAdmin;
    
    if (!canRelease) {
      return res.status(403).json({ error: 'You can only release your own reservations' });
    }
    
    // Delete the reservation
    await Reservation.deleteOne({ _id: reservation._id });
    
    // Update grid date tracking
    await CubicleGridDate.updateReservationCount(dateString);
    
    // Emit statistics update for real-time updates
    const io = req.app.get('io');
    const emitStatisticsUpdate = req.app.get('emitStatisticsUpdate');
    if (io && emitStatisticsUpdate) {
      try {
        await emitStatisticsUpdate();
        console.log('[DATE RELEASE] Statistics update emitted');
      } catch (err) {
        console.error('[DATE RELEASE] Error emitting statistics update:', err);
      }
    }
    
    res.json({ message: 'Reservation released successfully' });
    
  } catch (err) {
    console.error('Error releasing cubicle reservation for date:', err);
    res.status(500).json({ error: 'Error releasing cubicle reservation for date', details: err.message });
  }
});

/**
 * GET /api/cubicles/grid-dates
 * Get all dates that have active grids (with reservations)
 * @route GET /api/cubicles/grid-dates
 * @access Protected (user)
 */
router.get('/grid-dates', validarUsuario, async (req, res) => {
  try {
    const gridDates = await CubicleGridDate.find({ isActive: true })
      .sort({ date: -1 })
      .limit(30) // Limit to last 30 active dates
      .lean();
    
    res.json(gridDates);
  } catch (err) {
    console.error('Error fetching grid dates:', err);
    res.status(500).json({ error: 'Error fetching grid dates', details: err.message });
  }
});

/**
 * POST /api/cubicles/cleanup-empty-grids
 * Cleanup grids that have no reservations (admin only)
 * @route POST /api/cubicles/cleanup-empty-grids
 * @access Protected (admin)
 */
router.post('/cleanup-empty-grids', validarUsuario, validarAdmin, async (req, res) => {
  try {
    // Find grid dates with no reservations
    const emptyGrids = await CubicleGridDate.find({ 
      totalReservations: 0,
      isActive: true 
    });
    
    const cleanedDates = [];
    for (const gridDate of emptyGrids) {
      // Double-check that there are no reservations
      const reservationCount = await Reservation.countDocuments({ 
        dateString: gridDate.dateString 
      });
      
      if (reservationCount === 0) {
        gridDate.isActive = false;
        await gridDate.save();
        cleanedDates.push(gridDate.dateString);
      }
    }
    
    res.json({
      message: `Cleaned up ${cleanedDates.length} empty grids`,
      cleanedDates
    });
    
  } catch (err) {
    console.error('Error cleaning up empty grids:', err);
    res.status(500).json({ error: 'Error cleaning up empty grids', details: err.message });
  }
});

/**
 * GET /api/cubicles/date-statistics/:dateString
 * Get statistics for a specific date
 * @route GET /api/cubicles/date-statistics/:dateString
 * @access Protected (user)
 */
router.get('/date-statistics/:dateString', validarUsuario, [
  param('dateString').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { dateString } = req.params;
    
    // Get all cubicles
    const totalCubicles = await Cubicle.countDocuments();
    
    // Get reservations for this date
    const reservations = await Reservation.find({ dateString }).lean();
    const reservedCount = reservations.length;
    const availableCount = totalCubicles - reservedCount;
    
    // Calculate percentages
    const stats = {
      date: dateString,
      total: totalCubicles,
      reserved: reservedCount,
      available: availableCount,
      percentReserved: totalCubicles ? Math.round((reservedCount / totalCubicles) * 100) : 0,
      percentAvailable: totalCubicles ? Math.round((availableCount / totalCubicles) * 100) : 0
    };
    
    // User statistics for this date
    const userMap = {};
    reservations.forEach(r => {
      if (r.user && r.user.email) {
        userMap[r.user.email] = (userMap[r.user.email] || 0) + 1;
      }
    });
    
    const userStats = Object.entries(userMap).map(([user, count]) => ({
      user,
      reserved: count,
      percent: reservedCount ? Math.round((count / reservedCount) * 100) : 0
    })).sort((a, b) => b.reserved - a.reserved);
    
    res.json({
      general: stats,
      users: userStats
    });
    
  } catch (err) {
    console.error('Error fetching date statistics:', err);
    res.status(500).json({ error: 'Error fetching date statistics', details: err.message });
  }
});

/**
 * POST /api/cubicles/generate-grid
 * Generate/create a new grid for a specific date
 * @route POST /api/cubicles/generate-grid
 * @access Protected (user)
 */
router.post('/generate-grid', validarUsuario, [
  body('dateString').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { dateString } = req.body;
    
    // Check if date is in the future or today (use UTC comparison for consistency)
    const selectedDate = new Date(dateString + 'T00:00:00.000Z');
    const today = new Date();
    // Set today to start of day in UTC
    const todayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (selectedDate < todayUTC) {
      return res.status(400).json({ error: 'Cannot generate grids for past dates' });
    }
    
    // Check if grid already exists for this date
    const existingGrid = await CubicleGridDate.findOne({ dateString });
    if (existingGrid) {
      return res.status(400).json({ 
        error: 'Grid already exists for this date',
        grid: existingGrid 
      });
    }
    
    // Create new grid date tracking entry
    const newGrid = await CubicleGridDate.findOrCreate(dateString);
    
    // Get all cubicles to return the complete grid structure
    const cubicles = await Cubicle.find().lean();
    
    // Since this is a new grid with no reservations, all cubicles are available
    const enhancedCubicles = cubicles.map(cubicle => ({
      ...cubicle,
      status: 'available',
      reservedByUser: null,
      reservationDate: null
    }));
    
    res.json({
      message: 'Grid generated successfully',
      grid: newGrid,
      date: dateString,
      cubicles: enhancedCubicles,
      totalReservations: 0
    });
    
  } catch (err) {
    console.error('Error generating grid:', err);
    res.status(500).json({ error: 'Error generating grid', details: err.message });
  }
});

module.exports = router;
