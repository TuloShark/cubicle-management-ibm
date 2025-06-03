// demo/api/firebaseAdmin.js
const admin = require('firebase-admin');

// Load credentials from environment variable (as JSON string)
const firebaseCredentialsJson = process.env.FIREBASE_CREDENTIALS_JSON;

let firebaseApp;

if (firebaseCredentialsJson) {
  try {
    const credentials = JSON.parse(firebaseCredentialsJson);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
      // Uncomment and set your storage bucket if needed:
      // storageBucket: 'your-bucket-name.appspot.com'
    });
  } catch (error) {
    console.error('Firebase credentials parsing error:', error);
    firebaseApp = null;
  }
} else {
  console.warn('FIREBASE_CREDENTIALS_JSON env variable not found - running in development mode');
  firebaseApp = null;
}

// Export admin with null check
module.exports = firebaseApp ? admin : { 
  auth: () => ({
    verifyIdToken: () => Promise.reject(new Error('Firebase not initialized')),
    getUser: () => Promise.reject(new Error('Firebase not initialized')),
    deleteUser: () => Promise.reject(new Error('Firebase not initialized')),
    updateUser: () => Promise.reject(new Error('Firebase not initialized'))
  })
};
