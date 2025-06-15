/**
 * This module provides Firebase Admin SDK initialization and configuration
 * for the Cubicle Management System. It handles secure credential loading,
 * initialization fallbacks, and provides a standardized interface for
 * Firebase operations throughout the application.
 * 
 * @version 1.0.0
 * @author IBM Space Optimization Team
 * @since 1.0.0
 * 
 * ================================================================================
 * FIREBASE ADMIN SDK CONFIGURATION
 * ================================================================================
 * 
 * Key Features:
 * - Secure credential loading from environment variables
 * - Development mode fallbacks for testing
 * - Comprehensive error handling and logging
 * - Type-safe mock services for non-Firebase environments
 * - Enterprise-grade security validation
 * 
 * Security Considerations:
 * - Credentials are loaded from environment variables only
 * - No hardcoded credentials or configuration
 * - Secure JSON parsing with validation
 * - Graceful degradation in development environments
 * 
 */

const admin = require('firebase-admin');

// ================================================================================
// CONFIGURATION CONSTANTS
// ================================================================================

/**
 * Firebase configuration constants
 */
const FIREBASE_CONFIG = {
  CREDENTIALS_ENV_VAR: 'FIREBASE_CREDENTIALS_JSON',
  MAX_CREDENTIAL_SIZE: 10 * 1024, // 10KB max for credentials JSON
  REQUIRED_CREDENTIAL_FIELDS: [
    'type',
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri'
  ],
  DEVELOPMENT_MODE_WARNING: 'FIREBASE_CREDENTIALS_JSON env variable not found - running in development mode',
  INITIALIZATION_SUCCESS: 'Firebase Admin SDK initialized successfully',
  INITIALIZATION_FAILED: 'Firebase Admin SDK initialization failed'
};

/**
 * Mock Firebase services for development/testing environments
 */
const MOCK_FIREBASE_SERVICES = {
  auth: () => ({
    verifyIdToken: () => Promise.reject(new Error('Firebase not initialized - development mode')),
    getUser: () => Promise.reject(new Error('Firebase not initialized - development mode')),
    deleteUser: () => Promise.reject(new Error('Firebase not initialized - development mode')),
    updateUser: () => Promise.reject(new Error('Firebase not initialized - development mode')),
    createCustomToken: () => Promise.reject(new Error('Firebase not initialized - development mode')),
    listUsers: () => Promise.reject(new Error('Firebase not initialized - development mode')),
    setCustomUserClaims: () => Promise.reject(new Error('Firebase not initialized - development mode'))
  }),
  firestore: () => ({
    collection: () => Promise.reject(new Error('Firebase not initialized - development mode')),
    doc: () => Promise.reject(new Error('Firebase not initialized - development mode'))
  }),
  storage: () => ({
    bucket: () => Promise.reject(new Error('Firebase not initialized - development mode'))
  })
};

// ================================================================================
// VALIDATION FUNCTIONS
// ================================================================================

/**
 * Validates Firebase credentials JSON structure
 * @param {Object} credentials - Parsed credentials object
 * @returns {boolean} True if credentials are valid
 * @throws {Error} If credentials are invalid
 */
function validateCredentials(credentials) {
  if (!credentials || typeof credentials !== 'object') {
    throw new Error('Credentials must be a valid JSON object');
  }

  const missingFields = FIREBASE_CONFIG.REQUIRED_CREDENTIAL_FIELDS.filter(
    field => !credentials[field]
  );

  if (missingFields.length > 0) {
    throw new Error(`Missing required credential fields: ${missingFields.join(', ')}`);
  }

  // Validate private key format
  if (!credentials.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Invalid private key format');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(credentials.client_email)) {
    throw new Error('Invalid client email format');
  }

  return true;
}

/**
 * Validates credentials JSON string size and format
 * @param {string} credentialsJson - Raw credentials JSON string
 * @returns {boolean} True if valid
 * @throws {Error} If invalid
 */
function validateCredentialsString(credentialsJson) {
  if (typeof credentialsJson !== 'string') {
    throw new Error('Credentials must be a JSON string');
  }

  if (credentialsJson.length > FIREBASE_CONFIG.MAX_CREDENTIAL_SIZE) {
    throw new Error(`Credentials JSON exceeds maximum size of ${FIREBASE_CONFIG.MAX_CREDENTIAL_SIZE} bytes`);
  }

  if (credentialsJson.length < 100) {
    throw new Error('Credentials JSON appears to be too short to be valid');
  }

  return true;
}

// ================================================================================
// FIREBASE INITIALIZATION
// ================================================================================

/**
 * Initialize Firebase Admin SDK with comprehensive error handling
 * @returns {Object|null} Firebase admin instance or null if initialization fails
 */
function initializeFirebase() {
  const firebaseCredentialsJson = process.env[FIREBASE_CONFIG.CREDENTIALS_ENV_VAR];

  if (!firebaseCredentialsJson) {
    console.warn(`[FIREBASE] ${FIREBASE_CONFIG.DEVELOPMENT_MODE_WARNING}`);
    return null;
  }

  try {
    // Validate credentials string
    validateCredentialsString(firebaseCredentialsJson);

    // Parse credentials JSON
    const credentials = JSON.parse(firebaseCredentialsJson);

    // Validate credentials structure
    validateCredentials(credentials);

    // Initialize Firebase Admin SDK
    const firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(credentials),
      // Note: Storage bucket can be configured via environment variables if needed
      // storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    console.log(`[FIREBASE] ${FIREBASE_CONFIG.INITIALIZATION_SUCCESS}`);
    return firebaseApp;

  } catch (error) {
    console.error(`[FIREBASE] ${FIREBASE_CONFIG.INITIALIZATION_FAILED}:`, {
      message: error.message,
      type: error.constructor.name,
      timestamp: new Date().toISOString()
    });
    return null;
  }
}

// ================================================================================
// MODULE INITIALIZATION
// ================================================================================

// Initialize Firebase on module load
const firebaseApp = initializeFirebase();

// ================================================================================
// EXPORTS
// ================================================================================

/**
 * Export Firebase Admin SDK instance or mock services for development
 * 
 * In production environments with valid credentials, exports the full Firebase Admin SDK.
 * In development/testing environments without credentials, exports mock services
 * that throw descriptive errors to prevent silent failures.
 * 
 * @module firebase
 * @exports {Object} Firebase Admin SDK instance or mock services
 */
module.exports = firebaseApp ? admin : MOCK_FIREBASE_SERVICES;
