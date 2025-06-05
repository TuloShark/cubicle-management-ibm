const rateLimit = require('express-rate-limit');

// Separate rate limiter for Excel export endpoints (more permissive than general API)
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 export requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many export requests. Please wait before downloading another report.',
    retryAfter: '15 minutes'
  }
});

module.exports = { exportLimiter };
