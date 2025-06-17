<template>
  <div class="app-layout">
    <!-- Only show NavBar if not on login or root page -->
    <NavBar v-if="isLoggedIn && !loading && !isPublicRoute" />
    <main class="app-main">
      <transition name="view-transition" mode="out-in">
        <router-view v-if="!loading && (isLoggedIn || isPublicRoute)" :key="$route.fullPath" />
        <div v-else-if="loading" class="loading-spinner">
          Loading...
        </div>
      </transition>
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
/* ===========================================
   APP LAYOUT - SIMPLIFIED FLEXBOX
   Clean functional layout structure
   =========================================== */

.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden; /* Prevent transition content from causing scrollbars */
  perspective: 1000px; /* Add perspective for 3D-like transitions */
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 1.5rem;
  color: #161616;
}

/* ===========================================
   VIEW TRANSITIONS - FLOATING APPROACH
   Elegant smooth transitions with floating effect
   =========================================== */

.view-transition-enter-active {
  transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
}

.view-transition-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
  position: absolute;
  width: 100%;
  height: 100%;
}

.view-transition-enter-from {
  opacity: 0;
  transform: translateY(40px) translateZ(0);
  filter: blur(3px);
}

.view-transition-leave-to {
  opacity: 0;
  transform: translateY(-20px) translateZ(0) scale(0.96);
  filter: blur(2px);
}

.view-transition-enter-to,
.view-transition-leave-from {
  opacity: 1;
  transform: translateY(0) translateZ(0) scale(1);
  filter: blur(0);
}

/* Smooth floating container */
.view-transition-enter-active > *,
.view-transition-leave-active > * {
  height: 100%;
  will-change: transform, opacity, filter;
  backface-visibility: hidden;
}
</style>

