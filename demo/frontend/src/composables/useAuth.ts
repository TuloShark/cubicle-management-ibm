/**
 * @fileoverview Authentication Management Composable
 * 
 * Enterprise-grade Firebase authentication state management for the IBM Space Optimization 
 * application. Provides reactive authentication state, JWT token management, admin privilege 
 * detection, and secure logout functionality with comprehensive error handling and token 
 * validation.
 * 
 * @author IBM Space Optimization Developer - Wander Jimenez Calvo
 * @version 2.1.0
 * @since 1.0.0
 */

import { ref, computed, onUnmounted, getCurrentInstance, watch, readonly, Ref, ComputedRef } from 'vue';
import { User, onAuthStateChanged, signOut, getIdTokenResult } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Custom Claims Interface
 * 
 * Defines the structure of custom claims attached to Firebase JWT tokens.
 * Used for role-based access control and admin privilege detection.
 * 
 * @interface CustomClaims
 * @property {boolean} [admin] - Whether user has administrative privileges
 * @property {string} [role] - User role identifier
 * @property {string[]} [permissions] - Array of specific permissions
 */
interface CustomClaims {
  admin?: boolean;
  role?: string;
  permissions?: string[];
}

/**
 * Authentication Composable Return Type
 * 
 * Defines the interface returned by the useAuth composable.
 * Provides type safety for consuming components.
 * 
 * @interface UseAuthReturn
 * @property {ComputedRef<User | null>} currentUser - Currently authenticated user
 * @property {ComputedRef<boolean>} isAdmin - Whether user has admin privileges
 * @property {ComputedRef<boolean>} loading - Authentication loading state
 * @property {ComputedRef<string | null>} token - Current JWT authentication token
 * @property {ComputedRef<string | null>} authError - Current authentication error
 * @property {Function} logout - Function to sign out user
 * @property {Function} refreshToken - Function to refresh current token
 * @property {Function} clearError - Function to clear authentication errors
 */
interface UseAuthReturn {
  currentUser: ComputedRef<User | null>;
  isAdmin: ComputedRef<boolean>;
  loading: ComputedRef<boolean>;
  token: ComputedRef<string | null>;
  authError: ComputedRef<string | null>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

/**
 * JWT Token Validation
 * 
 * Validates whether a JWT token has expired by checking the 'exp' claim.
 * Uses safe decoding with comprehensive error handling to prevent crashes.
 * 
 * @param {string} token - The JWT token to validate
 * @returns {boolean} True if token is expired or invalid, false if valid
 * 
 * @example
 * const expired = isTokenExpired(userToken);
 * if (expired) {
 *   await refreshToken();
 * }
 */
function isTokenExpired(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return true;
  }

  try {
    // JWT tokens have three parts separated by dots: header.payload.signature
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return true; // Invalid token format
    }

    // Decode the payload (second part)
    const payload = JSON.parse(atob(tokenParts[1]));
    
    // Check if exp claim exists and is valid
    if (!payload.exp || typeof payload.exp !== 'number') {
      return true; // Missing or invalid expiration claim
    }
    
    // exp is in seconds, Date.now() is in milliseconds
    // Add 30 second buffer to account for clock skew
    const currentTimeSeconds = Math.floor(Date.now() / 1000);
    const expirationBuffer = 30; // 30 seconds buffer
    return currentTimeSeconds >= (payload.exp - expirationBuffer);
  } catch (error) {
    // Any decode error means the token is invalid
    console.warn('Token validation error:', error);
    return true;
  }
}

/**
 * Storage Management Utilities
 * 
 * Centralized localStorage operations with comprehensive error handling.
 * Prevents crashes from storage quota exceeded or other storage errors.
 */
const storageManager = {
  /**
   * Safely set an item in localStorage
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to save to localStorage (${key}):`, error);
      // Could implement fallback to sessionStorage or memory storage here
    }
  },

  /**
   * Safely get an item from localStorage
   * @param {string} key - Storage key
   * @returns {string | null} Stored value or null
   */
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to read from localStorage (${key}):`, error);
      return null;
    }
  },

  /**
   * Safely remove an item from localStorage
   * @param {string} key - Storage key
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove from localStorage (${key}):`, error);
    }
  }
};

// ====================================
// REACTIVE STATE MANAGEMENT
// ====================================

/**
 * Global Authentication State
 * 
 * Singleton reactive state shared across all components.
 * Ensures consistent authentication state throughout the application.
 */

/** Currently authenticated Firebase user */
const currentUser = ref<User | null>(null);

/** Whether the user has administrative privileges */
const isAdmin = ref<boolean>(false);

/** Loading state for authentication operations */
const loading = ref<boolean>(true);

/** Current JWT authentication token */
const token = ref<string | null>(null);

/** Current authentication error state */
const authError = ref<string | null>(null);

/** Firebase auth state change listener unsubscribe function */
let unsubscribe: (() => void) | null = null;

/** Flag to track if auth listener has been initialized */
let authListenerInitialized = false;

/**
 * Authentication State Management
 * 
 * Enhanced Firebase authentication composable with comprehensive error handling,
 * token management, and memory leak prevention. Implements singleton pattern
 * for consistent state across all application components.
 * 
 * @returns {UseAuthReturn} Authentication state and methods
 * 
 * @example
 * const { currentUser, isAdmin, loading, token, logout } = useAuth();
 * 
 * // Check if user is authenticated
 * if (currentUser.value && !loading.value) {
 *   console.log('User is authenticated');
 * }
 */
function useAuth(): UseAuthReturn {
  /**
   * Initialize Authentication Listener
   * 
   * Sets up Firebase auth state listener only once to prevent multiple listeners.
   * Handles user sign-in, sign-out, and token management with comprehensive error handling.
   */
  const initializeAuthListener = () => {
    if (authListenerInitialized) return;

    authListenerInitialized = true;
    unsubscribe = onAuthStateChanged(auth, handleAuthStateChange, handleAuthError);
  };

  /**
   * Handle Authentication State Changes
   * 
   * Processes Firebase auth state changes including user sign-in and sign-out.
   * Manages token retrieval, admin privilege detection, and state synchronization.
   * 
   * @param {User | null} user - Firebase user object or null if signed out
   */
  const handleAuthStateChange = async (user: User | null) => {
    try {
      authError.value = null; // Clear any previous errors

      if (user) {
        await handleUserSignedIn(user);
      } else {
        handleUserSignedOut();
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      authError.value = error instanceof Error ? error.message : 'Authentication error occurred';
      handleUserSignedOut(); // Clear state on error
    } finally {
      loading.value = false;
    }
  };

  /**
   * Handle User Signed In
   * 
   * Processes user sign-in by retrieving token, checking admin privileges,
   * and managing token expiration.
   * 
   * @param {User} user - Authenticated Firebase user
   */
  const handleUserSignedIn = async (user: User) => {
    currentUser.value = user;

    try {
      const idTokenResult = await getIdTokenResult(user);
      
      // Validate token before processing
      if (isTokenExpired(idTokenResult.token)) {
        console.warn('Received expired token, attempting refresh');
        await refreshTokenInternal(user);
        return;
      }

      // Process valid token
      await processTokenResult(idTokenResult);
      
    } catch (error) {
      console.error('Error processing user token:', error);
      authError.value = 'Failed to authenticate user token';
      throw error;
    }
  };

  /**
   * Process Token Result
   * 
   * Extracts admin privileges and stores token securely.
   * 
   * @param {any} idTokenResult - Firebase ID token result
   */
  const processTokenResult = async (idTokenResult: any) => {
    // Extract admin privileges with type safety
    const claims = idTokenResult.claims as CustomClaims;
    isAdmin.value = Boolean(claims?.admin);
    
    // Store token in both reactive state and localStorage
    token.value = idTokenResult.token;
    storageManager.setItem('auth_token', idTokenResult.token);
  };

  /**
   * Handle User Signed Out
   * 
   * Clears all authentication state when user signs out or auth fails.
   */
  const handleUserSignedOut = () => {
    currentUser.value = null;
    isAdmin.value = false;
    token.value = null;
    storageManager.removeItem('auth_token');
  };

  /**
   * Handle Authentication Errors
   * 
   * Processes Firebase authentication errors and updates error state.
   * 
   * @param {Error} error - Firebase authentication error
   */
  const handleAuthError = (error: Error) => {
    console.error('Firebase auth error:', error);
    authError.value = `Authentication service error: ${error.message}`;
    loading.value = false;
  };

  /**
   * Refresh Authentication Token
   * 
   * Attempts to refresh the current user's authentication token.
   * Updates reactive state and localStorage on success.
   * 
   * @throws {Error} If no user is authenticated or refresh fails
   * 
   * @example
   * try {
   *   await refreshToken();
   *   console.log('Token refreshed successfully');
   * } catch (error) {
   *   console.error('Token refresh failed:', error);
   * }
   */
  const refreshToken = async (): Promise<void> => {
    if (!currentUser.value) {
      throw new Error('No authenticated user to refresh token for');
    }

    await refreshTokenInternal(currentUser.value);
  };

  /**
   * Internal Token Refresh Implementation
   * 
   * @param {User} user - Firebase user to refresh token for
   */
  const refreshTokenInternal = async (user: User): Promise<void> => {
    try {
      // Force token refresh
      const newTokenResult = await getIdTokenResult(user, true);
      await processTokenResult(newTokenResult);
    } catch (error) {
      console.error('Token refresh failed:', error);
      authError.value = 'Failed to refresh authentication token';
      throw error;
    }
  };

  /**
   * Sign Out User
   * 
   * Signs out the current user and clears all authentication state.
   * Handles Firebase sign-out errors gracefully.
   * 
   * @throws {Error} If Firebase sign-out fails
   * 
   * @example
   * try {
   *   await logout();
   *   console.log('User signed out successfully');
   * } catch (error) {
   *   console.error('Logout failed:', error);
   * }
   */
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      // State will be cleared by auth state listener
    } catch (error) {
      console.error('Logout error:', error);
      authError.value = error instanceof Error ? error.message : 'Logout failed';
      // Force clear state even if Firebase signOut fails
      handleUserSignedOut();
      throw error;
    }
  };

  /**
   * Clear Authentication Error
   * 
   * Clears the current authentication error state.
   * Useful for dismissing error messages in UI.
   */
  const clearError = (): void => {
    authError.value = null;
  };

  /**
   * Cleanup Resources
   * 
   * Unsubscribes from Firebase auth listener to prevent memory leaks.
   * Called automatically when component unmounts.
   */
  const cleanup = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
      authListenerInitialized = false;
    }
  };

  // Initialize auth listener
  initializeAuthListener();

  // Clean up subscription on component unmount (only if in component context)
  const instance = getCurrentInstance();
  if (instance) {
    onUnmounted(cleanup);
  }

  // Return reactive authentication state and methods
  return {
    currentUser: computed(() => currentUser.value),
    isAdmin: computed(() => isAdmin.value),
    loading: computed(() => loading.value),
    token: computed(() => token.value),
    authError: computed(() => authError.value),
    logout,
    refreshToken,
    clearError
  };
}

export default useAuth;
