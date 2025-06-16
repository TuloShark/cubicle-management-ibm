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
          <form @submit.prevent="login">
            <div class="input-group">
              <cv-text-input
                v-model="username"
                label="Email address"
                placeholder="Enter your email"
                required
                autocomplete="username"
                class="form-input"
              />
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
              />
            </div>

            <cv-button 
              type="submit" 
              kind="primary" 
              :disabled="loading"
              class="login-button"
            >
              {{ loading ? 'Signing in...' : 'Sign in' }}
            </cv-button>
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
 * LoginView
 * Handles user login via email/password.
 * On successful login, stores auth token and redirects to reservations view.
 */
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import useAuth from '../composables/useAuth';
import zservImage from '../assets/zserv.jpg';
import './styles/LoginViewStyles.css';

export default {
  name: 'LoginView',
  components: {
  },
  data() {
    return {
      username: '',
      password: '',
      error: '',
      showErrorNotification: false
    };
  },
  computed: {
    cssVars() {
      return {
        '--zserv-bg-image': `url(${zservImage})`
      };
    }
  },
  setup() {
    // Use the loading state from useAuth composable
    const { loading } = useAuth();
    return { loading };
  },
  methods: {
    /**
     * Login with email and password using Firebase Auth.
     * On success, store token. Redirect is handled globally.
     */
    async login() {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, this.username, this.password);
        // Use user from userCredential instead of auth.currentUser
        const user = userCredential.user;
        if (user) {
          const idToken = await user.getIdToken();
          localStorage.setItem('auth_token', idToken);
        }
        this.error = '';
        this.showErrorNotification = false;
        // Redirect to /reservations if not already there
        if (this.$route.path !== '/reservations') {
          this.$router.push('/reservations');
        }
      } catch (err) {
        this.error = 'Invalid credentials. Please check your email and password.';
        this.showErrorNotification = true;
      }
    },
    
    /**
     * Clear the error notification
     */
    clearErrorNotification() {
      this.showErrorNotification = false;
      this.error = '';
    }
  }
};
</script>