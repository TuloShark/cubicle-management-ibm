/**
 * @fileoverview Utilization Report Management Controller
 * @description Comprehensive utilization analytics and reporting with enterprise-grade
 * validation, security, performance optimizations, and Excel export capabilities
 * 
 * @version 2.1.0
 * @author Cubicle Management System - IBM Space Optimization
 * @since 1.0.0
 * 
 * @module UtilizationController
 * 
 * API Endpoints:
 * - GET    /api/utilization-reports              - Get all reports with pagination
 * - GET    /api/utilization-reports/:id          - Get specific report by ID
 * - POST   /api/utilization-reports/generate     - Generate report for specific date (admin)
 * - POST   /api/utilization-reports/generate-current - Generate current day report (admin)
 * - DELETE /api/utilization-reports/:id          - Delete specific report (admin)
 * - GET    /api/utilization-reports/:id/export   - Export report as Excel file
 */

// External dependencies
const express = require('express');
const { param, query, validationResult } = require('express-validator');
const XLSX = require('xlsx');
const router = express.Router();

// Internal dependencies
const UtilizationReport = require('../models/UtilizationReport');
const Cubicle = require('../models/Cubicle');
const Reservation = require('../models/Reservation');
const { validarUsuario, validarAdmin } = require('../middleware/auth');
const { rateLimiters, rateLimiterCombinations } = require('../middleware/rateLimiting');
const logger = require('../logger');

// ================================================================================
// CONFIGURATION CONSTANTS
// ================================================================================

/**
 * Pagination limits for report queries
 * Prevents abuse while allowing legitimate usage
 */
const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

/**
 * Peak hours simulation multipliers
 * Used for generating realistic peak hour analytics
 */
const PEAK_HOURS_MULTIPLIERS = {
  MORNING_LOW: 0.8,    // 9 AM - Lower activity
  MORNING_HIGH: 1.2,   // 10 AM - Peak activity
  AFTERNOON_HIGH: 1.1, // 2 PM - High activity
  AFTERNOON_MID: 0.9   // 3 PM - Moderate activity
};

/**
 * Default session duration in hours
 * Used for efficiency calculations
 */
const DEFAULT_SESSION_DURATION = 8;

/**
 * Available cubicle sections
 * Used for section analysis and validation
 */
const CUBICLE_SECTIONS = ['A', 'B', 'C'];

/**
 * Report data comparison fields for change detection
 * Used to determine if a new report should be generated
 */
const CHANGE_DETECTION_FIELDS = [
  'totalReservations',
  'uniqueUsers', 
  'avgUtilization',
  'errorIncidents'
];

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

/**
 * Generate cubicle code sequences for a user's reservations
 * Creates compressed sequences (e.g., "A1-A5, B3, C7-C9") from individual reservations
 * @param {Array} reservations - User's reservations with populated cubicle data
 * @returns {string} Formatted cubicle codes sequence
 * @example
 * generateCubicleCodeSequence([
 *   { cubicle: { serial: 'A1' }, date: '2025-06-14' },
 *   { cubicle: { serial: 'A2' }, date: '2025-06-14' }
 * ]); 
 * // Returns: "A1-A2"
 */
function generateCubicleCodeSequence(reservations) {
  if (!reservations || reservations.length === 0) return '';
  
  // Sort reservations by date and cubicle serial
  const sortedReservations = reservations
    .filter(r => r.cubicle && r.cubicle.serial)
    .sort((a, b) => {
      const dateComparison = new Date(a.date) - new Date(b.date);
      if (dateComparison !== 0) return dateComparison;
      return a.cubicle.serial.localeCompare(b.cubicle.serial);
    });

  if (sortedReservations.length === 0) return '';
  
  // Group by date first, then process sequences
  const dateGroups = {};
  sortedReservations.forEach(r => {
    const dateStr = r.date.toDateString();
    if (!dateGroups[dateStr]) {
      dateGroups[dateStr] = [];
    }
    dateGroups[dateStr].push(r.cubicle.serial);
  });
  
  const allCodes = [];
  
  // Process each date group for sequences
  Object.keys(dateGroups).sort().forEach(dateStr => {
    const codes = dateGroups[dateStr].sort();
    const sequences = [];
    
    let sequenceStart = codes[0];
    let sequenceEnd = sequenceStart;
    
    for (let i = 1; i < codes.length; i++) {
      if (isSequentialCode(sequenceEnd, codes[i])) {
        sequenceEnd = codes[i];
      } else {
        // End current sequence and start a new one
        if (sequenceStart === sequenceEnd) {
          sequences.push(sequenceStart);
        } else {
          sequences.push(`${sequenceStart}-${sequenceEnd}`);
        }
        sequenceStart = codes[i];
        sequenceEnd = codes[i];
      }
    }
    
    // Add the last sequence
    if (sequenceStart === sequenceEnd) {
      sequences.push(sequenceStart);
    } else {
      sequences.push(`${sequenceStart}-${sequenceEnd}`);
    }
    
    allCodes.push(...sequences);
  });
  
  return allCodes.join(', ');
}

/**
 * Check if two cubicle codes are sequential
 * Determines if codes like "A1" and "A2" are consecutive for sequence compression
 * @param {string} code1 - First cubicle code (e.g., "A1")
 * @param {string} code2 - Second cubicle code (e.g., "A2")
 * @returns {boolean} True if codes are sequential in same section
 * @example
 * isSequentialCode('A1', 'A2'); // true
 * isSequentialCode('A1', 'B1'); // false
 * isSequentialCode('A1', 'A3'); // false
 */
function isSequentialCode(code1, code2) {
  // Extract section and number from codes like "A1", "B12", etc.
  const regex = /^([A-Z])(\d+)$/;
  const match1 = code1.match(regex);
  const match2 = code2.match(regex);
  
  if (!match1 || !match2) return false;
  
  const section1 = match1[1];
  const number1 = parseInt(match1[2]);
  const section2 = match2[1];
  const number2 = parseInt(match2[2]);
  
  // Same section and consecutive numbers
  return section1 === section2 && Math.abs(number1 - number2) === 1;
}

/**
 * Generate peak hours analytics data
 * Creates realistic peak hour data based on average utilization
 * @param {number} avgUtilization - Average utilization percentage
 * @returns {Array} Peak hours data with hour and utilization percentage
 */
function generatePeakHoursData(avgUtilization) {
  return [
    { 
      hour: 9, 
      utilizationPercent: Math.round(avgUtilization * PEAK_HOURS_MULTIPLIERS.MORNING_LOW) 
    },
    { 
      hour: 10, 
      utilizationPercent: Math.round(avgUtilization * PEAK_HOURS_MULTIPLIERS.MORNING_HIGH) 
    },
    { 
      hour: 14, 
      utilizationPercent: Math.round(avgUtilization * PEAK_HOURS_MULTIPLIERS.AFTERNOON_HIGH) 
    },
    { 
      hour: 15, 
      utilizationPercent: Math.round(avgUtilization * PEAK_HOURS_MULTIPLIERS.AFTERNOON_MID) 
    }
  ];
}

/**
 * Check if report data has significant changes
 * Compares key metrics to determine if new report generation is needed
 * @param {Object} existingReport - Existing report from database
 * @param {Object} newReportData - New report data to compare
 * @returns {boolean} True if significant changes detected
 */
function hasReportChanges(existingReport, newReportData) {
  return CHANGE_DETECTION_FIELDS.some(field => 
    existingReport.summary[field] !== newReportData.summary[field]
  );
}

// ================================================================================
// REPORT GENERATION FUNCTIONS
// ================================================================================

/**
 * Generate comprehensive utilization report data for a given date range
 * Main report generation function that aggregates all analytics data
 * @param {Date} startDate - Start of the reporting period
 * @param {Date} endDate - End of the reporting period
 * @returns {Promise<Object>} Complete report data with summary, daily, sections, users, and advanced analytics
 * @throws {Error} If data generation fails
 * @example
 * const reportData = await generateReportData(
 *   new Date('2025-06-14T00:00:00.000Z'),
 *   new Date('2025-06-14T23:59:59.999Z')
 * );
 */
async function generateReportData(startDate, endDate) {
  try {
    // Fetch all required data
    const [cubicles, reservations] = await Promise.all([
      Cubicle.find(),
      Reservation.find({
        date: { $gte: startDate, $lte: endDate }
      }).populate('cubicle')
    ]);

    const totalCubicles = cubicles.length;
    
    // Generate daily breakdown
    const daily = generateDailyBreakdown(startDate, endDate, cubicles, reservations, totalCubicles);
    
    // Calculate summary statistics
    const summary = generateSummaryStatistics(daily, reservations, totalCubicles, cubicles);
    
    // Generate section analysis
    const sections = generateSectionAnalysis(cubicles, reservations, daily.length);
    
    // Generate user activity analysis
    const users = generateUserAnalysis(reservations);
    
    // Generate advanced analytics
    const advanced = generateAdvancedAnalytics(summary.avgUtilization, totalCubicles, reservations.length);

    return {
      summary,
      daily,
      sections,
      users,
      advanced
    };
  } catch (error) {
    logger.error('Error generating report data:', error);
    throw new Error(`Error generating report data: ${error.message}`);
  }
}

/**
 * Generate daily breakdown data for the report period
 * @param {Date} startDate - Start date of period
 * @param {Date} endDate - End date of period
 * @param {Array} cubicles - All cubicles data
 * @param {Array} reservations - All reservations in period
 * @param {number} totalCubicles - Total number of cubicles
 * @returns {Array} Daily breakdown data
 */
function generateDailyBreakdown(startDate, endDate, cubicles, reservations, totalCubicles) {
  const daily = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayReservations = reservations.filter(r => 
      r.date >= dayStart && r.date <= dayEnd
    );
    
    const reserved = dayReservations.length;
    const available = totalCubicles - reserved;
    const utilizationPercent = totalCubicles > 0 ? Math.round((reserved / totalCubicles) * 100) : 0;
    
    // Calculate error cubicles for this day
    const errorCubicles = cubicles.filter(c => c.status === 'error').length;
    
    // Get unique users for this day
    const activeUsers = new Set(
      dayReservations
        .filter(r => r.user && r.user.email)
        .map(r => r.user.email)
    ).size;

    daily.push({
      date: new Date(currentDate),
      dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
      reserved,
      available,
      error: errorCubicles,
      utilizationPercent,
      reservations: reserved,
      activeUsers
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return daily;
}

/**
 * Generate summary statistics for the report
 * @param {Array} daily - Daily breakdown data
 * @param {Array} reservations - All reservations
 * @param {number} totalCubicles - Total cubicles count
 * @param {Array} cubicles - All cubicles data
 * @returns {Object} Summary statistics
 */
function generateSummaryStatistics(daily, reservations, totalCubicles, cubicles) {
  const totalReservations = reservations.length;
  const avgUtilization = daily.reduce((sum, day) => sum + day.utilizationPercent, 0) / daily.length || 0;
  const peakUtilization = Math.max(...daily.map(day => day.utilizationPercent));
  const lowestUtilization = Math.min(...daily.map(day => day.utilizationPercent));
  
  const uniqueUsers = new Set(
    reservations
      .filter(r => r.user && r.user.email)
      .map(r => r.user.email)
  ).size;

  // Calculate error incidents from cubicle status
  const errorIncidents = cubicles.filter(c => c.status === 'error').length;

  return {
    totalCubicles,
    avgUtilization: Math.round(avgUtilization),
    peakUtilization,
    lowestUtilization,
    totalReservations,
    uniqueUsers,
    errorIncidents
  };
}

/**
 * Generate section analysis data
 * @param {Array} cubicles - All cubicles data
 * @param {Array} reservations - All reservations
 * @param {number} dailyCount - Number of days in period
 * @returns {Array} Section analysis data
 */
function generateSectionAnalysis(cubicles, reservations, dailyCount) {
  return CUBICLE_SECTIONS.map(section => {
    const sectionCubicles = cubicles.filter(c => c.section === section);
    const sectionReservations = reservations.filter(r => {
      return r.cubicle && r.cubicle.section === section;
    });
    
    const sectionTotal = sectionCubicles.length;
    const avgUtilization = sectionTotal > 0 ? 
      Math.round((sectionReservations.length / (sectionTotal * dailyCount)) * 100) : 0;
    
    // Calculate error incidents for this section
    const errorIncidents = sectionCubicles.filter(c => c.status === 'error').length;
    
    return {
      section,
      totalCubicles: sectionTotal,
      avgUtilization,
      peakUtilization: avgUtilization, // Using same as avg for now
      totalReservations: sectionReservations.length,
      errorIncidents
    };
  });
}

/**
 * Generate user activity analysis
 * @param {Array} reservations - All reservations with user data
 * @returns {Array} User analysis data sorted by total reservations
 */
function generateUserAnalysis(reservations) {
  const userMap = {};
  
  reservations.forEach(r => {
    if (r.user && r.user.email) {
      if (!userMap[r.user.email]) {
        userMap[r.user.email] = {
          email: r.user.email,
          displayName: r.user.displayName || '',
          reservations: [],
          sections: {}
        };
      }
      userMap[r.user.email].reservations.push(r);
      
      // Track section usage
      if (r.cubicle && r.cubicle.section) {
        const section = r.cubicle.section;
        userMap[r.user.email].sections[section] = (userMap[r.user.email].sections[section] || 0) + 1;
      }
    }
  });

  return Object.values(userMap).map(userData => {
    const totalReservations = userData.reservations.length;
    const daysActive = new Set(
      userData.reservations.map(r => r.date.toDateString())
    ).size;
    
    // Find favorite section
    let favoriteSection = '';
    let maxCount = 0;
    Object.entries(userData.sections).forEach(([section, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteSection = section;
      }
    });
    
    // Generate cubicle code sequence for this user
    const cubicleSequence = generateCubicleCodeSequence(userData.reservations);
    
    return {
      email: userData.email,
      displayName: userData.displayName,
      totalReservations,
      daysActive,
      favoriteSection,
      avgDailyReservations: daysActive > 0 ? +(totalReservations / daysActive).toFixed(2) : 0,
      cubicleSequence
    };
  }).sort((a, b) => b.totalReservations - a.totalReservations);
}

/**
 * Generate advanced analytics data
 * @param {number} avgUtilization - Average utilization percentage
 * @param {number} totalCubicles - Total number of cubicles
 * @param {number} totalReservations - Total number of reservations
 * @returns {Object} Advanced analytics data
 */
function generateAdvancedAnalytics(avgUtilization, totalCubicles, totalReservations) {
  const peakHours = generatePeakHoursData(avgUtilization);

  return {
    peakHours,
    trendAnalysis: {
      weekOverWeekChange: 0, // Would need previous week data
      utilizationTrend: 'stable',
      predictedNextWeek: Math.round(avgUtilization)
    },
    efficiency: {
      spaceTurnover: totalReservations > 0 ? +(totalCubicles / totalReservations).toFixed(2) : 0,
      averageSessionDuration: DEFAULT_SESSION_DURATION,
      utilizationEfficiency: Math.round(avgUtilization)
    }
  };
}

// ================================================================================
// API ROUTE HANDLERS
// ================================================================================

/**
 * GET /utilization-reports
 * Get all utilization reports with pagination and filtering
 * @route GET /api/utilization-reports
 * @access Protected (user)
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.page=1] - Page number for pagination
 * @param {number} [req.query.limit=10] - Number of records per page (max 100)
 * @param {string} [req.query.startDate] - Filter by start date (ISO format)
 * @param {string} [req.query.endDate] - Filter by end date (ISO format)
 */
router.get('/', validarUsuario, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: PAGINATION_CONFIG.MAX_LIMIT }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed for GET /utilization-reports:', errors.array());
      return res.status(400).json({ 
        success: false,
        message: 'Invalid query parameters',
        errors: errors.array() 
      });
    }

    const page = parseInt(req.query.page) || PAGINATION_CONFIG.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || PAGINATION_CONFIG.DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (req.query.startDate || req.query.endDate) {
      // Filter by generatedAt date for date picker functionality
      query.generatedAt = {};
      if (req.query.startDate) {
        query.generatedAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.generatedAt.$lte = new Date(req.query.endDate);
      }
    }

    const [reports, total] = await Promise.all([
      UtilizationReport.find(query)
        .sort({ generatedAt: -1 })
        .skip(skip)
        .limit(limit),
      UtilizationReport.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReports: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

    logger.info(`Retrieved ${reports.length} utilization reports for user ${req.user.uid}`);
  } catch (error) {
    logger.error('Error fetching utilization reports:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch utilization reports',
      error: error.message 
    });
  }
});

/**
 * GET /utilization-reports/:id
 * Get specific utilization report by ID
 * @route GET /api/utilization-reports/:id
 * @access Protected (user)
 * @param {string} req.params.id - MongoDB ObjectId of the report
 */
router.get('/:id', validarUsuario, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Invalid MongoDB ID for report retrieval:', req.params.id);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid report ID format',
        errors: errors.array() 
      });
    }

    const report = await UtilizationReport.findById(req.params.id);
    if (!report) {
      logger.warn(`Report not found: ${req.params.id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Utilization report not found' 
      });
    }

    res.json({
      success: true,
      data: report
    });

    logger.info(`Retrieved utilization report ${req.params.id} for user ${req.user.uid}`);
  } catch (error) {
    logger.error(`Error fetching utilization report ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch utilization report',
      error: error.message 
    });
  }
});

/**
 * POST /utilization-reports/generate
 * Generate a new utilization report for a specific date
 * @route POST /api/utilization-reports/generate
 * @access Protected (admin)
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.weekStart - Target date in ISO format (YYYY-MM-DD)
 */
router.post('/generate', ...rateLimiterCombinations.reportGeneration, validarUsuario, validarAdmin, [
  query('weekStart').isISO8601().withMessage('Date must be in ISO format (YYYY-MM-DD)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors for report generation:', errors.array());
      return res.status(400).json({ 
        success: false,
        message: 'Invalid date format',
        errors: errors.array(),
        expected: 'Date must be in YYYY-MM-DD format'
      });
    }

    const inputDateString = req.query.weekStart;
    const inputDate = new Date(inputDateString + 'T00:00:00.000Z');
    
    // Create start and end of day in UTC to avoid timezone conversions
    const dayStart = new Date(inputDateString + 'T00:00:00.000Z');
    const dayEnd = new Date(inputDateString + 'T23:59:59.999Z');

    logger.info(`Generating utilization report for date: ${inputDateString}`);

    // Generate report data
    const reportData = await generateReportData(dayStart, dayEnd);

    // Check if report already exists for this day to detect changes
    const existingReport = await UtilizationReport.findOne({
      reportStartDate: dayStart,
      reportEndDate: dayEnd
    });

    let report;
    let hasChanges = true;

    if (existingReport) {
      hasChanges = hasReportChanges(existingReport, reportData);
    }

    if (!existingReport || hasChanges) {
      // Create new report if no existing report or if there are changes
      report = new UtilizationReport({
        reportStartDate: dayStart,
        reportEndDate: dayEnd,
        ...reportData
      });
      await report.save();
      
      const changeType = existingReport && hasChanges ? 'updated due to changes' : 'created';
      logger.info(`Utilization report ${changeType} for date: ${inputDateString}`);
    } else {
      // No changes detected, return existing report
      report = existingReport;
      logger.info(`No changes detected, returning existing report for date: ${inputDateString}`);
    }

    res.status(200).json({
      success: true,
      data: report,
      message: hasChanges ? 'Report generated successfully' : 'Existing report returned (no changes detected)'
    });
  } catch (error) {
    logger.error(`Error generating utilization report for date ${req.query.weekStart}:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate utilization report',
      error: error.message 
    });
  }
});

/**
 * POST /utilization-reports/generate-current
 * Generate a report for the current day
 * @route POST /api/utilization-reports/generate-current
 * @access Protected (admin)
 */
router.post('/generate-current', ...rateLimiterCombinations.reportGeneration, validarUsuario, validarAdmin, async (req, res) => {
  try {
    // Get current date in simple YYYY-MM-DD format to avoid timezone issues
    const now = new Date();
    const currentDateString = now.toISOString().split('T')[0];
    
    // Create start and end of day in UTC to avoid timezone conversions
    const dayStart = new Date(currentDateString + 'T00:00:00.000Z');
    const dayEnd = new Date(currentDateString + 'T23:59:59.999Z');

    logger.info(`Generating current day utilization report for: ${currentDateString}`);

    // Generate report data
    const reportData = await generateReportData(dayStart, dayEnd);

    // Check if report already exists for this day to detect changes
    const existingReport = await UtilizationReport.findOne({
      reportStartDate: dayStart,
      reportEndDate: dayEnd
    });

    let report;
    let hasChanges = true;

    if (existingReport) {
      hasChanges = hasReportChanges(existingReport, reportData);
    }

    if (!existingReport || hasChanges) {
      // Create new report if no existing report or if there are changes
      report = new UtilizationReport({
        reportStartDate: dayStart,
        reportEndDate: dayEnd,
        ...reportData
      });
      await report.save();
      
      const changeType = existingReport && hasChanges ? 'updated due to changes' : 'created';
      logger.info(`Current day utilization report ${changeType}`);
    } else {
      // No changes detected, return existing report
      report = existingReport;
      logger.info('No changes detected, returning existing current day report');
    }

    res.status(200).json({
      success: true,
      data: report,
      message: hasChanges ? 'Current day report generated successfully' : 'Existing report returned (no changes detected)'
    });
  } catch (error) {
    logger.error('Error generating current day report:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate current day report',
      error: error.message 
    });
  }
});

/**
 * DELETE /utilization-reports/:id
 * Delete a utilization report
 * @route DELETE /api/utilization-reports/:id
 * @access Protected (admin)
 * @param {string} req.params.id - MongoDB ObjectId of the report to delete
 */
router.delete('/:id', ...rateLimiterCombinations.adminOperation, validarUsuario, validarAdmin, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Invalid MongoDB ID for report deletion:', req.params.id);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid report ID format',
        errors: errors.array() 
      });
    }

    const result = await UtilizationReport.findByIdAndDelete(req.params.id);
    if (!result) {
      logger.warn(`Attempt to delete non-existent report: ${req.params.id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Utilization report not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Utilization report deleted successfully' 
    });

    logger.info(`Utilization report ${req.params.id} deleted by admin user ${req.user.uid}`);
  } catch (error) {
    logger.error(`Error deleting utilization report ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete utilization report',
      error: error.message 
    });
  }
});

/**
 * GET /utilization-reports/:id/export
 * Export utilization report as Excel file
 * @route GET /api/utilization-reports/:id/export
 * @access Protected (user, rate limited)
 * @param {string} req.params.id - MongoDB ObjectId of the report to export
 */
router.get('/:id/export', ...rateLimiterCombinations.authenticatedExport, validarUsuario, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Invalid MongoDB ID for report export:', req.params.id);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid report ID format',
        errors: errors.array() 
      });
    }

    const report = await UtilizationReport.findById(req.params.id);
    if (!report) {
      logger.warn(`Export attempt for non-existent report: ${req.params.id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Utilization report not found for export' 
      });
    }

    logger.info(`Exporting utilization report ${req.params.id} with ${report.users.length} users`);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Utilization Report'],
      ['Report Start Date', report.reportStartDate.toLocaleDateString()],
      ['Report End Date', report.reportEndDate.toLocaleDateString()],
      ['Generated At', report.generatedAt.toLocaleString()],
      [''],
      ['Summary Statistics'],
      ['Total Cubicles', report.summary.totalCubicles],
      ['Average Utilization', `${report.summary.avgUtilization}%`],
      ['Peak Utilization', `${report.summary.peakUtilization}%`],
      ['Lowest Utilization', `${report.summary.lowestUtilization}%`],
      ['Total Reservations', report.summary.totalReservations],
      ['Unique Users', report.summary.uniqueUsers],
      ['Error Incidents', report.summary.errorIncidents]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sections Sheet
    const sectionsData = [
      ['Section', 'Total Cubicles', 'Avg Utilization %', 'Peak Utilization %', 'Total Reservations', 'Error Incidents']
    ];
    report.sections.forEach(section => {
      sectionsData.push([
        section.section,
        section.totalCubicles,
        section.avgUtilization,
        section.peakUtilization,
        section.totalReservations,
        section.errorIncidents
      ]);
    });
    const sectionsSheet = XLSX.utils.aoa_to_sheet(sectionsData);
    XLSX.utils.book_append_sheet(workbook, sectionsSheet, 'Section Analysis');

    // Users Sheet - Enhanced with cubicle sequences
    const usersData = [
      ['Email', 'Display Name', 'Total Reservations', 'Days Active', 'Favorite Section', 'Avg Daily Reservations', 'Cubicle Sequence']
    ];
    report.users.forEach(user => {
      usersData.push([
        user.email,
        user.displayName || '',
        user.totalReservations,
        user.daysActive,
        user.favoriteSection,
        user.avgDailyReservations,
        user.cubicleSequence || ''
      ]);
    });
    const usersSheet = XLSX.utils.aoa_to_sheet(usersData);
    XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');

    // Advanced Analytics Sheet - Simplified to only show Trend Analysis
    const advancedData = [
      ['Trend Analysis'],
      ['Week-over-Week Change', `${report.advanced.trendAnalysis.weekOverWeekChange}%`],
      ['Utilization Trend', report.advanced.trendAnalysis.utilizationTrend],
      ['Predicted Next Week', `${report.advanced.trendAnalysis.predictedNextWeek}%`]
    ];
    const advancedSheet = XLSX.utils.aoa_to_sheet(advancedData);
    XLSX.utils.book_append_sheet(workbook, advancedSheet, 'Advanced Analytics');

    // Generate Excel buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers for file download
    const filename = `utilization-report-${report.reportStartDate.toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

    logger.info(`Successfully exported utilization report ${req.params.id} as ${filename} for user ${req.user.uid}`);
  } catch (error) {
    logger.error(`Error exporting utilization report ${req.params.id}:`, error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to export utilization report',
      error: error.message 
    });
  }
});

module.exports = router;
