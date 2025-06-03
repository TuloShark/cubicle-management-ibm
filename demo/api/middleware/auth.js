// demo/api/middleware/auth.js
const admin = require('../firebaseAdmin');
const { getAdminUids } = require('../utils/adminUtils');

// Middleware to validate Firebase ID token
async function validarUsuario(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }
  const token = authHeader.split(' ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.log('Firebase token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token', details: err.message });
  }
}

// Middleware to validate admin user
function validarAdmin(req, res, next) {
  const adminUids = getAdminUids();
  if (!req.user || !adminUids.includes(req.user.uid)) {
    return res.status(403).json({ error: 'Access denied: not an admin' });
  }
  next();
}

module.exports = { validarUsuario, validarAdmin };
