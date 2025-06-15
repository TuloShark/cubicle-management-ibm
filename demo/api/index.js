/**
 * @fileoverview Main Application Entry Point
 * @description Express.js application server for the IBM Cubicle Management System.
 * Handles server initialization, database connection, middleware setup, routing,
 * and real-time WebSocket communication.
 * 
 * @version 2.0.0
 * @author IBM Space Optimization Team
 * @since 1.0.0
 * 
 * @module MainApplication
 * 
 * Key Features:
 * - Express.js server with comprehensive middleware stack
 * - MongoDB integration with in-memory fallback for development
 * - Real-time WebSocket communication via Socket.IO
 * - JWT-based authentication and authorization
 * - Rate limiting and security middleware
 * - Comprehensive error handling and logging
 * - Modular statistics calculation
 * - Configurable grid-based cubicle seeding
 */

// Load environment configuration
require('dotenv').config();

// External dependencies
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { body, param, validationResult } = require('express-validator');

// Internal dependencies - Core modules
const logger = require('./logger');
const config = require('./config/appConfig');
const { calculateCubicleStatistics } = require('./utils/statisticsUtils');

// Internal dependencies - Models
const Cubicle = require('./models/Cubicle');
const Reservation = require('./models/Reservation');

// Internal dependencies - Middleware
const { validarUsuario, validarAdmin } = require('./middleware/auth');
const { rateLimiters } = require('./middleware/rateLimiting');
const { requestIdMiddleware, errorHandler, notFoundHandler, asyncErrorHandler } = require('./middleware/errorMiddleware');

// Internal dependencies - Controllers and Services
const utilizationController = require('./controllers/utilizationController');
const notificationController = require('./controllers/notificationController');
const NotificationOrchestrator = require('./services/notifications/NotificationOrchestrator');

// ================================================================================
// GLOBAL ERROR HANDLERS
// ================================================================================

/**
 * Global uncaught exception handler
 * Logs critical errors and attempts graceful shutdown
 */
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception - Application will terminate:', {
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  
  // Attempt graceful shutdown
  process.exit(1);
});

/**
 * Global unhandled promise rejection handler
 * Logs promise rejections for debugging
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString()
  });
  
  // In production, we might want to terminate the process
  if (config.IS_PRODUCTION) {
    process.exit(1);
  }
});

// ================================================================================
// CUBICLE SEEDING UTILITIES
// ================================================================================

/**
 * Generate cubicle data for seeding based on grid configuration
 * @returns {Array} Array of cubicle objects ready for database insertion
 */
function generateCubicleData() {
  const cubicles = [];
  let cubicleCounter = 1;
  
  logger.info('Generating cubicle data for seeding', {
    totalRows: config.GRID_CONFIG.TOTAL_ROWS,
    totalCols: config.GRID_CONFIG.TOTAL_COLS,
    totalCubicles: config.GRID_CONFIG.TOTAL_CUBICLES
  });
  
  // Create cubicles using grid configuration
  for (let row = 1; row <= config.GRID_CONFIG.TOTAL_ROWS; row++) {
    for (let col = 1; col <= config.GRID_CONFIG.TOTAL_COLS; col++) {
      const section = config.getSectionForRow(row);
      
      cubicles.push({
        section,
        row,
        col,
        serial: config.generateCubicleSerial(section, row, cubicleCounter),
        name: config.generateCubicleName(cubicleCounter),
        status: 'available',
        description: config.GRID_CONFIG.NAMING.DEFAULT_DESCRIPTION,
        createdBy: 'system-seed' // Required field for audit trail
      });
      
      cubicleCounter++;
    }
  }
  
  return cubicles;
}

/**
 * Seed database with cubicle data
 * @returns {Promise<void>}
 */
async function seedCubicles() {
  try {
    // Clear existing cubicles
    const deleteResult = await Cubicle.deleteMany({});
    logger.info(`Cleared ${deleteResult.deletedCount} existing cubicles`);
    
    // Generate and insert new cubicles
    const cubicles = generateCubicleData();
    const insertResult = await Cubicle.insertMany(cubicles);
    
    logger.info(`Successfully seeded ${insertResult.length} cubicles in ${config.GRID_CONFIG.TOTAL_ROWS}x${config.GRID_CONFIG.TOTAL_COLS} grid layout`, {
      sections: config.GRID_CONFIG.SECTION_IDS,
      totalCubicles: insertResult.length
    });
    
  } catch (error) {
    logger.error('Error seeding cubicles:', error);
    throw new Error(`Cubicle seeding failed: ${error.message}`);
  }
}

// ================================================================================
// DATABASE OPERATIONS
// ================================================================================

/**
 * Initialize database connection
 * @returns {Promise<string>} Database URI
 */
async function initializeDatabase() {
  let uri;
  let mongod;
  
  if (config.ENV.MONGO_URI) {
    uri = config.ENV.MONGO_URI;
    logger.info(`Connecting to persistent MongoDB`, { uri: uri.replace(/\/\/.*@/, '//***:***@') });
  } else {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    logger.info(`Starting in-memory MongoDB for development`, { uri });
  }
  
  // Connect mongoose with retry logic
  const connectOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: config.DATABASE_CONFIG.CONNECTION.TIMEOUT,
    socketTimeoutMS: 45000,
  };
  
  await mongoose.connect(uri, connectOptions);
  logger.info('MongoDB connection established successfully');
  
  return uri;
}

/**
 * Create database indexes for optimal performance
 * @param {Object} res - Express response object for endpoint
 */
async function createDatabaseIndexes(res) {
  try {
    const db = mongoose.connection.db;
    const indexResults = [];
    
    // Reservation collection indexes
    const reservationIndexes = [
      { 
        spec: { date: 1, cubicle: 1 }, 
        options: { name: 'date_cubicle_idx', background: true, sparse: true }
      },
      { 
        spec: { date: 1 }, 
        options: { name: 'date_idx', background: true }
      },
      { 
        spec: { 'user.uid': 1, date: 1 }, 
        options: { name: 'user_date_idx', background: true, sparse: true }
      }
    ];
    
    // Cubicle collection indexes
    const cubicleIndexes = [
      { 
        spec: { section: 1, status: 1 }, 
        options: { name: 'section_status_idx', background: true }
      },
      { 
        spec: { section: 1, row: 1, col: 1 }, 
        options: { name: 'position_idx', background: true, unique: true }
      }
    ];
    
    // Create reservation indexes
    for (const index of reservationIndexes) {
      await db.collection('reservations').createIndex(index.spec, index.options);
      indexResults.push({ collection: 'reservations', name: index.options.name });
    }
    
    // Create cubicle indexes
    for (const index of cubicleIndexes) {
      await db.collection('cubicles').createIndex(index.spec, index.options);
      indexResults.push({ collection: 'cubicles', name: index.options.name });
    }
    
    // Get current indexes to verify
    const [reservationIndexList, cubicleIndexList] = await Promise.all([
      db.collection('reservations').indexes(),
      db.collection('cubicles').indexes()
    ]);
    
    logger.info('Database indexes created successfully', { 
      created: indexResults.length,
      reservationIndexes: reservationIndexList.length,
      cubicleIndexes: cubicleIndexList.length
    });
    
    if (res) {
      res.json({
        success: true,
        message: 'Database indexes created successfully',
        indexes: {
          reservations: reservationIndexList.map(i => ({ name: i.name, key: i.key })),
          cubicles: cubicleIndexList.map(i => ({ name: i.name, key: i.key }))
        },
        created: indexResults
      });
    }
    
  } catch (error) {
    logger.error('Error creating database indexes:', error);
    if (res) {
      res.status(500).json({ 
        success: false,
        error: 'Failed to create database indexes', 
        details: error.message 
      });
    }
    throw error;
  }
}

// ================================================================================
// STATISTICS AND WEBSOCKET OPERATIONS
// ================================================================================

/**
 * Get comprehensive cubicle statistics
 * Uses the centralized statistics utility for consistency
 * 
 * @returns {Promise<Object>} Complete statistics object
 */
async function getCubicleStatistics() {
  try {
    const [cubicles, reservations] = await Promise.all([
      Cubicle.find().lean(),
      Reservation.find().lean()
    ]);
    
    return calculateCubicleStatistics(cubicles, reservations);
    
  } catch (error) {
    logger.error('Error calculating cubicle statistics:', error);
    throw new Error(`Statistics calculation failed: ${error.message}`);
  }
}

/**
 * Emit statistics update to all connected WebSocket clients
 * @param {Object} io - Socket.IO server instance
 */
async function emitStatisticsUpdate(io) {
  try {
    const stats = await getCubicleStatistics();
    io.emit(config.WEBSOCKET_CONFIG.EVENTS.STATISTICS_UPDATE, stats);
    logger.info('Statistics update emitted to all connected clients', {
      clientCount: io.engine.clientsCount || 0,
      timestamp: stats.timestamp
    });
  } catch (error) {
    logger.error('Error emitting statistics update:', error);
  }
}

// ================================================================================
// VALIDATION MIDDLEWARE
// ================================================================================

/**
 * Handle validation errors from express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Next middleware function
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors.array(),
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
}

// ================================================================================
// MAIN APPLICATION FUNCTION
// ================================================================================

/**
 * Main application initialization function
 * Handles all server setup, database connection, middleware configuration, and routing
 * 
 * @returns {Promise<void>}
 */
async function startApplication() {
  try {
    // Validate configuration before starting
    const configValidation = config.validateConfig();
    if (!configValidation.isValid) {
      logger.error('Configuration validation failed:', configValidation.errors);
      process.exit(1);
    }
    
    logger.info('Starting Cubicle Management System', {
      version: '2.0.0',
      environment: config.ENV.NODE_ENV,
      port: config.ENV.PORT
    });
    
    // Initialize notification orchestrator
    const notificationOrchestrator = new NotificationOrchestrator();
    
    // Initialize database connection
    await initializeDatabase();
    
    // Seed data if requested
    if (config.ENV.SEED_DATA) {
      await seedCubicles();
    }
    
    // Express application setup
    const app = express();
    const server = http.createServer(app);
    
    // Socket.IO setup with configuration
    const io = socketIo(server, config.WEBSOCKET_CONFIG.CONNECTION);
    app.set('io', io);
    
    // ================================================================================
    // MIDDLEWARE SETUP
    // ================================================================================
    
    // Request ID and logging middleware
    app.use(requestIdMiddleware);
    
    // Core middleware stack
    app.use(cors(config.SERVER_CONFIG.CORS));
    
    app.use(express.json({ limit: config.SERVER_CONFIG.LIMITS.JSON_LIMIT }));
    app.use(express.urlencoded({ 
      extended: true, 
      limit: config.SERVER_CONFIG.LIMITS.URL_ENCODED_LIMIT,
      parameterLimit: config.SERVER_CONFIG.LIMITS.PARAMETER_LIMIT
    }));
    
    // Security and rate limiting
    app.use(rateLimiters.api);
    
    // ================================================================================
    // HEALTH CHECK ENDPOINTS
    // ================================================================================
    
    // Basic health check
    app.get(config.SERVER_CONFIG.HEALTH.ENDPOINT, (req, res) => {
      res.status(200).send('OK');
    });
    
    // Detailed API health check
    app.get(config.SERVER_CONFIG.HEALTH.API_ENDPOINT, (req, res) => {
      res.json({ 
        success: true,
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: config.ENV.NODE_ENV,
        uptime: process.uptime()
      });
    });
    
    // ================================================================================
    // TESTING ENDPOINTS (DEVELOPMENT ONLY)
    // ================================================================================
    
    if (config.TESTING_CONFIG.ENDPOINTS.ENABLED) {
      // Test notification system
      app.post(
        config.TESTING_CONFIG.ENDPOINTS.HEALTH_NOTIFICATION,
        rateLimiters.admin,
        validarUsuario,
        validarAdmin,
        asyncErrorHandler(async (req, res) => {
          const healthData = {
            ...config.TESTING_CONFIG.MOCK_DATA.HEALTH_DATA,
            systemUptime: process.uptime()
          };
          
          await notificationOrchestrator.slackService.sendSystemHealthNotification(healthData);
          
          res.json({ 
            success: true,
            message: 'Health notification sent successfully', 
            data: healthData 
          });
        })
      );
      
      // Test statistics update
      app.post(
        config.TESTING_CONFIG.ENDPOINTS.STATS_UPDATE,
        asyncErrorHandler(async (req, res) => {
          const emitFunction = req.app.get('emitStatisticsUpdate');
          if (emitFunction) {
            await emitFunction();
            res.json({ 
              success: true,
              message: 'Statistics update triggered successfully' 
            });
          } else {
            res.status(500).json({ 
              success: false,
              error: 'Statistics update function not available' 
            });
          }
        })
      );
    }
    
    // ================================================================================
    // CONTROLLER ROUTES
    // ================================================================================
    
    // Add date-based cubicle controller
    const dateCubicleController = require('./controllers/dateCubicleController');
    app.use('/api/cubicles', dateCubicleController);
    
    // Utilization and notification controllers
    app.use('/api/utilization-reports', utilizationController);
    app.use('/api/notifications', notificationController);
    
    // ================================================================================
    // ADMIN ENDPOINTS
    // ================================================================================
    
    // Database index creation endpoint
    app.post(
      '/api/admin/create-date-indexes',
      rateLimiters.admin,
      validarUsuario,
      validarAdmin,
      asyncErrorHandler(async (req, res) => {
        await createDatabaseIndexes(res);
      })
    );
    
    // ================================================================================
    // CUBICLE RESERVATION ENDPOINT
    // ================================================================================
    
    app.post(
      '/reserve',
      validarUsuario,
      [
        body('cubicleId').isString().notEmpty().withMessage('Cubicle ID is required'),
        body('date').optional().isISO8601().withMessage('Date must be in ISO 8601 format'),
      ],
      handleValidationErrors,
      asyncErrorHandler(async (req, res) => {
        const { cubicleId, date } = req.body;
        
        // Find and validate cubicle
        const cubicle = await Cubicle.findById(cubicleId);
        logger.info('Reservation request received', { 
          cubicleId, 
          user: req.user.uid,
          requestId: req.id 
        });
        
        if (!cubicle || cubicle.status !== 'available') {
          logger.warn('Reservation failed - cubicle not available', { 
            cubicleId, 
            status: cubicle?.status,
            requestId: req.id 
          });
          return res.status(400).json({ 
            success: false,
            error: 'Cubicle is not available for reservation' 
          });
        }
        
        // Update cubicle status
        cubicle.status = 'reserved';
        cubicle.lastModifiedBy = req.user.email || req.user.uid;
        await cubicle.save();
        
        // Create or update reservation
        const userInfo = {
          uid: req.user.uid,
          email: req.user.email,
          displayName: req.user.name || req.user.displayName || null
        };
        
        const reservation = await Reservation.findOneAndUpdate(
          { cubicle: cubicleId },
          { 
            cubicle: cubicleId, 
            user: userInfo, 
            date: date || new Date() 
          },
          { upsert: true, new: true }
        );
        
        logger.info('Reservation created successfully', { 
          reservationId: reservation._id,
          cubicleId,
          user: req.user.uid,
          requestId: req.id
        });
        
        // Emit real-time statistics update
        try {
          const emitFunction = req.app.get('emitStatisticsUpdate');
          if (emitFunction) {
            await emitFunction();
            logger.debug('Statistics update emitted after reservation');
          }
        } catch (emitError) {
          logger.warn('Failed to emit statistics update after reservation:', emitError);
        }
        
        res.json({
          success: true,
          data: reservation,
          message: 'Reservation created successfully'
        });
      })
    );
    
    // ================================================================================
    // REPORTING ENDPOINTS
    // ================================================================================
    
    // Daily reservation report (admin only)
    app.get(
      '/report/daily',
      rateLimiters.admin,
      validarUsuario,
      validarAdmin,
      asyncErrorHandler(async (req, res) => {
        const today = new Date().toISOString().slice(0, 10);
        const count = await Reservation.countDocuments({
          date: { $gte: new Date(today) }
        });
        
        res.json({ 
          success: true,
          data: { 
            date: today, 
            reservations: count 
          }
        });
      })
    );
    
    // Real-time cubicle statistics endpoint
    app.get(
      '/api/cubicle-stats',
      asyncErrorHandler(async (req, res) => {
        const stats = await getCubicleStatistics();
        res.json({
          success: true,
          data: stats
        });
      })
    );
    
    // ================================================================================
    // WEBSOCKET CONFIGURATION
    // ================================================================================
    
    io.on(config.WEBSOCKET_CONFIG.EVENTS.CONNECTION, (socket) => {
      logger.info('WebSocket client connected', { 
        socketId: socket.id,
        clientCount: io.engine.clientsCount || 0
      });
      
      // Send current statistics to newly connected client
      getCubicleStatistics()
        .then(stats => {
          socket.emit(config.WEBSOCKET_CONFIG.EVENTS.STATISTICS_UPDATE, stats);
        })
        .catch(err => {
          logger.error('Error sending initial statistics to new client:', err);
        });

      socket.on(config.WEBSOCKET_CONFIG.EVENTS.DISCONNECT, () => {
        logger.info('WebSocket client disconnected', { 
          socketId: socket.id,
          clientCount: Math.max(0, (io.engine.clientsCount || 1) - 1)
        });
      });
    });
    
    // Make emit function available to other modules
    app.set('emitStatisticsUpdate', () => emitStatisticsUpdate(io));
    
    // ================================================================================
    // ERROR HANDLING MIDDLEWARE
    // ================================================================================
    
    // 404 handler for undefined routes
    app.use(notFoundHandler);
    
    // Global error handler
    app.use(errorHandler);
    
    // ================================================================================
    // SERVER STARTUP
    // ================================================================================
    
    server.listen(config.ENV.PORT, () => {
      logger.info('Cubicle Management System started successfully', {
        port: config.ENV.PORT,
        environment: config.ENV.NODE_ENV,
        version: '2.0.0',
        timestamp: new Date().toISOString()
      });
    });
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        mongoose.connection.close(false, () => {
          logger.info('MongoDB connection closed');
          process.exit(0);
        });
      });
    });
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// ================================================================================
// APPLICATION ENTRY POINT
// ================================================================================

// Start the application
startApplication().catch(error => {
  logger.error('Critical error during application startup:', error);
  process.exit(1);
});
