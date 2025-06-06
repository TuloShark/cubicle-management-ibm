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
          <p class="brand-subtitle">Powered by IBM Z</p>
          <p class="brand-description">
            Modern workspace management with enterprise-grade security and reliability.
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

            <div class="form-actions">
              <cv-button 
                type="submit" 
                kind="primary" 
                :disabled="loading"
                class="login-button"
              >
                {{ loading ? 'Signing in...' : 'Sign in' }}
              </cv-button>
            </div>

            <div class="divider">
              <span class="divider-text">or continue with</span>
            </div>

            <div class="social-actions">
              <cv-button 
                kind="tertiary" 
                @click="loginWithGoogle" 
                :disabled="loading"
                class="social-button"
              >
                <GoogleIcon class="social-icon" />
                Google
              </cv-button>
              <cv-button 
                kind="tertiary" 
                @click="loginWithGithub" 
                :disabled="loading"
                class="social-button"
              >
                <GithubIcon class="social-icon" />
                GitHub
              </cv-button>
            </div>

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
 * Handles user login via email/password and social providers (Google, GitHub).
 * On successful login, stores auth token and redirects to reservations view.
 */
import { signInWithEmailAndPassword, signInWithRedirect, getRedirectResult, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';
import useAuth from '../composables/useAuth';
import GoogleIcon from '../components/icons/GoogleIcon.vue';
import GithubIcon from '../components/icons/GithubIcon.vue';
import WarningIcon from '../components/icons/WarningIcon.vue';

export default {
  name: 'LoginView',
  components: {
    GoogleIcon,
    GithubIcon,
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
  async mounted() {
    // Handle redirect result for social logins
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        // Fetch ID token and store in localStorage
        const idToken = await result.user.getIdToken();
        localStorage.setItem('auth_token', idToken);
        this.$emit('login');
        this.error = '';
      }
    } catch (err) {
      // Only show error if redirect failed
      if (err && err.message) this.error = err.message;
    }
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
    },
    /**
     * Login with Google provider (redirect).
     */
    loginWithGoogle() {
      const provider = new GoogleAuthProvider();
      signInWithRedirect(auth, provider);
    },
    /**
     * Login with GitHub provider (redirect).
     */
    loginWithGithub() {
      const provider = new GithubAuthProvider();
      signInWithRedirect(auth, provider);
    }
  }
};
</script>

<style scoped>
.login-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f4f4f4;
}

/* Left Brand Panel */
.login-brand-panel {
  flex: 1;
  background: linear-gradient(135deg, #0f62fe 0%, #001d6c 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
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
  max-width: 500px;
}

.brand-logo-container {
  position: relative;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo {
  width: 180px;
  height: 180px;
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
  width: 120px;
  height: 120px;
  object-fit: contain;
  border-radius: 0;
}

/* Bee Elements - Circling Animation */
.bee-element {
  position: absolute;
  width: 32px;
  height: 32px;
  z-index: 15;
  top: 50%;
  left: 50%;
}

.bee-1 {
  animation: circleClockwise 8s linear infinite;
  transform-origin: -120px 0;
}

.bee-2 {
  animation: circleCounterClockwise 10s linear infinite;
  transform-origin: -140px 0;
}

@keyframes circleClockwise {
  from {
    transform: rotate(0deg) translateX(-120px) rotate(0deg);
  }
  to {
    transform: rotate(360deg) translateX(-120px) rotate(-360deg);
  }
}

@keyframes circleCounterClockwise {
  from {
    transform: rotate(0deg) translateX(-140px) rotate(0deg);
  }
  to {
    transform: rotate(-360deg) translateX(-140px) rotate(360deg);
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
  font-size: 2.5rem;
  font-weight: 300;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}

.brand-subtitle {
  font-size: 1.25rem;
  margin: 0 0 2rem 0;
  opacity: 0.9;
  font-weight: 400;
}

.brand-description {
  font-size: 1rem;
  line-height: 1.6;
  opacity: 0.8;
  margin: 0;
}

/* Right Form Panel */
.login-form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: #ffffff;
  position: relative;
}

.form-container {
  width: 100%;
  max-width: 400px;
}

.form-header {
  margin-bottom: 3rem;
  text-align: center;
}

.form-title {
  font-size: 2rem;
  font-weight: 400;
  color: #161616;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.01em;
}

.form-subtitle {
  font-size: 1rem;
  color: #6f6f6f;
  margin: 0;
}

.login-form {
  background: transparent;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
}

.input-group {
  margin-bottom: 1.5rem;
}

.form-input {
  width: 100%;
}

.form-actions {
  margin: 2rem 0;
  display: flex;
  justify-content: center;
  width: 100%;
}

.login-button {
  width: 100% !important;
  height: 48px;
  font-size: 1rem;
  font-weight: 400;
  box-sizing: border-box;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Target the Carbon Vue button specifically with multiple selectors */
.login-button :deep(.bx--btn),
.login-button :deep(.bx--btn--primary),
.login-button :deep(button) {
  width: 100% !important;
  box-sizing: border-box !important;
  min-width: 100% !important;
  max-width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
}

/* Additional fallback for Carbon Design System button */
.form-actions .login-button {
  display: block !important;
  width: 100% !important;
}

.form-actions .login-button :deep(*) {
  width: 100% !important;
  box-sizing: border-box !important;
}

.divider {
  position: relative;
  text-align: center;
  margin: 2rem 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #e0e0e0;
}

.divider-text {
  background-color: #ffffff;
  padding: 0 1rem;
  color: #6f6f6f;
  font-size: 0.875rem;
  position: relative;
  z-index: 1;
}

.social-actions {
  display: flex;
  gap: 1rem;
}

.social-button {
  flex: 1;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  color: #161616;
  transition: all 0.15s ease;
}

.social-button:hover {
  background-color: #f4f4f4;
  border-color: #c6c6c6;
}

.social-icon {
  width: 20px;
  height: 20px;
}

.error-message {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #fff1f1;
  border: 1px solid #fa4d56;
  border-radius: 4px;
  color: #da1e28;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .login-layout {
    flex-direction: column;
  }
  
  .login-brand-panel {
    min-height: 40vh;
    padding: 2rem;
  }
  
  .brand-title {
    font-size: 2rem;
  }
  
  .brand-logo {
    width: 130px;
    height: 130px;
  }
  
  .brand-image {
    width: 90px;
    height: 90px;
  }
  
  .bee-element {
    width: 22px;
    height: 22px;
  }
  
  .bee-1 {
    transform-origin: -80px 0;
  }
  
  .bee-2 {
    transform-origin: -90px 0;
  }
  
  .login-form-panel {
    padding: 2rem;
  }
  
  .form-title {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .social-actions {
    flex-direction: column;
  }
  
  .login-brand-panel {
    min-height: 30vh;
    padding: 1.5rem;
  }
  
  .brand-logo {
    width: 100px;
    height: 100px;
  }
  
  .brand-image {
    width: 70px;
    height: 70px;
  }
  
  .bee-element {
    width: 24px;
    height: 24px;
  }
  
  .bee-1 {
    transform-origin: -60px 0;
  }
  
  .bee-2 {
    transform-origin: -70px 0;
  }
  
  .login-form-panel {
    padding: 1.5rem;
  }
}
</style>