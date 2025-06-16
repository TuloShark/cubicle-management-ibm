import { createRouter, createWebHistory } from 'vue-router';
import LoginView from './views/LoginView.vue';
import ReservationsView from './views/ReservationsView.vue';
import StatisticsView from './views/StatisticsView.vue';
import UtilizationView from './views/UtilizationView.vue';
import NotificationsView from './views/NotificationsView.vue';
import useAuth from './composables/useAuth';

const routes = [
  { path: '/', name: 'root', component: LoginView },
  { path: '/reservations', name: 'reservations', component: ReservationsView },
  { path: '/reservations/:date', name: 'reservations-with-date', component: ReservationsView },
  { path: '/statistics', name: 'statistics', component: StatisticsView },
  { path: '/statistics/:date', name: 'statistics-with-date', component: StatisticsView },
  { path: '/utilization', name: 'utilization', component: UtilizationView },
  { path: '/notifications', name: 'notifications', component: NotificationsView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const publicPages = ['/']; // Only root is public, /login removed
  const authRequired = !publicPages.includes(to.path);
  const { token, loading } = useAuth();
  
  // Wait for auth to load to prevent race conditions
  if (loading.value) {
    // Wait a bit for auth to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    if (loading.value) {
      // If still loading after delay, allow navigation but let components handle auth
      return next();
    }
  }
  
  if (authRequired && !token.value) {
    return next('/');
  }
  next();
});

export default router;
