// External dependencies
const express = require('express');
const router = express.Router();

// Internal dependencies
const admin = require('../firebaseAdmin');
const { validarUsuario, validarAdmin } = require('../middleware/auth');
const { getAdminUids } = require('../utils/adminUtils');

/**
 * @file usersController.js
 * Express router for user management endpoints (admin only).
 */

/**
 * GET /users/:uid
 * Get user info from Firebase Authentication.
 * Only admins can access this endpoint.
 * @route GET /users/:uid
 * @access Protected (admin)
 */
router.get('/:uid', validarUsuario, validarAdmin, async (req, res) => {
  try {
    const userRecord = await admin.auth().getUser(req.params.uid);
    // Check if UID is in admin list or has admin claim
    const adminUids = getAdminUids();
    const isAdmin = adminUids.includes(userRecord.uid) || (userRecord.customClaims && userRecord.customClaims.admin);
    res.json({ ...userRecord, isAdmin });
  } catch (err) {
    res.status(404).json({ error: 'User not found', details: err.message });
  }
});

/**
 * DELETE /users/:uid
 * Delete a user from Firebase Authentication.
 * Only admins can access this endpoint.
 * @route DELETE /users/:uid
 * @access Protected (admin)
 */
router.delete('/:uid', validarUsuario, validarAdmin, async (req, res) => {
  try {
    await admin.auth().deleteUser(req.params.uid);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete user', details: err.message });
  }
});

/**
 * PATCH /users/:uid
 * Update user info (displayName, email, password, etc.).
 * Only admins can update any user. Users can update their own info (add logic as needed).
 * @route PATCH /users/:uid
 * @access Protected (admin)
 */
router.patch('/:uid', validarUsuario, validarAdmin, async (req, res) => {
  try {
    const updateData = req.body;
    const userRecord = await admin.auth().updateUser(req.params.uid, updateData);
    res.json(userRecord);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update user', details: err.message });
  }
});

/**
 * POST /users/:uid/setAdmin
 * Set or remove admin custom claim for a user.
 * Only admins can update any user. Users can update their own admin status.
 * @route POST /users/:uid/setAdmin
 * @access Protected (admin or self)
 */
router.post('/:uid/setAdmin', validarUsuario, async (req, res) => {
  const { admin: makeAdmin } = req.body;
  const { uid } = req.params;
  // Only allow users to change their own admin status or admins to change anyone's
  const isSelf = req.user.uid === uid;
  const adminUids = getAdminUids();
  const isAdmin = adminUids.includes(req.user.uid);
  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'Not authorized to change admin status for this user' });
  }
  try {
    await admin.auth().setCustomUserClaims(uid, makeAdmin ? { admin: true } : { admin: false });
    res.json({ success: true, admin: makeAdmin });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update admin claim', details: err.message });
  }
});

module.exports = router;
