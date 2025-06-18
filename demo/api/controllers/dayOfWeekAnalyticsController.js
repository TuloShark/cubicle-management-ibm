/**
 * @fileoverview Day-of-Week Analytics Controller
 * @description Specialized analytics controller for day-of-week usage patterns.
 * Provides comprehensive analysis of cubicle utilization patterns by specific days
 * across different time periods with advanced statistical calculations.
 * 
 * @version 1.0.0
 * @author IBM Space Optimization Developer - Wander Jimenez Calvo
 * @since 2.1.0
 * 
 * @module DayOfWeekAnalyticsController
 * 
 * API Endpoints:
 * - GET    /api/analytics/day-of-week/:dayName/:month/:year     - Get specific day analytics
 * - GET    /api/analytics/day-of-week/summary/:month/:year      - Get all days summary
 * - GET    /api/analytics/day-of-week/compare/:day1/:day2/:month/:year - Compare two days
 * - GET    /api/analytics/day-of-week/trends/:dayName/:months   - Get day trends over months
 */

const express = require('express');
const { param, query, validationResult } = require('express-validator');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Cubicle = require('../models/Cubicle');
const { validarUsuario, validarAdmin } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiting');
const logger = require('../logger');

// ================================================================================
// CONFIGURATION CONSTANTS
// ================================================================================

/**
 * Valid day names for analytics
 */
const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Available cubicle sections
 */
const CUBICLE_SECTIONS = ['A', 'B', 'C'];

/**
 * Date range limits for analytics
 */
const DATE_LIMITS = {
  MIN_YEAR: 2020,
  MAX_YEAR: 2030,
  MIN_MONTH: 1,
  MAX_MONTH: 12
};

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

/**
 * Validate day name parameter
 * @param {string} dayName - Day name to validate
 * @returns {boolean} True if valid day name
 */
function isValidDayName(dayName) {
  return VALID_DAYS.includes(dayName);
}

/**
 * Validate month and year parameters
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {boolean} True if valid month/year
 */
function isValidMonthYear(month, year) {
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  
  return monthNum >= DATE_LIMITS.MIN_MONTH && 
         monthNum <= DATE_LIMITS.MAX_MONTH &&
         yearNum >= DATE_LIMITS.MIN_YEAR && 
         yearNum <= DATE_LIMITS.MAX_YEAR;
}

/**
 * Get all dates for a specific day in a month/year
 * @param {string} dayName - Day name (e.g., 'Monday')
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Date[]} Array of dates for that day
 */
function getDatesForDayInMonth(dayName, month, year) {
  const dates = [];
  const dayIndex = VALID_DAYS.indexOf(dayName);
  
  // Start from first day of month
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  // Find first occurrence of the target day
  let currentDate = new Date(firstDay);
  while (currentDate.getDay() !== dayIndex) {
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Collect all occurrences
  while (currentDate <= lastDay) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return dates;
}

/**
 * Calculate date range for analytics queries
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 * @returns {Object} Start and end dates for the month
 */
function getMonthDateRange(month, year) {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  return { startDate, endDate };
}

/**
 * Calculate statistics for day analytics
 * @param {Array} reservations - Reservations data
 * @param {Array} cubicles - Cubicles data
 * @param {Array} targetDates - Dates to analyze
 * @returns {Object} Calculated statistics
 */
function calculateDayStatistics(reservations, cubicles, targetDates) {
  const totalCubicles = cubicles.length;
  const dayReservations = reservations.filter(r => 
    targetDates.some(date => 
      r.date.toDateString() === date.toDateString()
    )
  );
  
  const stats = {
    totalOccurrences: targetDates.length,
    totalReservations: dayReservations.length,
    averageReservationsPerOccurrence: targetDates.length > 0 ? 
      Math.round(dayReservations.length / targetDates.length) : 0,
    averageUtilizationPercent: totalCubicles > 0 && targetDates.length > 0 ? 
      Math.round((dayReservations.length / (totalCubicles * targetDates.length)) * 100) : 0,
    peakUtilization: 0,
    lowestUtilization: 0,
    uniqueUsers: new Set(
      dayReservations
        .filter(r => r.user && r.user.email)
        .map(r => r.user.email)
    ).size
  };
  
  // Calculate peak and lowest utilization per occurrence
  const utilizationPerDate = targetDates.map(date => {
    const dateReservations = dayReservations.filter(r => 
      r.date.toDateString() === date.toDateString()
    );
    return totalCubicles > 0 ? Math.round((dateReservations.length / totalCubicles) * 100) : 0;
  });
  
  stats.peakUtilization = Math.max(...utilizationPerDate, 0);
  stats.lowestUtilization = Math.min(...utilizationPerDate, 0);
  
  return stats;
}

/**
 * Calculate section-wise statistics for day analytics
 * @param {Array} reservations - Reservations data
 * @param {Array} cubicles - Cubicles data
 * @param {Array} targetDates - Dates to analyze
 * @returns {Array} Section statistics
 */
function calculateSectionStatistics(reservations, cubicles, targetDates) {
  return CUBICLE_SECTIONS.map(section => {
    const sectionCubicles = cubicles.filter(c => c.section === section);
    const sectionReservations = reservations.filter(r => 
      r.cubicle && r.cubicle.section === section &&
      targetDates.some(date => r.date.toDateString() === date.toDateString())
    );
    
    const totalSectionCubicles = sectionCubicles.length;
    const avgUtilization = totalSectionCubicles > 0 && targetDates.length > 0 ? 
      Math.round((sectionReservations.length / (totalSectionCubicles * targetDates.length)) * 100) : 0;
    
    return {
      section,
      totalCubicles: totalSectionCubicles,
      totalReservations: sectionReservations.length,
      averageUtilization: avgUtilization,
      occurrences: targetDates.length
    };
  });
}

/**
 * Calculate user patterns for day analytics
 * @param {Array} reservations - Reservations data
 * @param {Array} targetDates - Dates to analyze
 * @returns {Array} User pattern statistics
 */
function calculateUserPatterns(reservations, targetDates) {
  const dayReservations = reservations.filter(r => 
    targetDates.some(date => r.date.toDateString() === date.toDateString())
  );
  
  const userStats = {};
  
  dayReservations.forEach(reservation => {
    if (reservation.user && reservation.user.email) {
      const email = reservation.user.email;
      if (!userStats[email]) {
        userStats[email] = {
          email: email.split('@')[0], // Privacy: show only username
          totalReservations: 0,
          datesActive: new Set(),
          favoriteSection: null
        };
      }
      
      userStats[email].totalReservations++;
      userStats[email].datesActive.add(reservation.date.toDateString());
      
      // Track section usage for favorite calculation
      if (reservation.cubicle && reservation.cubicle.section) {
        // Simple favorite section logic - could be enhanced
        if (!userStats[email].sectionCounts) {
          userStats[email].sectionCounts = {};
        }
        const section = reservation.cubicle.section;
        userStats[email].sectionCounts[section] = (userStats[email].sectionCounts[section] || 0) + 1;
      }
    }
  });
  
  // Convert to array and calculate favorite sections
  return Object.values(userStats).map(user => {
    const activeDays = user.datesActive.size;
    const consistencyScore = targetDates.length > 0 ? 
      Math.round((activeDays / targetDates.length) * 100) : 0;
    
    // Calculate favorite section
    let favoriteSection = 'None';
    if (user.sectionCounts) {
      const sections = Object.entries(user.sectionCounts);
      if (sections.length > 0) {
        favoriteSection = sections.reduce((a, b) => a[1] > b[1] ? a : b)[0];
      }
    }
    
    return {
      email: user.email,
      totalReservations: user.totalReservations,
      activeDays,
      consistencyScore,
      favoriteSection,
      averageReservationsPerDay: activeDays > 0 ? 
        Math.round((user.totalReservations / activeDays) * 10) / 10 : 0
    };
  }).sort((a, b) => b.totalReservations - a.totalReservations);
}

// ================================================================================
// API ROUTE HANDLERS
// ================================================================================

/**
 * GET /analytics/day-of-week/:dayName/:month/:year
 * Get comprehensive analytics for a specific day of the week in a month/year
 * @route GET /api/analytics/day-of-week/:dayName/:month/:year
 * @access Protected (user)
 * @param {string} dayName - Day name (Monday, Tuesday, etc.)
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 */
router.get('/day-of-week/:dayName/:month/:year', [
  rateLimiters.api,
  validarUsuario,
  param('dayName').custom(value => {
    if (!isValidDayName(value)) {
      throw new Error('Invalid day name. Must be one of: ' + VALID_DAYS.join(', '));
    }
    return true;
  }),
  param('month').isInt({ min: 1, max: 12 }),
  param('year').isInt({ min: DATE_LIMITS.MIN_YEAR, max: DATE_LIMITS.MAX_YEAR })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dayName, month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    logger.info(`Generating day-of-week analytics for ${dayName} in ${monthNum}/${yearNum}`);

    // Get all dates for the specified day in the month
    const targetDates = getDatesForDayInMonth(dayName, monthNum, yearNum);
    
    if (targetDates.length === 0) {
      return res.json({
        dayName,
        month: monthNum,
        year: yearNum,
        message: 'No occurrences of this day in the specified month',
        analytics: null
      });
    }

    // Get date range for the month
    const { startDate, endDate } = getMonthDateRange(monthNum, yearNum);

    // Fetch data
    const [cubicles, reservations] = await Promise.all([
      Cubicle.find().lean(),
      Reservation.find({
        date: { $gte: startDate, $lte: endDate }
      }).populate('cubicle', 'section').lean()
    ]);

    // Calculate comprehensive analytics
    const generalStats = calculateDayStatistics(reservations, cubicles, targetDates);
    const sectionStats = calculateSectionStatistics(reservations, cubicles, targetDates);
    const userPatterns = calculateUserPatterns(reservations, targetDates);

    // Create detailed breakdown for each occurrence
    const occurrenceBreakdown = targetDates.map(date => {
      const dateReservations = reservations.filter(r => 
        r.date.toDateString() === date.toDateString()
      );
      
      return {
        date: date.toISOString().split('T')[0],
        dayOfWeek: dayName,
        reservations: dateReservations.length,
        utilizationPercent: cubicles.length > 0 ? 
          Math.round((dateReservations.length / cubicles.length) * 100) : 0,
        uniqueUsers: new Set(
          dateReservations
            .filter(r => r.user && r.user.email)
            .map(r => r.user.email)
        ).size
      };
    });

    const analytics = {
      dayName,
      month: monthNum,
      year: yearNum,
      summary: generalStats,
      sections: sectionStats,
      userPatterns: userPatterns.slice(0, 10), // Top 10 users
      occurrenceBreakdown,
      metadata: {
        totalCubicles: cubicles.length,
        analysisDate: new Date().toISOString(),
        dataSource: 'reservations'
      }
    };

    res.json(analytics);

  } catch (error) {
    logger.error('Error generating day-of-week analytics:', {
      error: error.message,
      dayName: req.params.dayName,
      month: req.params.month,
      year: req.params.year,
      user: req.user?.email
    });
    res.status(500).json({ error: 'Failed to generate day-of-week analytics' });
  }
});

/**
 * GET /analytics/day-of-week/summary/:month/:year
 * Get summary analytics for all days of the week in a month/year
 * @route GET /api/analytics/day-of-week/summary/:month/:year
 * @access Protected (user)
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 */
router.get('/summary/:month/:year', [
  rateLimiters.api,
  validarUsuario,
  param('month').isInt({ min: 1, max: 12 }),
  param('year').isInt({ min: DATE_LIMITS.MIN_YEAR, max: DATE_LIMITS.MAX_YEAR })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    logger.info(`Generating day-of-week summary for ${monthNum}/${yearNum}`);

    // Get date range for the month
    const { startDate, endDate } = getMonthDateRange(monthNum, yearNum);

    // Fetch data
    const [cubicles, reservations] = await Promise.all([
      Cubicle.find().lean(),
      Reservation.find({
        date: { $gte: startDate, $lte: endDate }
      }).populate('cubicle', 'section').lean()
    ]);

    // Calculate analytics for each day of the week
    const daysSummary = VALID_DAYS.map(dayName => {
      const targetDates = getDatesForDayInMonth(dayName, monthNum, yearNum);
      const generalStats = calculateDayStatistics(reservations, cubicles, targetDates);
      
      return {
        dayName,
        occurrences: targetDates.length,
        totalReservations: generalStats.totalReservations,
        averageUtilization: generalStats.averageUtilizationPercent,
        peakUtilization: generalStats.peakUtilization,
        uniqueUsers: generalStats.uniqueUsers
      };
    });

    // Find best and worst performing days
    const bestDay = daysSummary.reduce((a, b) => 
      a.averageUtilization > b.averageUtilization ? a : b
    );
    const worstDay = daysSummary.reduce((a, b) => 
      a.averageUtilization < b.averageUtilization ? a : b
    );

    const summary = {
      month: monthNum,
      year: yearNum,
      daysSummary,
      insights: {
        bestPerformingDay: bestDay.dayName,
        worstPerformingDay: worstDay.dayName,
        averageUtilizationAcrossAllDays: Math.round(
          daysSummary.reduce((sum, day) => sum + day.averageUtilization, 0) / daysSummary.length
        ),
        totalReservationsInMonth: daysSummary.reduce((sum, day) => sum + day.totalReservations, 0),
        mostConsistentDay: daysSummary.reduce((a, b) => 
          Math.abs(a.peakUtilization - a.averageUtilization) < 
          Math.abs(b.peakUtilization - b.averageUtilization) ? a : b
        ).dayName
      },
      metadata: {
        totalCubicles: cubicles.length,
        analysisDate: new Date().toISOString(),
        dataSource: 'reservations'
      }
    };

    res.json(summary);

  } catch (error) {
    logger.error('Error generating day-of-week summary:', {
      error: error.message,
      month: req.params.month,
      year: req.params.year,
      user: req.user?.email
    });
    res.status(500).json({ error: 'Failed to generate day-of-week summary' });
  }
});

/**
 * GET /analytics/day-of-week/compare/:day1/:day2/:month/:year
 * Compare analytics between two different days of the week
 * @route GET /api/analytics/day-of-week/compare/:day1/:day2/:month/:year
 * @access Protected (user)
 * @param {string} day1 - First day name
 * @param {string} day2 - Second day name
 * @param {number} month - Month (1-12)
 * @param {number} year - Year
 */
router.get('/day-of-week/compare/:day1/:day2/:month/:year', [
  rateLimiters.api,
  validarUsuario,
  param('day1').custom(value => {
    if (!isValidDayName(value)) {
      throw new Error('Invalid day1 name. Must be one of: ' + VALID_DAYS.join(', '));
    }
    return true;
  }),
  param('day2').custom(value => {
    if (!isValidDayName(value)) {
      throw new Error('Invalid day2 name. Must be one of: ' + VALID_DAYS.join(', '));
    }
    return true;
  }),
  param('month').isInt({ min: 1, max: 12 }),
  param('year').isInt({ min: DATE_LIMITS.MIN_YEAR, max: DATE_LIMITS.MAX_YEAR })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { day1, day2, month, year } = req.params;
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (day1 === day2) {
      return res.status(400).json({ error: 'Cannot compare the same day with itself' });
    }

    logger.info(`Comparing ${day1} vs ${day2} for ${monthNum}/${yearNum}`);

    // Get date range for the month
    const { startDate, endDate } = getMonthDateRange(monthNum, yearNum);

    // Fetch data
    const [cubicles, reservations] = await Promise.all([
      Cubicle.find().lean(),
      Reservation.find({
        date: { $gte: startDate, $lte: endDate }
      }).populate('cubicle', 'section').lean()
    ]);

    // Calculate analytics for both days
    const day1Dates = getDatesForDayInMonth(day1, monthNum, yearNum);
    const day2Dates = getDatesForDayInMonth(day2, monthNum, yearNum);

    const day1Stats = calculateDayStatistics(reservations, cubicles, day1Dates);
    const day2Stats = calculateDayStatistics(reservations, cubicles, day2Dates);

    const day1Sections = calculateSectionStatistics(reservations, cubicles, day1Dates);
    const day2Sections = calculateSectionStatistics(reservations, cubicles, day2Dates);

    // Calculate comparison metrics
    const utilizationDifference = day1Stats.averageUtilizationPercent - day2Stats.averageUtilizationPercent;
    const reservationsDifference = day1Stats.totalReservations - day2Stats.totalReservations;
    const usersDifference = day1Stats.uniqueUsers - day2Stats.uniqueUsers;

    const comparison = {
      month: monthNum,
      year: yearNum,
      // Frontend-expected format
      day1Summary: {
        totalReservations: day1Stats.totalReservations,
        uniqueUsers: day1Stats.uniqueUsers,
        averageUsage: day1Stats.averageUtilizationPercent / 100,
        name: day1
      },
      day2Summary: {
        totalReservations: day2Stats.totalReservations,
        uniqueUsers: day2Stats.uniqueUsers,
        averageUsage: day2Stats.averageUtilizationPercent / 100,
        name: day2
      },
      // Detailed comparison data
      comparison: {
        day1: {
          name: day1,
          stats: day1Stats,
          sections: day1Sections
        },
        day2: {
          name: day2,
          stats: day2Stats,
          sections: day2Sections
        }
      },
      differences: {
        utilizationDifference: Math.round(utilizationDifference * 10) / 10,
        reservationsDifference,
        usersDifference,
        winner: {
          utilization: utilizationDifference > 0 ? day1 : day2,
          totalReservations: reservationsDifference > 0 ? day1 : day2,
          uniqueUsers: usersDifference > 0 ? day1 : day2
        }
      },
      insights: {
        significantDifference: Math.abs(utilizationDifference) > 10,
        moreConsistent: day1Stats.peakUtilization - day1Stats.lowestUtilization < 
                       day2Stats.peakUtilization - day2Stats.lowestUtilization ? day1 : day2,
        recommendation: utilizationDifference > 10 ? 
          `${day1} shows significantly higher utilization` :
          utilizationDifference < -10 ?
          `${day2} shows significantly higher utilization` :
          'Both days show similar utilization patterns'
      },
      metadata: {
        totalCubicles: cubicles.length,
        analysisDate: new Date().toISOString(),
        dataSource: 'reservations'
      }
    };

    res.json(comparison);

  } catch (error) {
    logger.error('Error generating day comparison:', {
      error: error.message,
      day1: req.params.day1,
      day2: req.params.day2,
      month: req.params.month,
      year: req.params.year,
      user: req.user?.email
    });
    res.status(500).json({ error: 'Failed to generate day comparison' });
  }
});

module.exports = router;
