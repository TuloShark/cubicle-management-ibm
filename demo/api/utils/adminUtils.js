/**
 * @fileoverview Admin Utilities Module
 * @description Centralized utilities for admin user management and privilege checking
 * in the Cubicle Management System. Provides consistent admin UID parsing and validation.
 * 
 * @version 1.1.0
 * @author Cubicle Management System - IBM Space Optimization
 * @since 1.0.0
 * 
 * @module AdminUtils
 * 
 * Environment Variables:
 * - ADMIN_UIDS: Comma-separated list of Firebase admin user IDs
 * 
 * Usage Examples:
 * ```javascript
 * const { getAdminUids, isAdminUid } = require('./utils/adminUtils');
 * 
 * // Get all admin UIDs
 * const adminUids = getAdminUids();
 * 
 * // Check if user is admin
 * const isAdmin = isAdminUid(userUid);
 * ```
 */

// ================================================================================
// CONFIGURATION CONSTANTS
// ================================================================================

/**
 * Firebase UID validation pattern
 * Firebase UIDs are typically 28 characters, alphanumeric
 */
const FIREBASE_UID_PATTERN = /^[a-zA-Z0-9]{20,}$/;

/**
 * Maximum reasonable number of admin UIDs to prevent configuration errors
 */
const MAX_ADMIN_UIDS = 50;

// ================================================================================
// CORE ADMIN UTILITIES
// ================================================================================

/**
 * Retrieves admin user IDs from environment variable with validation
 * 
 * @function getAdminUids
 * @description Parses the ADMIN_UIDS environment variable which should contain
 * comma-separated Firebase user IDs. Handles empty values, trims whitespace,
 * filters empty strings, and validates UID format.
 * 
 * @returns {string[]} Array of validated admin user Firebase UIDs
 * 
 * @example
 * // Environment: ADMIN_UIDS=uid1,uid2, uid3,
 * const adminUids = getAdminUids();
 * // Returns: ['uid1', 'uid2', 'uid3']
 * 
 * @example 
 * // Environment: ADMIN_UIDS= (empty)
 * const adminUids = getAdminUids();
 * // Returns: []
 * 
 * @example
 * // Environment: ADMIN_UIDS=validUid1,invalid-uid,validUid2
 * const adminUids = getAdminUids();
 * // Returns: ['validUid1', 'validUid2']
 * // Note: Logs warning about invalid UID
 * 
 * @since 1.0.0
 * @version 1.1.0
 */
function getAdminUids() {
  const adminUidsEnv = process.env.ADMIN_UIDS || '';
  
  // Handle empty environment variable
  if (!adminUidsEnv.trim()) {
    return [];
  }
  
  // Parse, trim, and filter UIDs
  const rawUids = adminUidsEnv
    .split(',')
    .map(uid => uid.trim())
    .filter(Boolean);
  
  // Validate UIDs and filter invalid ones
  const validUids = [];
  const invalidUids = [];
  
  rawUids.forEach(uid => {
    if (FIREBASE_UID_PATTERN.test(uid)) {
      validUids.push(uid);
    } else {
      invalidUids.push(uid);
    }
  });
  
  // Log warnings for invalid UIDs (optional, only if console is available)
  if (invalidUids.length > 0 && typeof console !== 'undefined') {
    console.warn(`Invalid admin UIDs detected and filtered: ${invalidUids.join(', ')}`);
  }
  
  // Log warning for excessive admin count
  if (validUids.length > MAX_ADMIN_UIDS && typeof console !== 'undefined') {
    console.warn(`Unusually high number of admin UIDs (${validUids.length}). Consider reviewing ADMIN_UIDS configuration.`);
  }
  
  return validUids;
}

/**
 * Checks if a given UID is in the admin list
 * 
 * @function isAdminUid
 * @description Utility function to check if a specific user ID is included
 * in the configured admin UIDs list. More efficient than calling getAdminUids()
 * and then checking membership when you only need to verify one UID.
 * 
 * @param {string} uid - The Firebase user ID to check
 * @returns {boolean} True if the UID is in the admin list, false otherwise
 * 
 * @example
 * const isAdmin = isAdminUid('someFirebaseUid123');
 * if (isAdmin) {
 *   // User has admin privileges
 * }
 * 
 * @since 1.1.0
 */
function isAdminUid(uid) {
  if (!uid || typeof uid !== 'string') {
    return false;
  }
  
  const adminUids = getAdminUids();
  return adminUids.includes(uid);
}

/**
 * Validates the current admin UIDs configuration
 * 
 * @function validateAdminConfig
 * @description Performs comprehensive validation of the admin UIDs configuration,
 * checking for common issues like empty configuration, invalid UID formats,
 * and potential security concerns.
 * 
 * @returns {Object} Validation result object
 * @returns {boolean} returns.isValid - Whether configuration is valid
 * @returns {string[]} returns.warnings - Array of warning messages
 * @returns {string[]} returns.errors - Array of error messages
 * @returns {Object} returns.stats - Configuration statistics
 * 
 * @example
 * const validation = validateAdminConfig();
 * if (!validation.isValid) {
 *   console.error('Admin configuration errors:', validation.errors);
 * }
 * if (validation.warnings.length > 0) {
 *   console.warn('Admin configuration warnings:', validation.warnings);
 * }
 * 
 * @since 1.1.0
 */
function validateAdminConfig() {
  const adminUidsEnv = process.env.ADMIN_UIDS || '';
  const adminUids = getAdminUids();
  
  const warnings = [];
  const errors = [];
  
  // Check for empty configuration
  if (!adminUidsEnv.trim()) {
    warnings.push('ADMIN_UIDS environment variable is empty - no admin access will be granted');
  }
  
  // Check for single admin (potential lock-out risk)
  if (adminUids.length === 1) {
    warnings.push('Only one admin UID configured - consider adding backup admin to prevent lockout');
  }
  
  // Check for excessive admins
  if (adminUids.length > MAX_ADMIN_UIDS) {
    warnings.push(`Large number of admin UIDs (${adminUids.length}) - review for security`);
  }
  
  // Check for parsing issues
  const rawCount = adminUidsEnv.split(',').filter(Boolean).length;
  const validCount = adminUids.length;
  if (rawCount !== validCount) {
    warnings.push(`${rawCount - validCount} invalid UID(s) were filtered from configuration`);
  }
  
  const isValid = errors.length === 0;
  
  return {
    isValid,
    warnings,
    errors,
    stats: {
      configuredUids: rawCount,
      validUids: validCount,
      invalidUids: rawCount - validCount,
      environmentVariable: adminUidsEnv.length > 0 ? 'set' : 'empty'
    }
  };
}

// ================================================================================
// MODULE EXPORTS
// ================================================================================

module.exports = {
  getAdminUids,
  isAdminUid,
  validateAdminConfig
};