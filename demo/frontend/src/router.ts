/**
 * @fileoverview Vue Router Configuration
 * 
 * Central navigation and routing configuration for the IBM Space Optimization application.
 * Provides secure, authenticated routing with comprehensive error handling, loading states,
 * and accessibility features. Implements route guards for authentication, parameter validation,
 * and navigation tracking for optimal user experience.
 * 
 * @author IBM Space Optimization Developer - Wander Jimenez Calvo
 * @version 2.1.0
 * @since 1.0.0
 * 
 * @requires vue-router
 * @requires ./composables/useAuth
 * 
 * @example
 * // Basic usage in main.ts
 * import router from './router';
 * app.use(router);
 * 
 * @example
 * // Programmatic navigation
 * import { useRouter } from 'vue-router';
 * const router = useRouter();
 * await router.push('/reservations/2024-01-15');
 */

import { createRouter, createWebHistory, type RouteRecordRaw, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router';
import LoginView from './views/LoginView.vue';
import ReservationsView from './views/ReservationsView.vue';
import StatisticsView from './views/StatisticsView.vue';
import UtilizationView from './views/UtilizationView.vue';
import NotificationsView from './views/NotificationsView.vue';
import useAuth from './composables/useAuth';

/**
 * Route Names Enumeration
 * 
 * Strongly typed route names for consistent navigation throughout the application.
 * Prevents typos and enables IDE autocomplete for route references.
 * 
 * @enum {string}
 */
export const RouteNames = {
  ROOT: 'root',
  RESERVATIONS: 'reservations',
  RESERVATIONS_WITH_DATE: 'reservations-with-date',
  STATISTICS: 'statistics',
  STATISTICS_WITH_DATE: 'statistics-with-date',
  UTILIZATION: 'utilization',
  UTILIZATION_WITH_DATE: 'utilization-with-date',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * Route Configuration Constants
 * 
 * Centralized route configuration constants for maintainability.
 */
const ROUTE_CONFIG = {
  /** Pages that don't require authentication */
  PUBLIC_PAGES: ['/'] as readonly string[],
  /** Maximum time to wait for auth initialization (ms) */
  AUTH_TIMEOUT: 2000,
  /** Time to wait between auth checks (ms) */
  AUTH_CHECK_INTERVAL: 50,
  /** Date parameter regex pattern */
  DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
} as const;

/**
 * Validates date parameter format
 * 
 * Ensures date parameters match the expected YYYY-MM-DD format and represent
 * valid dates within reasonable bounds for the application. Handles edge cases
 * like Promise objects and null/undefined values gracefully.
 * 
 * @param {any} date - Date value to validate (should be string)
 * @returns {boolean} True if date is valid, false otherwise
 * 
 * @example
 * validateDateParam('2024-01-15'); // true
 * validateDateParam('invalid-date'); // false
 * validateDateParam(Promise.resolve('2024-01-15')); // false (handled gracefully)
 */
function validateDateParam(date: any): boolean {
  // Handle null, undefined, or non-string types (including Promises)
  if (!date || typeof date !== 'string') {
    return false;
  }

  // Handle empty strings or whitespace-only strings
  if (date.trim().length === 0) {
    return false;
  }

  // Check format first
  if (!ROUTE_CONFIG.DATE_PATTERN.test(date)) {
    return false;
  }

  // Validate as actual date
  const dateObj = new Date(date + 'T00:00:00');
  if (isNaN(dateObj.getTime())) {
    return false;
  }

  // Check reasonable bounds (1 year ago to 1 year ahead)
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneYearAhead = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  return dateObj >= oneYearAgo && dateObj <= oneYearAhead;
}

/**
 * Application Route Definitions
 * 
 * Defines all routes for the application with proper typing, metadata,
 * and parameter validation. Each route includes title, authentication
 * requirements, and accessibility information.
 * 
 * @type {RouteRecordRaw[]}
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: RouteNames.ROOT,
    component: LoginView,
    meta: {
      title: 'Login - IBM Space Optimization',
      requiresAuth: false,
      description: 'User authentication and login page',
      breadcrumb: 'Login',
    },
  },
  {
    path: '/reservations',
    name: RouteNames.RESERVATIONS,
    component: ReservationsView,
    meta: {
      title: 'Reservations - IBM Space Optimization',
      requiresAuth: true,
      description: 'View and manage cubicle reservations',
      breadcrumb: 'Reservations',
    },
  },
  {
    path: '/reservations/:date',
    name: RouteNames.RESERVATIONS_WITH_DATE,
    component: ReservationsView,
    meta: {
      title: 'Reservations - IBM Space Optimization',
      requiresAuth: true,
      description: 'View and manage cubicle reservations for specific date',
      breadcrumb: 'Reservations',
    },
    beforeEnter: (to, from, next) => {
      const date = to.params.date as string;
      if (!validateDateParam(date)) {
        // Provide more informative error logging
        const dateType = typeof date;
        const dateValue = dateType === 'object' && date?.constructor?.name === 'Promise' 
          ? '[Promise object - async function not awaited]'
          : String(date);
        console.warn(`Invalid date parameter in ${to.path}: ${dateValue} (type: ${dateType})`);
        next({ name: RouteNames.RESERVATIONS });
        return;
      }
      next();
    },
  },
  {
    path: '/statistics',
    name: RouteNames.STATISTICS,
    component: StatisticsView,
    meta: {
      title: 'Statistics - IBM Space Optimization',
      requiresAuth: true,
      description: 'View space utilization statistics and analytics',
      breadcrumb: 'Statistics',
    },
  },
  {
    path: '/statistics/:date',
    name: RouteNames.STATISTICS_WITH_DATE,
    component: StatisticsView,
    meta: {
      title: 'Statistics - IBM Space Optimization',
      requiresAuth: true,
      description: 'View space utilization statistics for specific date',
      breadcrumb: 'Statistics',
    },
    beforeEnter: (to, from, next) => {
      const date = to.params.date as string;
      if (!validateDateParam(date)) {
        // Provide more informative error logging
        const dateType = typeof date;
        const dateValue = dateType === 'object' && date?.constructor?.name === 'Promise' 
          ? '[Promise object - async function not awaited]'
          : String(date);
        console.warn(`Invalid date parameter in ${to.path}: ${dateValue} (type: ${dateType})`);
        next({ name: RouteNames.STATISTICS });
        return;
      }
      next();
    },
  },
  {
    path: '/utilization',
    name: RouteNames.UTILIZATION,
    component: UtilizationView,
    meta: {
      title: 'Utilization - IBM Space Optimization',
      requiresAuth: true,
      description: 'View detailed space utilization reports and trends',
      breadcrumb: 'Utilization',
    },
  },
  {
    path: '/utilization/:date',
    name: RouteNames.UTILIZATION_WITH_DATE,
    component: UtilizationView,
    meta: {
      title: 'Utilization - IBM Space Optimization',
      requiresAuth: true,
      description: 'View utilization reports for specific date',
      breadcrumb: 'Utilization',
    },
    beforeEnter: (to, from, next) => {
      const date = to.params.date as string;
      if (!validateDateParam(date)) {
        // Provide more informative error logging
        const dateType = typeof date;
        const dateValue = dateType === 'object' && date?.constructor?.name === 'Promise' 
          ? '[Promise object - async function not awaited]'
          : String(date);
        console.warn(`Invalid date parameter in ${to.path}: ${dateValue} (type: ${dateType})`);
        next({ name: RouteNames.UTILIZATION });
        return;
      }
      next();
    },
  },
  {
    path: '/notifications',
    name: RouteNames.NOTIFICATIONS,
    component: NotificationsView,
    meta: {
      title: 'Notifications - IBM Space Optimization',
      requiresAuth: true,
      description: 'Manage notification settings and view notification history',
      breadcrumb: 'Notifications',
    },
  },
];

/**
 * Vue Router Instance
 * 
 * Creates and configures the main router instance with web history mode.
 * Includes scroll behavior restoration and navigation tracking.
 * 
 * @type {Router}
 */
const router = createRouter({
  history: createWebHistory(),
  routes,
  
  /**
   * Scroll Behavior Configuration
   * 
   * Manages scroll position during navigation for better UX.
   * Preserves scroll position on back/forward navigation and scrolls to top for new routes.
   * 
   * @param {RouteLocationNormalized} to - Target route
   * @param {RouteLocationNormalized} from - Source route
   * @param {any} savedPosition - Saved scroll position (if any)
   * @returns {ScrollBehavior} Scroll behavior configuration
   */
  scrollBehavior(to, from, savedPosition) {
    // If saved position exists (back/forward navigation), restore it
    if (savedPosition) {
      return savedPosition;
    }
    
    // If navigating to a hash, scroll to that element
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      };
    }
    
    // Otherwise, scroll to top
    return { top: 0, behavior: 'smooth' };
  },
});

/**
 * Wait for Authentication Initialization
 * 
 * Waits for the authentication system to initialize before proceeding with navigation.
 * Implements exponential backoff to handle slow authentication systems gracefully.
 * 
 * @param {any} authState - Authentication state object
 * @returns {Promise<boolean>} Promise that resolves when auth is ready or timeout
 * 
 * @example
 * const authReady = await waitForAuth(authState);
 * if (!authReady) {
 *   // Handle timeout scenario
 * }
 */
async function waitForAuth(authState: any): Promise<boolean> {
  let totalWaitTime = 0;
  let currentInterval: number = ROUTE_CONFIG.AUTH_CHECK_INTERVAL;
  
  try {
    while (authState.loading?.value && totalWaitTime < ROUTE_CONFIG.AUTH_TIMEOUT) {
      await new Promise(resolve => setTimeout(resolve, currentInterval));
      totalWaitTime += currentInterval;
      
      // Exponential backoff: increase wait time gradually
      currentInterval = Math.min(Math.floor(currentInterval * 1.2), 200);
    }
    
    return !authState.loading?.value;
  } catch (error) {
    console.error('Error waiting for auth initialization:', error);
    return false; // Assume loading failed
  }
}

/**
 * Global Navigation Guard - Authentication
 * 
 * Implements comprehensive authentication checking before route access.
 * Handles loading states, race conditions, and provides fallback behavior
 * for authentication failures.
 * 
 * @param {RouteLocationNormalized} to - Target route
 * @param {RouteLocationNormalized} from - Source route  
 * @param {NavigationGuardNext} next - Navigation continuation function
 * 
 * @example
 * // This guard runs automatically before each route navigation
 * // No manual invocation required
 */
router.beforeEach(async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  try {
    // Check if route requires authentication
    const requiresAuth = to.meta?.requiresAuth !== false;
    const isPublicRoute = (ROUTE_CONFIG.PUBLIC_PAGES as readonly string[]).includes(to.path);
    
    // Allow public routes immediately
    if (!requiresAuth || isPublicRoute) {
      next();
      return;
    }
    
    // Get authentication state
    const authState = useAuth();
    
    // Wait for authentication to initialize
    const authReady = await waitForAuth(authState);
    
    if (!authReady) {
      console.warn('Authentication timeout during navigation - redirecting to login');
      next('/');
      return;
    }
    
    // Check authentication status
    if (!authState.token.value) {
      console.info('Redirecting to login - authentication required');
      next('/');
      return;
    }
    
    // Authentication successful, proceed with navigation
    next();
    
  } catch (error) {
    console.error('Navigation guard error:', error);
    
    // On error, redirect to login for safety
    if (to.path !== '/') {
      console.info('Navigation guard error - redirecting to login');
      next('/');
    } else {
      // If already going to login and there's an error, allow it
      next();
    }
  }
});

/**
 * Global Navigation Guard - After Navigation
 * 
 * Runs after each successful navigation to update document title,
 * announce route changes for accessibility, and handle post-navigation tasks.
 * 
 * @param {RouteLocationNormalized} to - Target route
 * @param {RouteLocationNormalized} from - Source route
 */
router.afterEach((to: RouteLocationNormalized, from: RouteLocationNormalized) => {
  try {
    // Update document title
    if (to.meta?.title) {
      document.title = to.meta.title as string;
    }
    
    // Announce route change for screen readers
    const routeAnnouncement = (to.meta?.description as string) || `Navigated to ${(to.meta?.breadcrumb as string) || String(to.name) || 'page'}`;
    announceForScreenReader(routeAnnouncement);
    
    // Track navigation for analytics (if needed)
    // trackNavigation(to, from);
    
  } catch (error) {
    console.error('Post-navigation error:', error);
    // Non-critical error, don't interrupt user experience
  }
});

/**
 * Accessibility Helper - Screen Reader Announcements
 * 
 * Creates live region announcements for screen readers during navigation.
 * Helps visually impaired users understand route changes.
 * 
 * @param {string} message - Message to announce
 * 
 * @example
 * announceForScreenReader('Navigated to Reservations page');
 */
function announceForScreenReader(message: string): void {
  try {
    // Create or get existing live region
    let liveRegion = document.getElementById('router-live-region');
    
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'router-live-region';
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }
    
    // Update the live region with a slight delay to ensure it's announced
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = message;
      }
    }, 100);
    
  } catch (error) {
    console.error('Screen reader announcement error:', error);
    // Non-critical error, don't interrupt user experience
  }
}

/**
 * Router Utilities Export
 * 
 * Exports additional utilities for components to use alongside the router.
 * Provides type-safe navigation helpers and validation functions.
 */
export { validateDateParam };

/**
 * Default Router Export
 * 
 * Main router instance configured with all routes, guards, and behavior.
 * Import this in main.ts to configure the Vue application.
 * 
 * @example
 * import router from './router';
 * app.use(router);
 */
export default router;
