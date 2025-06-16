/**
 * @fileoverview Environment Variable Type Definitions
 * 
 * TypeScript declarations for Vite environment variables used in the IBM Space
 * Optimization application. Provides type safety and IDE autocomplete for
 * environment-specific configuration.
 * 
 * @author IBM Space Optimization Team
 * @version 1.1.0
 * @since 1.0.0
 * 
 * @description
 * This file defines TypeScript interfaces for all environment variables used
 * in the frontend application. All variables use the VITE_ prefix to ensure
 * they are exposed to the client-side bundle.
 * 
 * Required Environment Variables:
 * - Firebase configuration variables (VITE_API_KEY, etc.)
 * 
 * Optional Environment Variables:
 * - VITE_ADMIN_UIDS: Comma-separated Firebase UIDs for admin users
 * - VITE_SENTRY_DSN: Sentry error monitoring configuration
 * - VITE_API_BASE_URL: Backend API base URL override
 * - VITE_ENVIRONMENT: Application environment identifier
 * 
 * @example
 * // Access environment variables with type safety
 * const apiKey = import.meta.env.VITE_API_KEY;
 * const adminUids = import.meta.env.VITE_ADMIN_UIDS || '';
 * 
 * // Environment-specific logic
 * if (import.meta.env.VITE_ENVIRONMENT === 'development') {
 *   console.log('Development mode enabled');
 * }
 */

/// <reference types="vite/client" />

/**
 * Environment Variables Interface
 * 
 * Extends Vite's ImportMetaEnv to include application-specific environment
 * variables with proper TypeScript type definitions.
 * 
 * @interface ImportMetaEnv
 */
interface ImportMetaEnv {
  // ================================
  // FIREBASE CONFIGURATION (REQUIRED)
  // ================================
  
  /** 
   * Firebase API key for authentication and project access
   * @example "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   */
  readonly VITE_API_KEY: string;
  
  /** 
   * Firebase authentication domain for user sign-in
   * @example "your-project.firebaseapp.com"
   */
  readonly VITE_AUTH_DOMAIN: string;
  
  /** 
   * Firebase project identifier
   * @example "your-project-id"
   */
  readonly VITE_PROJECT_ID: string;
  
  /** 
   * Firebase storage bucket URL for file uploads
   * @example "your-project.appspot.com"
   */
  readonly VITE_STORAGE_BUCKET: string;
  
  /** 
   * Firebase Cloud Messaging sender ID
   * @example "123456789012"
   */
  readonly VITE_MESSAGING_SENDER_ID: string;
  
  /** 
   * Firebase application identifier
   * @example "1:123456789012:web:abcdef123456"
   */
  readonly VITE_APP_ID: string;

  // ================================
  // OPTIONAL CONFIGURATION
  // ================================
  
  /** 
   * Comma-separated Firebase UIDs with administrative privileges
   * Used for role-based access control in components
   * @example "uid1,uid2,uid3"
   * @optional
   */
  readonly VITE_ADMIN_UIDS?: string;
  
  /** 
   * Sentry Data Source Name for error monitoring and performance tracking
   * If provided, Sentry will be initialized for error reporting
   * @example "https://abc123@o123456.ingest.sentry.io/123456"
   * @optional
   */
  readonly VITE_SENTRY_DSN?: string;
  
  /** 
   * Backend API base URL override for development/staging environments
   * Defaults to 'http://localhost:3000' if not provided
   * @example "https://api.yourdomain.com"
   * @optional
   */
  readonly VITE_API_BASE_URL?: string;
  
  /** 
   * Application environment identifier for environment-specific behavior
   * Used for conditional logic and feature flags
   * @example "development" | "staging" | "production"
   * @optional
   */
  readonly VITE_ENVIRONMENT?: 'development' | 'staging' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
