<template>
  <div>
    <!-- Only show NavBar if not on login or root page -->
    <NavBar v-if="isLoggedIn && !loading && !isPublicRoute" />
    <router-view v-if="!loading && (isLoggedIn || isPublicRoute)" :key="$route.fullPath" />
    <div v-else-if="loading" class="loading-spinner">
      Loading...
    </div>
  </div>
</template>

<script>
import NavBar from './components/NavBar.vue';
import useAuth from './composables/useAuth';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export default {
  name: 'App',
  components: { NavBar },
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
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 1.5rem;
}
</style>

