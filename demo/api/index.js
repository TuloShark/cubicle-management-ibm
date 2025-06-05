// demo/api/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const cors = require('cors');
const logger = require('./logger');
const Cubicle = require('./models/Cubicle');
const Reservation = require('./models/Reservation');
const { validarUsuario, validarAdmin } = require('./middleware/auth');
const usersController = require('./controllers/usersController');
const cubicleController = require('./controllers/cubicleController');
const utilizationController = require('./controllers/utilizationController');
const notificationController = require('./controllers/notificationController');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const http = require('http');
const socketIo = require('socket.io');
const NotificationService = require('./services/NotificationService');

// Add global error handlers at the very top
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});

// Utility to parse admin UIDs
function getAdminUids() {
  return (process.env.ADMIN_UIDS || '').split(',').map(u => u.trim()).filter(Boolean);
}

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs (increased from 100)
  standardHeaders: true,
  legacyHeaders: false,
});

async function start() {
  // Initialize notification service
  const notificationService = new NotificationService();

  // 1) Use persistent MongoDB if MONGO_URI is set, otherwise use in-memory for dev
  let uri;
  let mongod;
  if (process.env.MONGO_URI) {
    uri = process.env.MONGO_URI;
    logger.info(`Using persistent MongoDB at ${uri}`);
  } else {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    logger.info(`In-memory Mongo running at ${uri}`);
  }

  // 2) Connect mongoose
  await mongoose.connect(uri, { dbName: 'demo' });

  // 3) Optionally seed data
  if (process.env.SEED === 'true') {
    await Cubicle.deleteMany({});
    // Seed all cubicles with full info for sections A, B, C
    const cubicles = [];
    // Section A: 27 cubicles (3 cols x 9 rows)
    let aCount = 1;
    for (let i = 0; i < 27; i++) {
      const row = Math.floor(i / 3) + 1;
      const col = (i % 3) + 1;
      cubicles.push({
        section: 'A',
        row,
        col,
        serial: `A${row}-SOC CUB${aCount}`,
        name: `Cubicle ${aCount}`,
        status: 'available',
        description: 'More details about this cubicle will be added later.'
      });
      aCount++;
    }
    // Section B: 18 cubicles (3 cols x 6 rows)
    let bCount = 1;
    for (let i = 0; i < 18; i++) {
      const row = Math.floor(i / 3) + 1;
      const col = (i % 3) + 1;
      cubicles.push({
        section: 'B',
        row,
        col,
        serial: `B${row}-SOC CUB${bCount}`,
        name: `Cubicle ${bCount}`,
        status: 'available',
        description: 'More details about this cubicle will be added later.'
      });
      bCount++;
    }
    // Section C: 27 cubicles (3 cols x 9 rows)
    let cCount = 1;
    for (let i = 0; i < 27; i++) {
      const row = Math.floor(i / 3) + 1;
      const col = (i % 3) + 1;
      cubicles.push({
        section: 'C',
        row,
        col,
        serial: `C${row}-SOC CUB${cCount}`,
        name: `Cubicle ${cCount}`,
        status: 'available',
        description: 'More details about this cubicle will be added later.'
      });
      cCount++;
    }
    await Cubicle.insertMany(cubicles);
    logger.info('Seeded cubicles');
  }

  // 4) Express setup with Socket.io
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server, { 
    cors: { 
      origin: process.env.FRONTEND_URL || "http://localhost:8080",
      methods: ["GET", "POST"] 
    } 
  });
  
  // Make io available to controllers
  app.set('io', io);
  app.use(cors(), express.json(), apiLimiter);

  // Error handler for validation
  function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }

  // Healthcheck endpoint for Docker
  app.get('/health', (req, res) => res.send('OK'));
  app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

  // Test endpoint for notification system
  app.post('/api/test/health-notification', validarUsuario, validarAdmin, async (req, res) => {
    try {
      const healthData = {
        totalCubicles: 81,
        reservedCubicles: 45,
        errorCubicles: 2,
        systemUptime: process.uptime()
      };
      
      await notificationService.sendSystemHealthNotification(healthData);
      res.json({ message: 'Health notification sent successfully', healthData });
    } catch (error) {
      logger.error('Error sending test health notification:', error);
      res.status(500).json({ error: 'Failed to send health notification', details: error.message });
    }
  });

  app.use('/cubicles', cubicleController);

  // Protect /reserve route (user must be authenticated)
  app.post(
    '/reserve',
    validarUsuario,
    [
      body('cubicleId').isString().notEmpty(),
      body('date').optional().isISO8601(),
    ],
    handleValidationErrors,
    async (req, res) => {
      const { cubicleId, date } = req.body;
      const c = await Cubicle.findById(cubicleId);
      logger.info('[RESERVE] Request to reserve cubicle', { cubicleId, user: req.user });
      if (!c || c.status !== 'available') {
        logger.warn('[RESERVE] Cubicle not available', { cubicleId });
        return res.status(400).json({ error: 'Not available' });
      }
      c.status = 'reserved';
      await c.save();
      // Use authenticated user info
      const userInfo = {
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.user.name || req.user.displayName || null
      };
      logger.info('[RESERVE] Upserting reservation', { cubicleId, userInfo });
      // Upsert reservation for this cubicle (fix: always update or create one doc per cubicle)
      const r = await Reservation.findOneAndUpdate(
        { cubicle: cubicleId },
        { cubicle: cubicleId, user: userInfo, date: date || new Date() },
        { upsert: true, new: true }
      );
      logger.info('[RESERVE] Reservation upserted', { reservation: r });
      
      // Emit statistics update immediately after reservation
      try {
        const emitStatisticsUpdate = req.app.get('emitStatisticsUpdate');
        if (emitStatisticsUpdate) {
          await emitStatisticsUpdate();
          logger.info('[RESERVE] Statistics update emitted');
        }
      } catch (err) {
        logger.error('[RESERVE] Error emitting statistics update:', err);
      }
      
      res.json(r);
    }
  );

  // Protect /report/daily route (admin only)
  app.get('/report/daily', validarUsuario, validarAdmin, async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const count = await Reservation.countDocuments({
      date: { $gte: today }
    });
    res.json({ date: today, reservations: count });
  });

  // Test endpoint to manually trigger statistics update (for debugging)
  app.post('/test-stats-update', async (req, res) => {
    try {
      const emitStatisticsUpdate = req.app.get('emitStatisticsUpdate');
      if (emitStatisticsUpdate) {
        await emitStatisticsUpdate();
        res.json({ message: 'Statistics update triggered successfully' });
      } else {
        res.status(500).json({ error: 'Statistics update function not available' });
      }
    } catch (err) {
      logger.error('Error in test stats update:', err);
      res.status(500).json({ error: 'Failed to trigger statistics update' });
    }
  });

  app.use('/api/users', usersController);
  app.use('/api/utilization-reports', utilizationController);
  app.use('/api/notifications', notificationController);

  // Real-time cubicle statistics endpoint
  app.get('/api/cubicle-stats', async (req, res) => {
    try {
      const stats = await getCubicleStatistics();
      res.json(stats);
    } catch (err) {
      logger.error('Error fetching cubicle statistics:', err);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // WebSocket connection handling for real-time statistics
  io.on('connection', (socket) => {
    logger.info('User connected to real-time statistics');
    
    // Send current statistics to newly connected client
    getCubicleStatistics().then(stats => {
      socket.emit('statisticsUpdate', stats);
    }).catch(err => {
      logger.error('Error sending initial stats:', err);
    });

    socket.on('disconnect', () => {
      logger.info('User disconnected from real-time statistics');
    });
  });

  // Helper function to calculate and return cubicle statistics
  async function getCubicleStatistics() {
    try {
      const cubicles = await Cubicle.find();
      const reservations = await Reservation.find();
      
      const total = cubicles.length;
      const reserved = cubicles.filter(c => c.status === 'reserved').length;
      const available = cubicles.filter(c => c.status === 'available').length;
      const error = cubicles.filter(c => c.status === 'error').length;

      // General statistics
      const general = {
        total,
        reserved,
        available,
        error,
        percentReserved: total ? Math.round((reserved / total) * 100) : 0,
        percentAvailable: total ? Math.round((available / total) * 100) : 0,
        percentError: total ? Math.round((error / total) * 100) : 0,
      };

      // Per-user statistics
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

      // Section-wise statistics
      const sectionStats = ['A', 'B', 'C'].map(section => {
        const sectionCubicles = cubicles.filter(c => c.section === section);
        const sectionReserved = sectionCubicles.filter(c => c.status === 'reserved').length;
        const sectionTotal = sectionCubicles.length;
        
        return {
          section,
          total: sectionTotal,
          reserved: sectionReserved,
          available: sectionTotal - sectionReserved,
          percentReserved: sectionTotal ? Math.round((sectionReserved / sectionTotal) * 100) : 0
        };
      });

      // Comparison metrics
      const topUser = userStats[0] || null;
      const bottomUser = userStats.length > 1 ? userStats[userStats.length - 1] : null;
      const avgReservationsPerUser = userStats.length > 0 ? (reserved / userStats.length).toFixed(1) : 0;
      
      const comparisons = [
        { metric: 'Total Users', value: userStats.length },
        { metric: 'Total Reservations', value: reserved },
        { metric: 'Average per User', value: avgReservationsPerUser },
        { metric: 'Most Active User', value: topUser ? `${topUser.user} (${topUser.reserved})` : 'None' },
        { metric: 'Least Active User', value: bottomUser ? `${bottomUser.user} (${bottomUser.reserved})` : 'None' },
        { metric: 'Utilization Rate', value: `${general.percentReserved}%` }
      ];

      return { 
        general, 
        users: userStats, 
        sections: sectionStats, 
        comparisons,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      logger.error('Error calculating statistics:', err);
      throw err;
    }
  }

  // Function to emit statistics update to all connected clients
  async function emitStatisticsUpdate() {
    try {
      const stats = await getCubicleStatistics();
      io.emit('statisticsUpdate', stats);
      logger.info('Statistics update emitted to all clients');
    } catch (err) {
      logger.error('Error emitting statistics update:', err);
    }
  }

  // Make emitStatisticsUpdate available to other modules
  app.set('emitStatisticsUpdate', emitStatisticsUpdate);

  // Use server.listen instead of app.listen for socket.io
  server.listen(process.env.PORT || 3000, () => {
    logger.info(`API listening on ${process.env.PORT || 3000}`);
  });
}

start().catch(err => logger.error(err));
