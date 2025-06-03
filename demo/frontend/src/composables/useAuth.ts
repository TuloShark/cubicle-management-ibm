// useAuth.ts
// Composable for managing Firebase authentication state and user info in Vue 3.
// Provides currentUser, isAdmin, loading, logout, and token as reactive/computed properties.

import { ref, computed, onUnmounted } from 'vue';
import { User, onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Check if a token is expired
 * @param token - The JWT token to check
 * @returns true if the token is expired, false otherwise
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp is in seconds
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}

// --- Reactive state ---
// Reactive variables to store authentication state and user information
const currentUser = ref<User | null>(null); // Stores the currently authenticated user
const isAdmin = ref(false); // Indicates if the user has admin privileges
const loading = ref(true); // Tracks the loading state of authentication
const token = ref<string | null>(null); // Stores the authentication token

let unsubscribe: (() => void) | null = null; // Holds the unsubscribe function for auth state listener

/**
 * useAuth composable
 * Handles Firebase auth state, admin detection, and token management.
 * Returns currentUser, isAdmin, loading, logout, and token as computed properties.
 */
function useAuth() {
  // Subscribe to Firebase auth state changes (singleton)
  if (!unsubscribe) {
    // Listen for Firebase auth state changes
    unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        currentUser.value = user;
        try {
          const idTokenResult = await getIdTokenResult(user);
          // Detect admin from custom claims
          isAdmin.value = !!idTokenResult.claims.admin; // Check if user has admin claim
          token.value = idTokenResult.token; // Store the authentication token
          // Check token expiration
          if (isTokenExpired(idTokenResult.token)) {
            await signOut(auth); // Sign out the user
            isAdmin.value = false; // Reset admin state
            currentUser.value = null; // Clear user state
            token.value = null; // Clear token
            localStorage.removeItem('auth_token'); // Remove token from localStorage
            loading.value = false; // Update loading state
            return; // Exit early if token is expired
          }
          localStorage.setItem('auth_token', idTokenResult.token); // Keep token in sync with localStorage
        } catch (error) {
          console.error('Error getting token:', error);
          isAdmin.value = false; // Reset admin state on error
          token.value = null; // Clear token on error
          localStorage.removeItem('auth_token'); // Remove token from localStorage
        }
      } else {
        // User is signed out
        currentUser.value = null; // Clear user state
        isAdmin.value = false; // Reset admin state
        token.value = null; // Clear token
        localStorage.removeItem('auth_token'); // Remove token from localStorage
      }
      loading.value = false; // Update loading state
    });
  }

  // Clean up subscription on component unmount
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe(); // Unsubscribe from auth state listener
      unsubscribe = null; // Reset unsubscribe function
    }
  });

  /**
   * Logout the current user and clear state
   */
  const logout = async () => {
    await signOut(auth); // Sign out the user
    isAdmin.value = false; // Reset admin state
    currentUser.value = null; // Clear user state
    token.value = null; // Clear token
    localStorage.removeItem('auth_token'); // Remove token from localStorage
  };

  return {
    currentUser: computed(() => currentUser.value), // Computed property for current user
    isAdmin: computed(() => isAdmin.value), // Computed property for admin state
    loading: computed(() => loading.value), // Computed property for loading state
    logout, // Logout function
    token: computed(() => token.value), // Computed property for authentication token
  };
}

export default useAuth;
