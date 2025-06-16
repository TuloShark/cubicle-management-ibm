/**
 * @fileoverview Firebase Configuration and Authentication Setup
 * 
 * Core Firebase initialization module for the IBM Space Optimization application.
 * Provides secure authentication configuration using environment variables and
 * exports the Firebase authentication instance for use throughout the application.
 * 
 * @author IBM Space Optimization Developer - Wander Jimenez Calvo
 * @version 1.0.0
 * @since 1.0.0
 * 
 * @description
 * This module handles Firebase project initialization with secure environment variable
 * configuration and provides the authentication service instance. It ensures proper
 * type safety for Firebase configuration and centralizes Firebase setup.
 * 
 * Required Environment Variables:
 * - VITE_API_KEY: Firebase API key
 * - VITE_AUTH_DOMAIN: Firebase authentication domain
 * - VITE_PROJECT_ID: Firebase project identifier
 * - VITE_STORAGE_BUCKET: Firebase storage bucket (for future use)
 * - VITE_MESSAGING_SENDER_ID: Firebase messaging sender ID
 * - VITE_APP_ID: Firebase application ID
 * 
 * @example
 * // Import authentication instance
 * import { auth } from '@/config/firebase';
 * 
 * // Use in authentication operations
 * import { signInWithEmailAndPassword } from 'firebase/auth';
 * const result = await signInWithEmailAndPassword(auth, email, password);
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * Firebase Configuration Interface
 * 
 * Defines the required structure for Firebase project configuration.
 * All properties correspond to Firebase console project settings and
 * should be provided via environment variables for security.
 * 
 * @interface FirebaseConfig
 * @property {string} apiKey - Firebase API key for project authentication
 * @property {string} authDomain - Firebase authentication domain
 * @property {string} projectId - Unique Firebase project identifier
 * @property {string} storageBucket - Firebase storage bucket URL
 * @property {string} messagingSenderId - Firebase Cloud Messaging sender ID
 * @property {string} appId - Firebase application identifier
 */
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Validate Environment Variables
 * 
 * Ensures all required Firebase environment variables are present and valid.
 * Provides clear error messages for missing configuration to aid in debugging.
 * 
 * @throws {Error} If any required environment variable is missing
 */
function validateEnvironmentVariables(): void {
  const requiredVars = [
    'VITE_API_KEY',
    'VITE_AUTH_DOMAIN', 
    'VITE_PROJECT_ID',
    'VITE_STORAGE_BUCKET',
    'VITE_MESSAGING_SENDER_ID',
    'VITE_APP_ID'
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env file and ensure all Firebase configuration variables are set.'
    );
  }
}

// Validate environment variables before initialization
validateEnvironmentVariables();

/**
 * Firebase Project Configuration
 * 
 * Configuration object built from environment variables. This approach ensures
 * sensitive Firebase credentials are not hardcoded and can be managed securely
 * across different deployment environments (development, staging, production).
 */
const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY, 
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

/**
 * Firebase Application Instance
 * 
 * Initialized Firebase application using the validated configuration.
 * This instance serves as the foundation for all Firebase services.
 */
const app = initializeApp(firebaseConfig);

/**
 * Firebase Authentication Instance
 * 
 * Pre-configured authentication service instance for the application.
 * Use this instance for all authentication operations including sign-in,
 * sign-out, user management, and authentication state monitoring.
 * 
 * @example
 * // Sign in user
 * import { signInWithEmailAndPassword } from 'firebase/auth';
 * import { auth } from '@/config/firebase';
 * 
 * const userCredential = await signInWithEmailAndPassword(auth, email, password);
 * const user = userCredential.user;
 * 
 * @example
 * // Monitor authentication state
 * import { onAuthStateChanged } from 'firebase/auth';
 * import { auth } from '@/config/firebase';
 * 
 * onAuthStateChanged(auth, (user) => {
 *   if (user) {
 *     console.log('User is signed in:', user.uid);
 *   } else {
 *     console.log('User is signed out');
 *   }
 * });
 */
export const auth = getAuth(app);

/**
 * Default Export: Firebase Application Instance
 * 
 * Exports the main Firebase application instance for use with additional
 * Firebase services if needed in the future (Firestore, Storage, etc.).
 * 
 * @example
 * // Import for additional services
 * import app from '@/config/firebase';
 * import { getFirestore } from 'firebase/firestore';
 * 
 * const db = getFirestore(app);
 */
export default app;
