// Group external imports first, then internal
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();

// Internal dependencies
const Cubicle = require('../models/Cubicle');
const Reservation = require('../models/Reservation');
const { validarUsuario, validarAdmin } = require('../middleware/auth');
const { getAdminUids } = require('../utils/adminUtils');

/**
 * @file cubicleController.js
 * Express router for cubicle and reservation management endpoints.
 */

/**
 * Helper to emit statistics update
 */
async function emitStatisticsUpdate(io) {
  const stats = await getStatistics();
  io.emit('statisticsUpdate', stats);
}

/**
 * Helper to get statistics (used for websocket updates)
 */
async function getStatistics() {
  const cubicles = await Cubicle.find();
  const reservations = await Reservation.find();
  const total = cubicles.length;
  const reserved = cubicles.filter(c => c.status === 'reserved').length;
  const available = cubicles.filter(c => c.status === 'available').length;
  const error = cubicles.filter(c => c.status === 'error').length;

  // General stats
  const general = {
    percentReserved: total ? Math.round((reserved / total) * 100) : 0,
    percentAvailable: total ? Math.round((available / total) * 100) : 0,
    percentError: total ? Math.round((error / total) * 100) : 0,
  };

  // Per-user stats
  const userMap = {};
  reservations.forEach(r => {
    if (r.user && r.user.email) {
      userMap[r.user.email] = (userMap[r.user.email] || 0) + 1;
    }
  });
  const userStats = Object.entries(userMap).map(([user, reservedCount]) => ({
    user,
    reserved: reservedCount,
    percent: reserved ? Math.round((reservedCount / reserved) * 100) : 0
  }));
  userStats.sort((a, b) => b.reserved - a.reserved);

  // Comparison metrics
  let topUser = userStats[0] || null;
  let bottomUser = userStats.length > 1 ? userStats[userStats.length - 1] : null;
  const comparisons = [];
  if (topUser) comparisons.push({ metric: 'Top User', value: `${topUser.user} (${topUser.percent}%)` });
  if (bottomUser) comparisons.push({ metric: 'Lowest User', value: `${bottomUser.user} (${bottomUser.percent}%)` });
  comparisons.push({ metric: 'Total Users', value: userStats.length });
  comparisons.push({ metric: 'Total Reservations', value: reserved });

  return { general, users: userStats, comparisons };
}

/**
 * GET /cubicles
 * Get all cubicles (admin or user).
 * @route GET /cubicles
 * @access Protected (user)
 */
router.get('/', validarUsuario, async (req, res) => {
  try {
    const cubicles = await Cubicle.find();
    res.json(cubicles);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching cubicles', details: err.message });
  }
});

/**
 * POST /cubicles
 * Create a new cubicle (admin only).
 * @route POST /cubicles
 * @access Protected (admin)
 */
router.post('/', validarUsuario, validarAdmin, [
  body('section').isString().notEmpty(),
  body('row').isInt({ min: 1 }),
  body('col').isInt({ min: 1 }),
  body('serial').isString().notEmpty(),
  body('name').isString().notEmpty(),
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}, async (req, res) => {
  try {
    const cubicle = new Cubicle(req.body);
    await cubicle.save();
    res.status(201).json(cubicle);
  } catch (err) {
    res.status(400).json({ error: 'Error creating cubicle', details: err.message });
  }
});

/**
 * PUT /cubicles/:id
 * Update a cubicle's state (admin or user).
 * Handles reservation upsert and deletion logic.
 * @route PUT /cubicles/:id
 * @access Protected (user)
 */
router.put('/:id', validarUsuario, [
  param('id').isMongoId(),
  body('status').optional().isIn(['available', 'reserved', 'error'])
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}, async (req, res) => {
  try {
    const cubicle = await Cubicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!cubicle) return res.status(404).json({ error: 'Cubicle not found' });
    // Reservation logic
    if (req.body.status === 'available') {
      // Remove reservation if cubicle is made available
      await Reservation.deleteOne({ cubicle: cubicle._id });
    } else if (req.body.status === 'reserved') {
      // Upsert reservation for this cubicle
      const userInfo = {
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.user.name || req.user.displayName || null
      };
      await Reservation.findOneAndUpdate(
        { cubicle: cubicle._id },
        { cubicle: cubicle._id, user: userInfo, date: new Date() },
        { upsert: true, new: true }
      );
    }

    // Emit statistics update
    const io = req.app.get('io');
    const emitStatisticsUpdate = req.app.get('emitStatisticsUpdate');
    if (io && emitStatisticsUpdate) {
      try {
        await emitStatisticsUpdate();
        console.log('[CUBICLE UPDATE] Statistics update emitted');
      } catch (err) {
        console.error('[CUBICLE UPDATE] Error emitting statistics update:', err);
      }
    }

    res.json(cubicle);
  } catch (err) {
    res.status(400).json({ error: 'Error updating cubicle', details: err.message });
  }
});

/**
 * GET /cubicles/:id/reservation
 * Get reservation and user for a cubicle.
 * @route GET /cubicles/:id/reservation
 * @access Protected (user)
 */
router.get('/:id/reservation', validarUsuario, [
  param('id').isMongoId()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}, async (req, res) => {
  try {
    const reservation = await Reservation.findOne({ cubicle: req.params.id }).lean();
    if (!reservation) {
      // No reservation found for this cubicle
      console.log('[GET /cubicles/:id/reservation] No reservation found for cubicle', req.params.id);
      return res.json(null);
    }
    // Reservation found, return only the user field for frontend simplicity
    console.log('[GET /cubicles/:id/reservation] Reservation found:', reservation);
    res.json({ user: reservation.user });
  } catch (err) {
    console.error('[GET /cubicles/:id/reservation] Error:', err);
    res.status(500).json({ error: 'Error fetching reservation', details: err.message });
  }
});

/**
 * DELETE /cubicles/:id
 * Delete a cubicle (admin only).
 * @route DELETE /cubicles/:id
 * @access Protected (admin)
 */
router.delete('/:id', validarUsuario, validarAdmin, [
  param('id').isMongoId()
], (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}, async (req, res) => {
  try {
    const result = await Cubicle.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Cubicle not found' });
    res.json({ message: 'Cubicle deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Error deleting cubicle', details: err.message });
  }
});

/**
 * GET /cubicles/statistics
 * Returns statistics for cubicle usage, per-user usage, error, and available states.
 * @route GET /cubicles/statistics
 * @access Protected (user)
 */
router.get('/statistics', validarUsuario, async (req, res) => {
  try {
    const cubicles = await Cubicle.find();
    const reservations = await Reservation.find();
    const total = cubicles.length;
    const reserved = cubicles.filter(c => c.status === 'reserved').length;
    const available = cubicles.filter(c => c.status === 'available').length;
    const error = cubicles.filter(c => c.status === 'error').length;

    // General stats
    const general = {
      percentReserved: total ? Math.round((reserved / total) * 100) : 0,
      percentAvailable: total ? Math.round((available / total) * 100) : 0,
      percentError: total ? Math.round((error / total) * 100) : 0,
    };

    // Per-user stats
    const userMap = {};
    reservations.forEach(r => {
      if (r.user && r.user.email) {
        userMap[r.user.email] = (userMap[r.user.email] || 0) + 1;
      }
    });
    const userStats = Object.entries(userMap).map(([user, reservedCount]) => ({
      user,
      reserved: reservedCount,
      percent: reserved ? Math.round((reservedCount / reserved) * 100) : 0
    }));
    userStats.sort((a, b) => b.reserved - a.reserved);

    // Comparison metrics
    let topUser = userStats[0] || null;
    let bottomUser = userStats.length > 1 ? userStats[userStats.length - 1] : null;
    const comparisons = [];
    if (topUser) comparisons.push({ metric: 'Top User', value: `${topUser.user} (${topUser.percent}%)` });
    if (bottomUser) comparisons.push({ metric: 'Lowest User', value: `${bottomUser.user} (${bottomUser.percent}%)` });
    comparisons.push({ metric: 'Total Users', value: userStats.length });
    comparisons.push({ metric: 'Total Reservations', value: reserved });

    res.json({ general, users: userStats, comparisons });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching statistics', details: err.message });
  }
});

router.emitStatisticsUpdate = emitStatisticsUpdate;
module.exports = router;
