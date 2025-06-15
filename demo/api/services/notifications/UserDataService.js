/**
 * @fileoverview User Data Service
 * @description Enterprise-grade user data processing service for the IBM Space Optimization 
 * platform. Provides comprehensive user reservation analytics, cubicle sequence generation,
 * statistical calculations, and data aggregation with performance optimization.
 * 
 * @version 2.0.0
 * @author IBM Space Optimization Team
 * @since 2.0.0
 * 
 * @module UserDataService
 * 
 * Key Features:
 * - User reservation data aggregation and analytics
 * - Intelligent cubicle sequence compression and formatting
 * - Statistical calculations (totals, averages, trends)
 * - Date filtering and historical data processing
 * - Performance-optimized database queries
 * - Comprehensive input validation
 * - User activity tracking and metrics
 * - Section preference analysis
 * 
 * Dependencies:
 * - Reservation: MongoDB model for reservation data
 * - logger: Application logging service
 * 
 * Database Collections Used:
 * - reservations: User reservation data with cubicle references
 * - cubicles: Cubicle information and metadata
 */

const logger = require('../../logger');
const Reservation = require('../../models/Reservation');

/**
 * @class UserDataService
 * @description Specialized service for processing user reservation data and generating 
 * comprehensive analytics for notification purposes. Handles complex data aggregation,
 * sequence generation, and statistical calculations with performance optimization.
 * 
 * This service processes raw reservation data into meaningful user statistics and 
 * generates compressed cubicle sequences for efficient notification delivery.
 * 
 * @example
 * ```javascript
 * const userService = new UserDataService();
 * 
 * // Get all users with statistics
 * const users = await userService.getUsersWithCubicleSequences();
 * 
 * // Get specific user data with date filter
 * const userData = await userService.getUserCubicleSequence('user-123', '2024-12-15');
 * 
 * // Generate sequence from reservations
 * const sequence = userService.generateCubicleCodeSequence(reservations);
 * ```
 */
class UserDataService {
  /**
   * Get all users with their cubicle sequences and computed statistics
   * 
   * @async
   * @method getUsersWithCubicleSequences
   * @description Retrieves and processes all user reservation data to generate comprehensive 
   * statistics including total reservations, active days, favorite sections, average daily 
   * usage, and compressed cubicle sequences. Optimized for bulk notification processing.
   * 
   * @returns {Promise<Array<Object>>} Array of user objects with computed statistics
   * @returns {string} returns[].email - User's email address
   * @returns {string} [returns[].displayName] - User's display name
   * @returns {string} returns[].uid - Firebase user ID
   * @returns {number} returns[].totalReservations - Total number of reservations
   * @returns {number} returns[].daysActive - Number of unique days with reservations
   * @returns {string} [returns[].favoriteSection] - Most frequently used cubicle section
   * @returns {number} returns[].avgDailyReservations - Average reservations per active day
   * @returns {string} returns[].cubicleSequence - Compressed cubicle sequence string
   * @returns {Date|null} [returns[].lastActivity] - Date of most recent reservation
   * 
   * @throws {Error} When database connection fails
   * @throws {Error} When reservation data is corrupted
   * 
   * @example
   * ```javascript
   * const users = await userService.getUsersWithCubicleSequences();
   * 
   * users.forEach(user => {
   *   console.log(`${user.email}: ${user.totalReservations} reservations`);
   *   console.log(`Favorite section: ${user.favoriteSection}`);
   *   console.log(`Sequence: ${user.cubicleSequence}`);
   * });
   * ```
   * 
   * @since 2.0.0
   */
  async getUsersWithCubicleSequences() {
    try {
      // Get all reservations with user and cubicle data
      const reservations = await Reservation.find()
        .populate('cubicle')
        .lean();

      if (reservations.length === 0) {
        return [];
      }

      // Group reservations by user
      const userMap = {};
      reservations.forEach(reservation => {
        if (!reservation.user || !reservation.user.email) return;
        
        const email = reservation.user.email;
        if (!userMap[email]) {
          userMap[email] = {
            email: email,
            displayName: reservation.user.displayName || '',
            uid: reservation.user.uid || '',
            reservations: [],
            sections: {}
          };
        }
        
        userMap[email].reservations.push(reservation);
        
        // Track section usage
        if (reservation.cubicle && reservation.cubicle.section) {
          const section = reservation.cubicle.section;
          userMap[email].sections[section] = (userMap[email].sections[section] || 0) + 1;
        }
      });

      // Convert to array and add computed fields
      return Object.values(userMap).map(userData => {
        return this.calculateUserStatistics(userData);
      });

    } catch (error) {
      logger.error('Error getting users with cubicle sequences:', error);
      throw error;
    }
  }

  /**
   * Get single user's cubicle sequence and statistics
   * @param {string} userId - User ID to get cubicle sequence for
   * @param {string} [date] - Optional date filter in YYYY-MM-DD format
   * @returns {Object|null} User's cubicle sequence data or null if no reservations found
   */
  async getUserCubicleSequence(userId, date = null) {
    try {
      let query = { 'user.uid': userId };
      
      // Filter by specific date if provided
      if (date) {
        const targetDate = new Date(date + 'T00:00:00.000Z');
        const nextDay = new Date(targetDate);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        
        query.date = {
          $gte: targetDate,
          $lt: nextDay
        };
      }
      
      const reservations = await Reservation.find(query)
        .populate('cubicle')
        .lean();

      if (reservations.length === 0) {
        return null;
      }

      const userData = {
        email: reservations[0].user.email,
        displayName: reservations[0].user.displayName || '',
        uid: reservations[0].user.uid,
        reservations: reservations,
        sections: {}
      };

      // Track section usage
      reservations.forEach(reservation => {
        if (reservation.cubicle && reservation.cubicle.section) {
          const section = reservation.cubicle.section;
          userData.sections[section] = (userData.sections[section] || 0) + 1;
        }
      });

      return this.calculateUserStatistics(userData);

    } catch (error) {
      logger.error(`Error getting cubicle sequence for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate user statistics from reservation data
   * @param {Object} userData - Raw user data with reservations
   * @returns {Object} User data with calculated statistics
   */
  calculateUserStatistics(userData) {
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
    
    // Generate cubicle sequence
    const cubicleSequence = this.generateCubicleCodeSequence(userData.reservations);
    
    return {
      email: userData.email,
      displayName: userData.displayName,
      uid: userData.uid,
      totalReservations,
      daysActive,
      favoriteSection,
      avgDailyReservations: daysActive > 0 ? +(totalReservations / daysActive).toFixed(2) : 0,
      cubicleSequence,
      lastActivity: userData.reservations.length > 0 ? 
        new Date(Math.max(...userData.reservations.map(r => new Date(r.date)))) : null
    };
  }

  /**
   * Generate compressed cubicle code sequences from reservation data
   * 
   * @method generateCubicleCodeSequence
   * @description Processes an array of reservation objects to generate an optimized, 
   * human-readable string representation of cubicle usage patterns. Groups reservations 
   * by date, identifies sequential cubicles, and compresses them into ranges for 
   * efficient display in notifications.
   * 
   * @param {Array<Object>} reservations - Array of reservation objects with cubicle data
   * @param {Object} reservations[].cubicle - Cubicle information object
   * @param {string} reservations[].cubicle.serial - Cubicle serial code (e.g., "A1-SOC CUB1")
   * @param {Date} reservations[].date - Reservation date
   * 
   * @returns {string} Compressed cubicle sequence string with ranges and groupings
   * @returns {string} '' - Empty string if no valid reservations provided
   * 
   * @example
   * ```javascript
   * const reservations = [
   *   { cubicle: { serial: 'A1-SOC CUB1' }, date: new Date('2024-12-15') },
   *   { cubicle: { serial: 'A1-SOC CUB2' }, date: new Date('2024-12-15') },
   *   { cubicle: { serial: 'A1-SOC CUB3' }, date: new Date('2024-12-15') },
   *   { cubicle: { serial: 'B2-SOC CUB5' }, date: new Date('2024-12-16') }
   * ];
   * 
   * const sequence = userService.generateCubicleCodeSequence(reservations);
   * // Returns: "A1-SOC CUB1-A1-SOC CUB3, B2-SOC CUB5"
   * ```
   * 
   * Algorithm Details:
   * 1. Filters out invalid reservations (missing cubicle data)
   * 2. Sorts by date first, then by cubicle serial code
   * 3. Groups reservations by date for temporal organization
   * 4. Identifies sequential cubicles within same section/row
   * 5. Compresses sequences into ranges (e.g., CUB1-CUB3)
   * 6. Joins all sequences with commas for readability
   * 
   * @since 2.0.0
   */
  generateCubicleCodeSequence(reservations) {
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
        if (this.isSequentialCode(sequenceEnd, codes[i])) {
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
   * @param {string} code1 - First cubicle code
   * @param {string} code2 - Second cubicle code
   * @returns {boolean} True if codes are sequential
   */
  isSequentialCode(code1, code2) {
    // Extract section, row, and number from codes like "A1-SOC CUB1"
    const regex = /([ABC])(\d+)-SOC CUB(\d+)/;
    const match1 = code1.match(regex);
    const match2 = code2.match(regex);
    
    if (!match1 || !match2) return false;
    
    const [, section1, row1, num1] = match1;
    const [, section2, row2, num2] = match2;
    
    // Must be same section and row, with consecutive numbers
    return section1 === section2 && 
           row1 === row2 && 
           parseInt(num2) === parseInt(num1) + 1;
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * @param {string} date - Date string to validate
   * @returns {boolean} True if valid date format
   */
  isValidDateFormat(date) {
    if (!date || typeof date !== 'string') return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    // Check if date is actually valid
    const parsedDate = new Date(date + 'T00:00:00.000Z');
    return parsedDate.toISOString().substring(0, 10) === date;
  }
}

module.exports = UserDataService;
