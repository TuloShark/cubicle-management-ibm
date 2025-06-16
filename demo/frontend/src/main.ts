import { createApp } from 'vue';
import App from './App.vue';
import * as Sentry from "@sentry/vue";
import 'carbon-components/css/carbon-components.min.css'; // Carbon CSS
import CarbonComponentsVue from '@carbon/vue'; // Carbon Vue components
import './style.css'; // Global styles
import router from './router';
import { 
  validateRequiredEnvironmentVariables, 
  validateOptionalEnvironmentVariables, 
  environmentChecks,
  devUtils 
} from './utils/envUtils';

// Validate environment variables before app initialization
try {
  validateRequiredEnvironmentVariables();
  console.log('✅ Environment validation passed');
  
  // Show warnings for optional variables in development
  if (environmentChecks.isDevelopment()) {
    const warnings = validateOptionalEnvironmentVariables();
    if (warnings.length > 0) {
      console.group('⚠️ Environment Configuration Warnings');
      warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }
    
    // Log environment configuration in development
    devUtils.logEnvironmentConfig();
  }
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  // Still allow the app to start but with visible error
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; 
    background: #da1e28; color: white; padding: 10px; 
    text-align: center; z-index: 9999; font-family: Arial, sans-serif;
  `;
  errorDiv.textContent = `Configuration Error: ${error.message}`;
  document.body.appendChild(errorDiv);
}

const app = createApp(App);

// Initialize Sentry with improved validation
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && sentryDsn.trim() !== '' && sentryDsn !== '<your_sentry_dsn>' && sentryDsn.startsWith('https://')) {
  Sentry.init({
    app,
    dsn: sentryDsn,
    tracesSampleRate: environmentChecks.isProduction() ? 0.1 : 1.0, // Lower sample rate in production
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  });
  console.log('📊 Sentry error monitoring initialized');
} else {
  if (environmentChecks.isDevelopment()) {
    console.log('📊 Sentry disabled: No valid DSN provided or invalid format');
  }
}

// Use Carbon Vue components globally
app.use(CarbonComponentsVue);
app.use(router);

app.mount('#app');
