/**
 * @fileoverview Environment Variable Utilities
 * 
 * Centralized utilities for handling environment variables in the IBM Space
 * Optimization application. Provides consistent parsing, validation, and
 * access patterns for environment-specific configuration.
 * 
 * @author IBM Space Optimization Developer - Wander Jimenez Calvo
 * @version 1.0.0
 * @since 1.1.0
 * 
 * @description
 * This module centralizes environment variable logic to eliminate code
 * duplication across components and provide consistent validation and
 * parsing patterns.
 * 
 * Key Features:
 * - Admin UID parsing with validation
 * - API URL resolution with fallbacks
 * - Environment detection utilities
 * - Runtime validation helpers
 * 
 * @example
 * import { parseAdminUids, getApiBaseUrl, getCurrentEnvironment } from '@/utils/envUtils';
 * 
 * const adminUids = parseAdminUids();
 * const apiUrl = getApiBaseUrl();
 * const env = getCurrentEnvironment();
 */

// ====================================
// VALIDATION PATTERNS
// ====================================

/**
 * Firebase UID validation pattern
 * Firebase UIDs are typically 20+ characters, alphanumeric
 */
const FIREBASE_UID_PATTERN = /^[a-zA-Z0-9]{20,}$/;

/**
 * URL validation pattern for API base URLs
 */
const URL_PATTERN = /^https?:\/\/.+/;

// ====================================
// ADMIN UID UTILITIES
// ====================================

/**
 * Parse Admin UIDs with Validation
 * 
 * Parses the VITE_ADMIN_UIDS environment variable and returns an array
 * of validated Firebase UIDs. Filters out invalid UIDs and provides
 * comprehensive error handling.
 * 
 * @returns {string[]} Array of validated admin Firebase UIDs
 * 
 * @example
 * // Environment: VITE_ADMIN_UIDS="uid1,uid2, uid3,invalid-uid"
 * const adminUids = parseAdminUids();
 * // Returns: ['uid1', 'uid2', 'uid3']
 * 
 * @example
 * // Check if current user is admin
 * const adminUids = parseAdminUids();
 * const isAdmin = adminUids.includes(currentUser.uid);
 */
export function parseAdminUids(): string[] {
  const adminUidsEnv = import.meta.env.VITE_ADMIN_UIDS || '';
  
  // Handle empty environment variable
  if (!adminUidsEnv.trim()) {
    return [];
  }
  
  // Parse, trim, and filter UIDs
  const rawUids = adminUidsEnv
    .split(',')
    .map(uid => uid.trim())
    .filter(Boolean);
  
  // Validate UIDs and filter invalid ones
  const validUids = rawUids.filter(uid => {
    const isValid = FIREBASE_UID_PATTERN.test(uid);
    if (!isValid && console && console.warn) {
      console.warn(`Invalid admin UID format detected and filtered: ${uid}`);
    }
    return isValid;
  });
  
  return validUids;
}

/**
 * Check if User is Admin
 * 
 * Convenience function to check if a given Firebase UID has admin privileges
 * by comparing against the parsed admin UIDs list.
 * 
 * @param {string} uid - Firebase UID to check
 * @returns {boolean} True if the UID has admin privileges
 * 
 * @example
 * if (isAdminUid(currentUser.uid)) {
 *   console.log('User has admin privileges');
 * }
 */
export function isAdminUid(uid: string): boolean {
  if (!uid || typeof uid !== 'string') {
    return false;
  }
  
  const adminUids = parseAdminUids();
  return adminUids.includes(uid);
}

// ====================================
// API CONFIGURATION UTILITIES
// ====================================

/**
 * Get API Base URL with Fallback
 * 
 * Returns the configured API base URL from environment variables with
 * a fallback to localhost for development. In development with Vite dev server,
 * returns empty string to use relative URLs handled by Vite's proxy.
 * Validates URL format and provides consistent API endpoint resolution.
 * 
 * @returns {string} Valid API base URL or empty string for relative URLs
 * 
 * @example
 * const apiUrl = getApiBaseUrl();
 * const endpoint = `${apiUrl}/api/cubicles`;
 * 
 * @example
 * // Use in fetch requests - works in both dev and production
 * const response = await fetch(`${getApiBaseUrl()}/api/reservations`);
 */
export function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  const isDev = getCurrentEnvironment() === 'development';
  
  // In development, use relative URLs to leverage Vite's proxy
  if (isDev && !configuredUrl) {
    return '';
  }
  
  // In production or when explicitly configured, use the full URL
  const fallbackUrl = 'http://localhost:3000';
  
  // Return fallback if no URL configured
  if (!configuredUrl) {
    return fallbackUrl;
  }
  
  // Validate URL format
  if (!URL_PATTERN.test(configuredUrl)) {
    console.warn(`Invalid API base URL format: ${configuredUrl}. Using fallback: ${fallbackUrl}`);
    return fallbackUrl;
  }
  
  return configuredUrl;
}

// ====================================
// ENVIRONMENT DETECTION UTILITIES
// ====================================

/**
 * Get Current Environment
 * 
 * Returns the current application environment with fallback to 'development'.
 * Provides consistent environment detection across the application.
 * 
 * @returns {'development' | 'staging' | 'production'} Current environment
 * 
 * @example
 * const env = getCurrentEnvironment();
 * if (env === 'development') {
 *   console.log('Development features enabled');
 * }
 */
export function getCurrentEnvironment(): 'development' | 'staging' | 'production' {
  const env = import.meta.env.VITE_ENVIRONMENT;
  
  // Validate environment value
  if (env && ['development', 'staging', 'production'].includes(env)) {
    return env as 'development' | 'staging' | 'production';
  }
  
  // Default to development
  return 'development';
}

/**
 * Environment State Checks
 * 
 * Convenience functions for common environment checks.
 * Provides readable boolean flags for environment-specific logic.
 */
export const environmentChecks = {
  /**
   * Check if running in development environment
   * @returns {boolean} True if in development
   */
  isDevelopment: (): boolean => getCurrentEnvironment() === 'development',
  
  /**
   * Check if running in staging environment
   * @returns {boolean} True if in staging
   */
  isStaging: (): boolean => getCurrentEnvironment() === 'staging',
  
  /**
   * Check if running in production environment
   * @returns {boolean} True if in production
   */
  isProduction: (): boolean => getCurrentEnvironment() === 'production',
  
  /**
   * Check if running in any non-production environment
   * @returns {boolean} True if in development or staging
   */
  isNonProduction: (): boolean => {
    const env = getCurrentEnvironment();
    return env === 'development' || env === 'staging';
  }
};

// ====================================
// VALIDATION UTILITIES
// ====================================

/**
 * Validate Required Environment Variables
 * 
 * Checks that all required environment variables are present and valid.
 * Throws descriptive errors for missing or invalid configuration.
 * 
 * @throws {Error} If any required environment variable is missing or invalid
 * 
 * @example
 * // Call during application initialization
 * try {
 *   validateRequiredEnvironmentVariables();
 *   console.log('Environment validation passed');
 * } catch (error) {
 *   console.error('Environment validation failed:', error.message);
 * }
 */
export function validateRequiredEnvironmentVariables(): void {
  const requiredVars = [
    'VITE_API_KEY',
    'VITE_AUTH_DOMAIN',
    'VITE_PROJECT_ID',
    'VITE_STORAGE_BUCKET',
    'VITE_MESSAGING_SENDER_ID',
    'VITE_APP_ID'
  ];

  const missingVars = requiredVars.filter(varName => {
    const value = import.meta.env[varName as keyof ImportMetaEnv];
    return !value || (typeof value === 'string' && !value.trim());
  });
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env file and ensure all Firebase configuration variables are set.'
    );
  }
}

/**
 * Validate Optional Environment Variables
 * 
 * Validates optional environment variables and returns warnings for
 * misconfigured values. Does not throw errors but provides feedback
 * for configuration issues.
 * 
 * @returns {string[]} Array of warning messages for misconfigured variables
 * 
 * @example
 * const warnings = validateOptionalEnvironmentVariables();
 * warnings.forEach(warning => console.warn(warning));
 */
export function validateOptionalEnvironmentVariables(): string[] {
  const warnings: string[] = [];
  
  // Validate Sentry DSN format
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn && !sentryDsn.startsWith('https://')) {
    warnings.push('VITE_SENTRY_DSN should start with "https://" for proper Sentry integration');
  }
  
  // Validate API base URL format
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiUrl && !URL_PATTERN.test(apiUrl)) {
    warnings.push('VITE_API_BASE_URL should be a valid HTTP/HTTPS URL');
  }
  
  // Validate admin UIDs configuration
  const adminUids = parseAdminUids();
  const rawAdminUids = import.meta.env.VITE_ADMIN_UIDS;
  if (rawAdminUids) {
    const rawCount = rawAdminUids.split(',').filter(Boolean).length;
    if (adminUids.length !== rawCount) {
      warnings.push(`${rawCount - adminUids.length} invalid admin UID(s) were filtered from VITE_ADMIN_UIDS`);
    }
    
    if (adminUids.length === 1) {
      warnings.push('Only one admin UID configured - consider adding backup admin to prevent lockout');
    }
  }
  
  return warnings;
}

// ====================================
// DEVELOPMENT UTILITIES
// ====================================

/**
 * Development Environment Helpers
 * 
 * Utilities specifically for development and debugging.
 * Only active in non-production environments.
 */
export const devUtils = {
  /**
   * Log Environment Configuration
   * 
   * Logs current environment configuration for debugging.
   * Only logs in non-production environments.
   */
  logEnvironmentConfig: (): void => {
    if (environmentChecks.isProduction()) {
      return;
    }
    
    console.group('🔧 Environment Configuration');
    console.log('Environment:', getCurrentEnvironment());
    console.log('API Base URL:', getApiBaseUrl());
    console.log('Admin UIDs Count:', parseAdminUids().length);
    console.log('Sentry Enabled:', !!import.meta.env.VITE_SENTRY_DSN);
    
    const warnings = validateOptionalEnvironmentVariables();
    if (warnings.length > 0) {
      console.group('⚠️ Configuration Warnings');
      warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }
    
    console.groupEnd();
  },
  
  /**
   * Get Environment Summary
   * 
   * Returns a summary object of current environment configuration.
   * Useful for debugging and development tools.
   */
  getEnvironmentSummary: () => {
    return {
      environment: getCurrentEnvironment(),
      apiBaseUrl: getApiBaseUrl(),
      adminUidsCount: parseAdminUids().length,
      sentryEnabled: !!import.meta.env.VITE_SENTRY_DSN,
      warnings: validateOptionalEnvironmentVariables()
    };
  }
};
