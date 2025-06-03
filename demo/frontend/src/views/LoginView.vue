<template>
  <div class="login-container">
    <cv-form>
      <form @submit.prevent="login">
        <h2>Login</h2>
        <cv-text-input
          v-model="username"
          label="Email"
          placeholder="Email"
          required
          autocomplete="username"
        />
        <cv-text-input
          v-model="password"
          label="Password"
          type="password"
          placeholder="Password"
          required
          autocomplete="current-password"
        />
        <div class="button-row">
          <cv-button type="submit" kind="primary" :disabled="loading">Login</cv-button>
          <cv-button kind="secondary" @click="loginWithGoogle" :disabled="loading">Google</cv-button>
          <cv-button kind="secondary" @click="loginWithGithub" :disabled="loading">GitHub</cv-button>
        </div>
        <div v-if="error" class="error">{{ error }}</div>
      </form>
    </cv-form>
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

export default {
  name: 'LoginView',
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
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
}
.cv-form {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.error {
  color: #d32f2f;
  margin-top: 0.5rem;
}
.button-row {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}
.social-login {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}
</style>