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
const { exportLimiter } = require('../middleware/rateLimiter');

/**
 * @file utilizationController.js
 * Express router for utilization report management endpoints.
 */

/**
 * Generate cubicle cod    ]);
    const usersSheet = XLSX.utils.aoa_to_sheet(usersData);
    XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');

    // Peak Hours Sheet - REMOVED as requesteduences for a user's reservations
 * @param {Array} reservations - User's reservations with populated cubicle data
 * @returns {String} Formatted cubicle codes
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
 * @param {String} code1 - First cubicle code
 * @param {String} code2 - Second cubicle code
 * @returns {Boolean} True if codes are sequential
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
 * Generate utilization report data for a given week
 * @param {Date} startDate - Start of the week
 * @param {Date} endDate - End of the week
 * @returns {Promise<Object>} Report data
 */
async function generateReportData(startDate, endDate) {
  try {
    const cubicles = await Cubicle.find();
    const reservations = await Reservation.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('cubicle');

    const totalCubicles = cubicles.length;
    
    // Daily breakdown
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

    // Summary statistics
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

    // Section analysis
    const sections = ['A', 'B', 'C'].map(section => {
      const sectionCubicles = cubicles.filter(c => c.section === section);
      const sectionReservations = reservations.filter(r => {
        return r.cubicle && r.cubicle.section === section;
      });
      
      const sectionTotal = sectionCubicles.length;
      const avgUtilization = sectionTotal > 0 ? 
        Math.round((sectionReservations.length / (sectionTotal * daily.length)) * 100) : 0;
      
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

    // User activity analysis
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
        
        // Track section usage - r.cubicle is now populated
        if (r.cubicle && r.cubicle.section) {
          const section = r.cubicle.section;
          userMap[r.user.email].sections[section] = (userMap[r.user.email].sections[section] || 0) + 1;
        }
      }
    });

    const users = Object.values(userMap).map(userData => {
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
      
      console.log(`User ${userData.email} - Reservations:`, userData.reservations.length, 
                  'Cubicle sequence:', cubicleSequence);
      
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

    // Advanced analytics
    const peakHours = [
      { hour: 9, utilizationPercent: Math.round(avgUtilization * 0.8) },
      { hour: 10, utilizationPercent: Math.round(avgUtilization * 1.2) },
      { hour: 14, utilizationPercent: Math.round(avgUtilization * 1.1) },
      { hour: 15, utilizationPercent: Math.round(avgUtilization * 0.9) }
    ];

    const advanced = {
      peakHours,
      trendAnalysis: {
        weekOverWeekChange: 0, // Would need previous week data
        utilizationTrend: 'stable',
        predictedNextWeek: Math.round(avgUtilization)
      },
      efficiency: {
        spaceTurnover: totalReservations > 0 ? +(totalCubicles / totalReservations).toFixed(2) : 0,
        averageSessionDuration: 8, // Assuming 8-hour sessions
        utilizationEfficiency: Math.round(avgUtilization)
      }
    };

    return {
      summary: {
        totalCubicles,
        avgUtilization: Math.round(avgUtilization),
        peakUtilization,
        lowestUtilization,
        totalReservations,
        uniqueUsers,
        errorIncidents
      },
      daily,
      sections,
      users,
      advanced
    };
  } catch (error) {
    throw new Error(`Error generating report data: ${error.message}`);
  }
}

/**
 * GET /utilization-reports
 * Get all utilization reports with pagination and filtering
 * @route GET /utilization-reports
 * @access Protected (user)
 */
router.get('/', validarUsuario, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
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

    const reports = await UtilizationReport.find(query)
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await UtilizationReport.countDocuments(query);

    res.json({
      reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalReports: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching utilization reports', details: err.message });
  }
});

/**
 * GET /utilization-reports/:id
 * Get specific utilization report by ID
 * @route GET /utilization-reports/:id
 * @access Protected (user)
 */
router.get('/:id', validarUsuario, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const report = await UtilizationReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching utilization report', details: err.message });
  }
});

/**
 * POST /utilization-reports/generate
 * Generate a new utilization report for a specific week
 * @route POST /utilization-reports/generate
 * @access Protected (admin)
 */
router.post('/generate', validarUsuario, validarAdmin, [
  query('weekStart').isISO8601().withMessage('Date must be in ISO format (YYYY-MM-DD)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors for report generation:', errors.array());
      return res.status(400).json({ 
        error: 'Invalid date format',
        details: errors.array(),
        expected: 'Date must be in YYYY-MM-DD format'
      });
    }

    console.log('Generating report with weekStart parameter:', req.query.weekStart);

    // Parse the date more simply to avoid timezone issues
    const inputDateString = req.query.weekStart; // Should be YYYY-MM-DD format
    const inputDate = new Date(inputDateString + 'T00:00:00.000Z'); // Force UTC to avoid timezone shifts
    
    // Create start and end of day in UTC to avoid timezone conversions
    const dayStart = new Date(inputDateString + 'T00:00:00.000Z');
    const dayEnd = new Date(inputDateString + 'T23:59:59.999Z');

    console.log('Generating custom report for:');
    console.log('Input date string:', inputDateString);
    console.log('Day start:', dayStart.toISOString());
    console.log('Day end:', dayEnd.toISOString());

    // Generate report data
    const reportData = await generateReportData(dayStart, dayEnd);
    
    console.log('Generated report data for Excel export:', {
      usersCount: reportData.users.length,
      sampleUser: reportData.users[0],
      hasAdvanced: !!reportData.advanced,
      advancedKeys: reportData.advanced ? Object.keys(reportData.advanced) : []
    });

    // Check if report already exists for this day to detect changes
    const existingReport = await UtilizationReport.findOne({
      weekStartDate: dayStart,
      weekEndDate: dayEnd
    });

    let report;
    let hasChanges = true;

    if (existingReport) {
      // Check if there are significant changes in the data
      hasChanges = (
        existingReport.summary.totalReservations !== reportData.summary.totalReservations ||
        existingReport.summary.uniqueUsers !== reportData.summary.uniqueUsers ||
        existingReport.summary.avgUtilization !== reportData.summary.avgUtilization ||
        existingReport.summary.errorIncidents !== reportData.summary.errorIncidents
      );
    }

    if (!existingReport || hasChanges) {
      // Always create new report if no existing report or if there are changes
      report = new UtilizationReport({
        weekStartDate: dayStart,
        weekEndDate: dayEnd,
        ...reportData
      });
      await report.save();
      
      if (existingReport && hasChanges) {
        console.log('Created new report for day due to changes:', dayStart.toISOString().split('T')[0]);
      } else {
        console.log('Created new report for day:', dayStart.toISOString().split('T')[0]);
      }
    } else {
      // No changes detected, return existing report
      report = existingReport;
      console.log('No changes detected, returning existing report for day:', dayStart.toISOString().split('T')[0]);
    }

    res.status(200).json(report);
  } catch (err) {
    res.status(500).json({ error: 'Error generating utilization report', details: err.message });
  }
});

/**
 * POST /utilization-reports/generate-current
 * Generate a report for the current day
 * @route POST /utilization-reports/generate-current
 * @access Protected (admin)
 */
router.post('/generate-current', validarUsuario, validarAdmin, async (req, res) => {
  try {
    // Get current date in simple YYYY-MM-DD format to avoid timezone issues
    const now = new Date();
    const currentDateString = now.toISOString().split('T')[0]; // Get YYYY-MM-DD format
    
    // Create start and end of day in UTC to avoid timezone conversions
    const dayStart = new Date(currentDateString + 'T00:00:00.000Z');
    const dayEnd = new Date(currentDateString + 'T23:59:59.999Z');

    console.log('Generating report for current day:');
    console.log('Current date string:', currentDateString);
    console.log('Day start:', dayStart.toISOString());
    console.log('Day end:', dayEnd.toISOString());

    // Generate report data
    const reportData = await generateReportData(dayStart, dayEnd);

    // Check if report already exists for this day to detect changes
    const existingReport = await UtilizationReport.findOne({
      weekStartDate: dayStart,
      weekEndDate: dayEnd
    });

    let report;
    let hasChanges = true;

    if (existingReport) {
      // Check if there are significant changes in the data
      hasChanges = (
        existingReport.summary.totalReservations !== reportData.summary.totalReservations ||
        existingReport.summary.uniqueUsers !== reportData.summary.uniqueUsers ||
        existingReport.summary.avgUtilization !== reportData.summary.avgUtilization ||
        existingReport.summary.errorIncidents !== reportData.summary.errorIncidents
      );
    }

    if (!existingReport || hasChanges) {
      // Always create new report if no existing report or if there are changes
      report = new UtilizationReport({
        weekStartDate: dayStart,
        weekEndDate: dayEnd,
        ...reportData
      });
      await report.save();
      
      if (existingReport && hasChanges) {
        console.log('Created new current day report due to changes');
      } else {
        console.log('Created new current day report');
      }
    } else {
      // No changes detected, return existing report
      report = existingReport;
      console.log('No changes detected, returning existing current day report');
    }

    res.status(200).json(report);
  } catch (err) {
    res.status(500).json({ error: 'Error generating current day report', details: err.message });
  }
});

/**
 * DELETE /utilization-reports/:id
 * Delete a utilization report
 * @route DELETE /utilization-reports/:id
 * @access Protected (admin)
 */
router.delete('/:id', validarUsuario, validarAdmin, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await UtilizationReport.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting utilization report', details: err.message });
  }
});

/**
 * GET /utilization-reports/:id/export
 * Export utilization report as Excel
 * @route GET /utilization-reports/:id/export
 * @access Protected (user)
 */
router.get('/:id/export', exportLimiter, validarUsuario, [
  param('id').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const report = await UtilizationReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    console.log('Exporting report with data:', {
      reportId: report._id,
      usersCount: report.users.length,
      hasAdvanced: !!report.advanced,
      sampleUser: report.users[0],
      sampleUserCubicleSequence: report.users[0]?.cubicleSequence
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Utilization Report'],
      ['Week Start Date', report.weekStartDate.toLocaleDateString()],
      ['Week End Date', report.weekEndDate.toLocaleDateString()],
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

    // Daily Sheet - REMOVED as requested

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
      console.log(`User ${user.email} cubicle sequence:`, user.cubicleSequence || 'MISSING');
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

    // Peak Hours Sheet - REMOVED as requested

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
    const filename = `utilization-report-${report.weekStartDate.toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Error exporting utilization report', details: err.message });
  }
});

module.exports = router;
