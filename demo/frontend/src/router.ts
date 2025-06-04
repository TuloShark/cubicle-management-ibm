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
  { path: '/statistics', name: 'statistics', component: StatisticsView },
  { path: '/utilization', name: 'utilization', component: UtilizationView },
  { path: '/notifications', name: 'notifications', component: NotificationsView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const publicPages = ['/']; // Only root is public, /login removed
  const authRequired = !publicPages.includes(to.path);
  const { token } = useAuth();
  if (authRequired && !token.value) {
    return next('/');
  }
  next();
});

export default router;
