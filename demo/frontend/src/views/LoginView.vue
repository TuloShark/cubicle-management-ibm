<template>
  <div class="login-layout">
    <!-- Left panel with IBM branding -->
    <div class="login-brand-panel">
      <div class="brand-content">
        <div class="brand-logo-container">
          <!-- Circling Bees around the IBM logo -->
          <div class="bee-element bee-1">
            <img src="../assets/BBLUE.png" alt="Bee" class="bee-image" />
          </div>
          
          <div class="bee-element bee-2">
            <img src="../assets/BBLUE.png" alt="Bee" class="bee-image" />
          </div>
          
          <!-- Brand Logo with circular background -->
          <div class="brand-logo">
            <img src="../assets/BLLOGO.jpg" alt="Brand Logo" class="brand-image" />
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

            <div v-if="error" class="error-message">
              <WarningIcon class="error-icon" />
              {{ error }}
            </div>
          </form>
        </cv-form>
      </div>
    </div>
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
import WarningIcon from '../components/icons/WarningIcon.vue';

export default {
  name: 'LoginView',
  components: {
    WarningIcon
  },
  data() {
    return {
      username: '',
      password: '',
      error: ''
    };
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
        // Redirect to /reservations if not already there
        if (this.$route.path !== '/reservations') {
          this.$router.push('/reservations');
        }
      } catch (err) {
        this.error = 'Invalid credentials';
      }
    }
  }
};
</script>

<style scoped>
.login-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f4f4f4;
  /* Smart responsive layout - auto-stacks on smaller screens */
  flex-direction: row;
  flex-wrap: wrap;
}

/* Left Brand Panel - Responsive without media queries */
.login-brand-panel {
  /* Smart flex behavior - takes up appropriate space */
  flex: 1 1 clamp(300px, 40vw, 600px);
  min-height: clamp(300px, 40vh, 100vh);
  background: linear-gradient(135deg, #0f62fe 0%, #001d6c 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.5rem, 4vw, 3rem);
  overflow: hidden;
}

.login-brand-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('../assets/IBMZ.jpg') center/cover;
  opacity: 0.1;
  z-index: 1;
}

.brand-content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: white;
  max-width: clamp(300px, 80vw, 500px);
  width: 100%;
}

.brand-logo-container {
  position: relative;
  margin-bottom: clamp(1rem, 4vw, 2rem);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo {
  width: clamp(100px, 20vw, 180px);
  height: clamp(100px, 20vw, 180px);
  background: #ffffff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  position: relative;
  z-index: 10;
}

.brand-image {
  width: clamp(70px, 15vw, 120px);
  height: clamp(70px, 15vw, 120px);
  object-fit: contain;
  border-radius: 0;
}

/* Bee Elements - Responsive Circling Animation */
.bee-element {
  position: absolute;
  width: clamp(20px, 4vw, 32px);
  height: clamp(20px, 4vw, 32px);
  z-index: 15;
  top: 50%;
  left: 50%;
}

.bee-1 {
  animation: circleClockwise 8s linear infinite;
  /* Responsive transform origin */
  transform-origin: clamp(-60px, -15vw, -120px) 0;
}

.bee-2 {
  animation: circleCounterClockwise 10s linear infinite;
  /* Responsive transform origin */
  transform-origin: clamp(-70px, -17vw, -140px) 0;
}

@keyframes circleClockwise {
  from {
    transform: rotate(0deg) translateX(clamp(-60px, -15vw, -120px)) rotate(0deg);
  }
  to {
    transform: rotate(360deg) translateX(clamp(-60px, -15vw, -120px)) rotate(-360deg);
  }
}

@keyframes circleCounterClockwise {
  from {
    transform: rotate(0deg) translateX(clamp(-70px, -17vw, -140px)) rotate(0deg);
  }
  to {
    transform: rotate(-360deg) translateX(clamp(-70px, -17vw, -140px)) rotate(360deg);
  }
}

.bee-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  background: transparent;
}

.brand-title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 300;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}

.brand-subtitle {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  margin: 0 0 clamp(1rem, 3vw, 2rem) 0;
  opacity: 0.9;
  font-weight: 400;
}

.brand-description {
  font-size: clamp(0.875rem, 2vw, 1rem);
  line-height: 1.6;
  opacity: 0.8;
  margin: 0;
}

/* Right Form Panel - Responsive without media queries */
.login-form-panel {
  /* Smart flex behavior - adapts to available space */
  flex: 1 1 clamp(300px, 50vw, 600px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.5rem, 4vw, 3rem);
  background-color: #ffffff;
  position: relative;
}

.form-container {
  width: 100%;
  max-width: clamp(300px, 80vw, 400px);
}

.form-header {
  margin-bottom: clamp(2rem, 5vw, 3rem);
  text-align: center;
}

.form-title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 400;
  color: #161616;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.01em;
}

.form-subtitle {
  font-size: clamp(0.875rem, 2vw, 1rem);
  color: #6f6f6f;
  margin: 0;
}

.login-form {
  width: 100%;
}

.input-group {
  margin-bottom: clamp(1rem, 3vw, 1.5rem);
}

.form-input {
  width: 100%;
}

/* Ensure Carbon input components take full width */
.login-form .cv-text-input,
.login-form .bx--text-input {
  width: 100% !important;
}

.login-button {
  width: 100% !important;
  margin-bottom: clamp(1rem, 3vw, 1.5rem) !important;
  display: block !important;
  max-width: none !important;
  min-height: clamp(44px, 6vh, 52px) !important;
}

/* Ensure Carbon Design System button takes full width */
.login-form .cv-button,
.login-form .bx--btn {
  width: 100% !important;
  max-width: none !important;
}

.error-message {
  margin-top: clamp(1rem, 3vw, 1.5rem);
  padding: clamp(0.75rem, 2vw, 1rem);
  background-color: #fff1f1;
  border: 1px solid #fa4d56;
  border-radius: 0;
  color: #da1e28;
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  display: flex;
  align-items: center;
  gap: clamp(0.25rem, 1vw, 0.5rem);
}

.error-icon {
  width: clamp(14px, 2.5vw, 16px);
  height: clamp(14px, 2.5vw, 16px);
  flex-shrink: 0;
}

/* Modern Flexbox Design - No Media Queries Needed! */
/* The layout automatically adapts based on available space:
   - Side-by-side on wide screens
   - Stacked on narrow screens
   - Everything scales smoothly using clamp() and viewport units
   - Flexbox handles all the responsive behavior automatically
*/
</style>