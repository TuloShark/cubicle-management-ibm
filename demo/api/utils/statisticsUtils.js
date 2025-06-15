/**
 * @fileoverview Statistics Calculation Utilities
 * @description Centralized statistics calculation functions for cubicle management system.
 * Provides reusable functions for real-time statistics, user analytics, and comparison metrics.
 * 
 * @version 1.0.0
 * @author IBM Space Optimization Team
 * @since 1.0.0
 * 
 * @module StatisticsUtils
 * 
 * Key Features:
 * - Centralized statistics calculation logic
 * - User analytics with privacy protection
 * - Section-wise utilization metrics
 * - Performance-optimized database queries
 * - Comprehensive error handling
 * - Modular and testable functions
 */

const logger = require('../logger');

// ================================================================================
// CONFIGURATION CONSTANTS
// ================================================================================

/**
 * Available cubicle sections in the system
 */
const CUBICLE_SECTIONS = ['A', 'B', 'C'];

/**
 * Statistics calculation configuration
 */
const STATS_CONFIG = {
  MAX_TOP_USERS: 10,
  PRECISION_DECIMALS: 1,
  DEFAULT_PERCENTAGE: 0
};

// ================================================================================
// CORE STATISTICS FUNCTIONS
// ================================================================================

/**
 * Calculate general cubicle statistics
 * @param {Array} cubicles - Array of cubicle documents
 * @param {Array} reservations - Array of reservation documents
 * @returns {Object} General statistics object
 * 
 * @example
 * const general = calculateGeneralStats(cubicles, reservations);
 * // Returns: { total: 54, reserved: 12, available: 40, error: 2, percentReserved: 22, ... }
 */
function calculateGeneralStats(cubicles, reservations) {
  try {
    const total = cubicles.length;
    const reserved = cubicles.filter(c => c.status === 'reserved').length;
    const available = cubicles.filter(c => c.status === 'available').length;
    const error = cubicles.filter(c => c.status === 'error').length;

    return {
      total,
      reserved,
      available,
      error,
      percentReserved: total ? Math.round((reserved / total) * 100) : STATS_CONFIG.DEFAULT_PERCENTAGE,
      percentAvailable: total ? Math.round((available / total) * 100) : 100,
      percentError: total ? Math.round((error / total) * 100) : STATS_CONFIG.DEFAULT_PERCENTAGE
    };
  } catch (error) {
    logger.error('Error calculating general statistics:', error);
    return {
      total: 0, reserved: 0, available: 0, error: 0,
      percentReserved: 0, percentAvailable: 100, percentError: 0
    };
  }
}

/**
 * Calculate user-specific statistics from reservations
 * @param {Array} reservations - Array of reservation documents with user data
 * @param {number} totalReserved - Total number of reserved cubicles for percentage calculation
 * @returns {Array} Array of user statistics objects sorted by reservation count
 * 
 * @example
 * const userStats = calculateUserStats(reservations, 12);
 * // Returns: [{ user: 'john@company.com', reserved: 5, percent: 42 }, ...]
 */
function calculateUserStats(reservations, totalReserved) {
  try {
    const userMap = {};
    
    // Aggregate reservations by user email
    reservations.forEach(reservation => {
      if (reservation.user && reservation.user.email) {
        const email = reservation.user.email;
        userMap[email] = (userMap[email] || 0) + 1;
      }
    });

    // Convert to array and calculate percentages
    const userStats = Object.entries(userMap).map(([email, reservedCount]) => ({
      user: email,
      reserved: reservedCount,
      percent: totalReserved ? Math.round((reservedCount / totalReserved) * 100) : STATS_CONFIG.DEFAULT_PERCENTAGE
    }));

    // Sort by reservation count (descending) and limit results
    return userStats
      .sort((a, b) => b.reserved - a.reserved)
      .slice(0, STATS_CONFIG.MAX_TOP_USERS);
      
  } catch (error) {
    logger.error('Error calculating user statistics:', error);
    return [];
  }
}

/**
 * Calculate section-wise statistics
 * @param {Array} cubicles - Array of cubicle documents
 * @returns {Array} Array of section statistics objects
 * 
 * @example
 * const sectionStats = calculateSectionStats(cubicles);
 * // Returns: [{ section: 'A', total: 18, reserved: 6, available: 12, percentReserved: 33 }, ...]
 */
function calculateSectionStats(cubicles) {
  try {
    return CUBICLE_SECTIONS.map(section => {
      const sectionCubicles = cubicles.filter(c => c.section === section);
      const sectionReserved = sectionCubicles.filter(c => c.status === 'reserved').length;
      const sectionTotal = sectionCubicles.length;
      
      return {
        section,
        total: sectionTotal,
        reserved: sectionReserved,
        available: sectionTotal - sectionReserved,
        percentReserved: sectionTotal ? Math.round((sectionReserved / sectionTotal) * 100) : STATS_CONFIG.DEFAULT_PERCENTAGE
      };
    });
  } catch (error) {
    logger.error('Error calculating section statistics:', error);
    return CUBICLE_SECTIONS.map(section => ({
      section, total: 0, reserved: 0, available: 0, percentReserved: 0
    }));
  }
}

/**
 * Calculate comparison metrics for dashboard display
 * @param {Array} userStats - Array of user statistics from calculateUserStats
 * @param {Object} generalStats - General statistics from calculateGeneralStats
 * @returns {Array} Array of comparison metric objects
 * 
 * @example
 * const comparisons = calculateComparisonMetrics(userStats, generalStats);
 * // Returns: [{ metric: 'Total Users', value: 25 }, { metric: 'Most Active User', value: 'john@company.com (5)' }, ...]
 */
function calculateComparisonMetrics(userStats, generalStats) {
  try {
    const topUser = userStats[0] || null;
    const bottomUser = userStats.length > 1 ? userStats[userStats.length - 1] : null;
    const avgReservationsPerUser = userStats.length > 0 ? 
      (generalStats.reserved / userStats.length).toFixed(STATS_CONFIG.PRECISION_DECIMALS) : '0';

    return [
      { metric: 'Total Users', value: userStats.length },
      { metric: 'Total Reservations', value: generalStats.reserved },
      { metric: 'Average per User', value: avgReservationsPerUser },
      { 
        metric: 'Most Active User', 
        value: topUser ? `${topUser.user} (${topUser.reserved})` : 'None' 
      },
      { 
        metric: 'Least Active User', 
        value: bottomUser ? `${bottomUser.user} (${bottomUser.reserved})` : 'None' 
      },
      { metric: 'Utilization Rate', value: `${generalStats.percentReserved}%` }
    ];
  } catch (error) {
    logger.error('Error calculating comparison metrics:', error);
    return [
      { metric: 'Total Users', value: 0 },
      { metric: 'Total Reservations', value: 0 },
      { metric: 'Average per User', value: '0' },
      { metric: 'Most Active User', value: 'None' },
      { metric: 'Least Active User', value: 'None' },
      { metric: 'Utilization Rate', value: '0%' }
    ];
  }
}

// ================================================================================
// MAIN STATISTICS AGGREGATION FUNCTION
// ================================================================================

/**
 * Calculate comprehensive cubicle statistics
 * Main function that aggregates all statistics calculations
 * 
 * @param {Array} cubicles - Array of cubicle documents from database
 * @param {Array} reservations - Array of reservation documents from database
 * @returns {Object} Complete statistics object with all metrics
 * 
 * @example
 * const stats = calculateCubicleStatistics(cubicles, reservations);
 * // Returns: { general: {...}, users: [...], sections: [...], comparisons: [...], timestamp: '...' }
 */
function calculateCubicleStatistics(cubicles, reservations) {
  try {
    // Calculate general statistics
    const general = calculateGeneralStats(cubicles, reservations);
    
    // Calculate user statistics
    const users = calculateUserStats(reservations, general.reserved);
    
    // Calculate section statistics
    const sections = calculateSectionStats(cubicles);
    
    // Calculate comparison metrics
    const comparisons = calculateComparisonMetrics(users, general);

    return {
      general,
      users,
      sections,
      comparisons,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error calculating complete cubicle statistics:', error);
    throw new Error(`Statistics calculation failed: ${error.message}`);
  }
}

// ================================================================================
// EXPORTS
// ================================================================================

module.exports = {
  calculateGeneralStats,
  calculateUserStats,
  calculateSectionStats,
  calculateComparisonMetrics,
  calculateCubicleStatistics,
  CUBICLE_SECTIONS,
  STATS_CONFIG
};
