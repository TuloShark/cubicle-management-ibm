/**
 * @fileoverview Cubicle Management System - Main Application Entry Point
 * 
 * This is the primary entry point for the IBM Cubicle Management System frontend application.
 * It handles application initialization, environment validation, error monitoring setup,
 * and framework configuration for a production-ready Vue.js application.
 * 
 * Key Features:
 * - Environment variable validation with user-friendly error reporting
 * - Sentry error monitoring integration with production optimizations
 * - IBM Carbon Design System integration
 * - Centralized error handling and logging
 * - Application lifecycle management
 * 
 * Technical Stack:
 * - Vue 3 with TypeScript
 * - IBM Carbon Design System (@carbon/vue)
 * - Sentry error monitoring
 * - Vue Router for navigation
 * 
 * Environment Variables Required:
 * - VITE_FIREBASE_API_KEY: Firebase configuration
 * - VITE_FIREBASE_AUTH_DOMAIN: Firebase auth domain
 * - VITE_FIREBASE_PROJECT_ID: Firebase project identifier
 * - VITE_API_BASE_URL: Backend API base URL
 * 
 * Environment Variables Optional:
 * - VITE_SENTRY_DSN: Error monitoring service DSN
 * - VITE_ENVIRONMENT: Runtime environment (development/production)
 * 
 * @author IBM Space Optimization Developer - Wander Jimenez Calvo
 * @version 1.1.0
 * @since 1.0.0
 */

import { createApp, type App as VueApp } from 'vue';
import App from './App.vue';
import * as Sentry from "@sentry/vue";
import 'carbon-components/css/carbon-components.min.css';
import CarbonComponentsVue from '@carbon/vue';
import './style.css';
import router from './router';
import { 
  validateRequiredEnvironmentVariables, 
  validateOptionalEnvironmentVariables, 
  environmentChecks,
  devUtils 
} from './utils/envUtils';

/**
 * Interface for application initialization configuration
 */
interface AppConfig {
  sentryEnabled: boolean;
  environment: string;
  isProduction: boolean;
}

/**
 * Interface for error display configuration
 */
interface ErrorDisplayConfig {
  message: string;
  backgroundColor: string;
  textColor: string;
  duration?: number;
}

/**
 * Validates environment variables and handles validation errors gracefully
 * @returns {boolean} True if validation passes, false otherwise
 */
function validateEnvironment(): boolean {
  try {
    validateRequiredEnvironmentVariables();
    
    // Only log in development mode
    if (environmentChecks.isDevelopment()) {
      const warnings = validateOptionalEnvironmentVariables();
      if (warnings.length > 0) {
        console.group('⚠️ Environment Configuration Warnings');
        warnings.forEach(warning => console.warn(warning));
        console.groupEnd();
      }
      
      devUtils.logEnvironmentConfig();
    }
    
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown environment validation error';
    
    // Log error only in development
    if (environmentChecks.isDevelopment()) {
      console.error('❌ Environment validation failed:', errorMessage);
    }
    
    // Show user-friendly error message
    displayErrorMessage({
      message: `Configuration Error: ${errorMessage}`,
      backgroundColor: '#da1e28',
      textColor: 'white',
      duration: 10000
    });
    
    return false;
  }
}

/**
 * Displays error messages to users with consistent styling
 * @param {ErrorDisplayConfig} config - Error display configuration
 */
function displayErrorMessage(config: ErrorDisplayConfig): void {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed; 
    top: 0; 
    left: 0; 
    right: 0; 
    background: ${config.backgroundColor}; 
    color: ${config.textColor}; 
    padding: 12px 16px; 
    text-align: center; 
    z-index: 9999; 
    font-family: 'IBM Plex Sans', Arial, sans-serif;
    font-size: 14px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  `;
  errorDiv.textContent = config.message;
  errorDiv.setAttribute('role', 'alert');
  errorDiv.setAttribute('aria-live', 'assertive');
  
  document.body.appendChild(errorDiv);
  
  // Auto-remove error after specified duration
  if (config.duration) {
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, config.duration);
  }
}

/**
 * Configures and initializes Sentry error monitoring
 * @param {VueApp} app - Vue application instance
 * @returns {AppConfig} Application configuration object
 */
function configureSentry(app: VueApp): AppConfig {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string;
  const environment = import.meta.env.VITE_ENVIRONMENT || 'development';
  const isProduction = environmentChecks.isProduction();
  
  // Validate Sentry DSN format and configuration
  const isSentryConfigured = sentryDsn && 
    sentryDsn.trim() !== '' && 
    sentryDsn !== '<your_sentry_dsn>' && 
    sentryDsn.startsWith('https://');
  
  if (isSentryConfigured) {
    try {
      Sentry.init({
        app,
        dsn: sentryDsn,
        tracesSampleRate: isProduction ? 0.1 : 1.0,
        environment,
        beforeSend(event) {
          // Filter out non-critical errors in production
          if (isProduction && event.level === 'info') {
            return null;
          }
          return event;
        },
        // Advanced integrations can be added here as needed
        // Note: Additional Sentry integrations may require separate imports
      });
      
      // Only log in development
      if (environmentChecks.isDevelopment()) {
        console.log('📊 Sentry error monitoring initialized');
      }
      
      return { sentryEnabled: true, environment, isProduction };
    } catch (error) {
      if (environmentChecks.isDevelopment()) {
        console.error('Failed to initialize Sentry:', error);
      }
      return { sentryEnabled: false, environment, isProduction };
    }
  } else {
    if (environmentChecks.isDevelopment()) {
      console.log('📊 Sentry disabled: No valid DSN provided');
    }
    return { sentryEnabled: false, environment, isProduction };
  }
}

/**
 * Initializes the Vue application with all required plugins and configurations
 * @returns {VueApp} Configured Vue application instance
 */
function initializeApp(): VueApp {
  const app = createApp(App);
  
  // Configure error monitoring
  const config = configureSentry(app);
  
  // Register global plugins
  app.use(CarbonComponentsVue);
  app.use(router);
  
  // Add global error handler
  app.config.errorHandler = (error, instance, info) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown application error';
    
    // Log error in development
    if (environmentChecks.isDevelopment()) {
      console.error('Global error handler:', errorMessage, info);
    }
    
    // Report to Sentry if available
    if (config.sentryEnabled) {
      Sentry.captureException(error, {
        contexts: {
          vue: {
            componentName: instance?.$options.name || 'Unknown',
            errorInfo: info,
          },
        },
      });
    }
    
    // Show user-friendly error message
    displayErrorMessage({
      message: 'An unexpected error occurred. Please refresh the page.',
      backgroundColor: '#da1e28',
      textColor: 'white',
      duration: 5000
    });
  };
  
  return app;
}

/**
 * Main application bootstrap function
 * Handles the complete application initialization process with error recovery
 */
function bootstrap(): void {
  try {
    // Validate environment configuration
    const isEnvironmentValid = validateEnvironment();
    
    // Initialize application
    const app = initializeApp();
    
    // Mount application to DOM
    const mountElement = document.getElementById('app');
    if (!mountElement) {
      throw new Error('Application mount point #app not found in DOM');
    }
    
    app.mount('#app');
    
    // Set up global performance monitoring (development only)
    if (environmentChecks.isDevelopment()) {
      console.log('🚀 Application successfully initialized');
      
      // Monitor performance
      if ('performance' in window && 'mark' in window.performance) {
        performance.mark('app-mounted');
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Critical application initialization error';
    
    // Log critical error
    console.error('💥 Critical application error:', errorMessage);
    
    // Show critical error message
    displayErrorMessage({
      message: `Critical Error: ${errorMessage}. Please contact support.`,
      backgroundColor: '#750e13',
      textColor: 'white'
    });
    
    // Prevent further execution
    throw error;
  }
}

// Initialize application
bootstrap();
