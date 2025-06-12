<template>
  <div class="app-layout">
    <!-- Only show NavBar if not on login or root page -->
    <NavBar v-if="isLoggedIn && !loading && !isPublicRoute" />
    <main class="app-main">
      <router-view v-if="!loading && (isLoggedIn || isPublicRoute)" :key="$route.fullPath" />
      <div v-else-if="loading" class="loading-spinner">
        Loading...
      </div>
    </main>
    <!-- Only show footer if not on login or root page -->
    <AppFooter v-if="isLoggedIn && !loading && !isPublicRoute" />
  </div>
</template>

<script>
import NavBar from './components/NavBar.vue';
import AppFooter from './components/AppFooter.vue';
import useAuth from './composables/useAuth';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export default {
  name: 'App',
  components: { NavBar, AppFooter },
  setup() {
    const { currentUser, loading } = useAuth();
    const isLoggedIn = computed(() => !!currentUser.value);
    const route = useRoute();
    const publicPages = ['/']; // Only root is public, /login removed
    const isPublicRoute = computed(() => publicPages.includes(route.path));
    // Removed watcher for login redirect; router guard handles this
    return { isLoggedIn, loading, isPublicRoute };
  }
}
</script>

<style>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: none; /* Remove flex: 1 to prevent competition with footer */
  display: flex;
  flex-direction: column;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 1.5rem;
}
</style>

