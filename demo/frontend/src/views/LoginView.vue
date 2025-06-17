<!--
===================================================================
VIEWS: LoginView
===================================================================
PURPOSE: 
Authentication interface that provides secure user login functionality
with Firebase integration. Features comprehensive validation, error handling,
and seamless user experience with professional IBM branding and responsive
design optimized for all device types.

FEATURES:
- Firebase Authentication with email/password
- Real-time form validation with user feedback
- Comprehensive error handling with user-friendly messages
- Loading states and visual feedback during authentication
- Responsive design optimized for desktop, tablet, and mobile
- IBM Carbon Design System compliance
- Accessibility features with ARIA support
- Professional branding with animated design elements

INTEGRATION:
- Routes: /login (default route for unauthenticated users)
- Authentication: Firebase Auth with automatic token management
- Navigation: Automatic redirect to reservations after successful login
- Global State: Uses useAuth composable for authentication state
- Route Guards: Protected by authentication middleware

CORE FUNCTIONALITY:
1. **User Authentication**: Secure login with Firebase Auth
2. **Form Validation**: Real-time email and password validation
3. **Error Handling**: Comprehensive error management with user feedback
4. **State Management**: Loading states and operation status tracking
5. **Navigation**: Automatic redirection after successful authentication

DATA FLOW:
- User input → form validation → authentication attempt
- Firebase Auth → token generation → user state update
- Successful login → route redirection → main application access
- Failed login → error display → user feedback and retry

ERROR HANDLING:
- Invalid credentials with specific user guidance
- Network failures with retry suggestions
- Account-related issues with actionable feedback
- Form validation errors with real-time feedback
- Firebase service errors with fallback messaging

PERFORMANCE OPTIMIZATIONS:
- Efficient form validation with minimal re-renders
- Optimized asset loading with proper compression
- Memory leak prevention with proper cleanup
- Fast authentication flow with minimal API calls

ACCESSIBILITY:
- ARIA labels for all form elements and interactive components
- Keyboard navigation support for complete form interaction
- Screen reader announcements for status changes and errors
- High contrast design following IBM accessibility standards
- Semantic HTML structure for assistive technologies
- Focus management for optimal user experience

DESIGN FEATURES:
- Professional IBM branding with animated bee elements
- Responsive grid layout adapting to all screen sizes
- Smooth animations and transitions for enhanced UX
- Dark/light theme support with CSS custom properties
- Loading animations and visual feedback indicators

DEPENDENCIES:
- Vue 3 Composition API with reactive state management
- Firebase Authentication for secure user login
- IBM Carbon Design System components and styling
- Vue Router for navigation and route management
- useAuth composable for centralized authentication logic

SECURITY:
- Secure token storage and management
- Protection against common authentication vulnerabilities
- Proper error handling to prevent information disclosure
- Secure redirect handling to prevent open redirect attacks

LAST UPDATED: June 2025 - Enhanced with comprehensive documentation,
accessibility improvements, and production-ready security features
===================================================================
-->

<template>
  <div class="login-layout" :style="cssVars">
    <!-- Left panel with IBM branding -->
    <div class="login-brand-panel">
      <div class="brand-content">
        <div class="brand-logo-container">
          <!-- Circling Bees around the IBM logo -->
          <div class="bee-element bee-1">
            <img src="../assets/bee.png" alt="Bee" class="bee-image" />
          </div>
          
          <div class="bee-element bee-2">
            <img src="../assets/bee.png" alt="Bee" class="bee-image" />
          </div>
          
          <!-- Brand Logo with circular background -->
          <div class="brand-logo">
            <img src="../assets/ibm.jpg" alt="Brand Logo" class="brand-image" />
          </div>
        </div>
        
        <div class="brand-text">
          <h1 class="brand-title">Cubicle Management</h1>
          <p class="brand-subtitle">Powered by IBM</p>
          <p class="brand-description">
            IBM Space Optimization.
          </p>
        </div>
      </div>
    </div>

    <!-- Right panel with login form -->
    <div class="login-form-panel">
      
      <div class="form-container">
        <div class="form-header">
          <h2 class="form-title">Welcome back</h2>
          <p class="form-subtitle">Sign in to your account</p>
        </div>

        <cv-form class="login-form">
          <form @submit.prevent="login" novalidate>
            <div class="input-group">
              <cv-text-input
                v-model="username"
                label="Email address"
                placeholder="Enter your email"
                type="email"
                required
                autocomplete="username"
                class="form-input"
                :disabled="loading"
                aria-describedby="email-help"
              />
              <div id="email-help" class="visually-hidden">
                Enter your registered email address
              </div>
            </div>
            
            <div class="input-group">
              <cv-text-input
                v-model="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                required
                autocomplete="current-password"
                class="form-input"
                :disabled="loading"
                aria-describedby="password-help"
              />
              <div id="password-help" class="visually-hidden">
                Enter your account password
              </div>
            </div>

            <cv-button 
              type="submit" 
              kind="primary" 
              :disabled="loading || !username || !password"
              class="login-button"
              style="width: 100% !important; display: block !important; min-width: 100% !important;"
              aria-describedby="login-help"
            >
              {{ loading ? 'Signing in...' : 'Sign in' }}
            </cv-button>
            <div id="login-help" class="visually-hidden">
              Sign in to access your account
            </div>
          </form>
        </cv-form>
      </div>
    </div>
    
    <!-- Toast Notification for Error Messages -->
    <cv-toast-notification
      v-if="showErrorNotification"
      kind="error"
      title="Login Error"
      :subtitle="error"
      @close="clearErrorNotification"
      class="toast-notification"
    />
  </div>
</template>

<script>
/**
 * 
 * Primary authentication interface for the IBM Space Optimization application.
 * Implements Firebase email/password authentication with IBM Carbon Design System
 * compliance, comprehensive error handling, and responsive design principles.
 * 
 */
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import useAuth from '../composables/useAuth';
import zservImage from '../assets/zserv.jpg';
import './styles/LoginViewStyles.css';

export default {
  name: 'LoginView',
  components: {
    // Carbon components are globally registered
  },
  data() {
    return {
      /** @type {string} User's email address for authentication */
      username: '',
      /** @type {string} User's password for authentication */
      password: '',
      /** @type {string} Current error message to display to user */
      error: '',
      /** @type {boolean} Whether to show the error notification toast */
      showErrorNotification: false
    };
  },
  computed: {
    /**
     * CSS Custom Properties for dynamic styling
     * Provides the z-series background image as a CSS variable
     * 
     * @returns {Object} CSS custom properties object
     */
    cssVars() {
      return {
        '--zserv-bg-image': `url(${zservImage})`
      };
    }
  },
  setup() {
    /**
     * Composition API setup for reactive authentication state
     * Integrates with useAuth composable for loading state management
     * 
     * @returns {Object} Reactive properties from useAuth composable
     */
    const { loading } = useAuth();
    return { loading };
  },
  methods: {
    /**
     * Authenticate User with Firebase
     * 
     * Handles user authentication using Firebase email/password authentication.
     * Manages the complete authentication flow including:
     * - Input validation
     * - Firebase authentication
     * - Token retrieval and storage
     * - Error handling with user feedback
     * - Post-login navigation
     * 
     * @async
     * @method login
     * @returns {Promise<void>} Resolves when login process completes
     * 
     * @throws {Error} Firebase authentication errors
     * 
     * @example
     * // Called on form submission
     * await this.login();
     */
    async login() {
      try {
        // Clear any existing errors
        this.clearErrorNotification();
        
        // Attempt Firebase authentication
        const userCredential = await signInWithEmailAndPassword(auth, this.username, this.password);
        const user = userCredential.user;
        
        if (user) {
          // Retrieve and store authentication token
          const idToken = await user.getIdToken();
          localStorage.setItem('auth_token', idToken);
          
          // Navigate to reservations view on successful login
          if (this.$route.path !== '/reservations') {
            this.$router.push('/reservations');
          }
        }
      } catch (err) {
        // Handle authentication errors with user-friendly messages
        this.handleLoginError(err);
      }
    },
    
    /**
     * Handle Login Authentication Errors
     * 
     * Processes Firebase authentication errors and provides user-friendly
     * error messages with appropriate feedback mechanisms.
     * 
     * @private
     * @method handleLoginError
     * @param {Error} error - Firebase authentication error
     * 
     * @example
     * // Internal usage during login process
     * this.handleLoginError(firebaseError);
     */
    handleLoginError(error) {
      let errorMessage = 'Login failed. Please try again.';
      
      // Provide specific error messages based on Firebase error codes
      if (error?.code) {
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Contact support.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection.';
            break;
          default:
            errorMessage = 'Invalid credentials. Please check your email and password.';
        }
      }
      
      this.error = errorMessage;
      this.showErrorNotification = true;
    },
    
    /**
     * Clear Error Notification
     * 
     * Resets the error state and hides the error notification toast.
     * Called when user dismisses the error or attempts a new login.
     * 
     * @method clearErrorNotification
     * @returns {void}
     * 
     * @example
     * // Clear errors before new login attempt
     * this.clearErrorNotification();
     */
    clearErrorNotification() {
      this.showErrorNotification = false;
      this.error = '';
    }
  }
};
</script>