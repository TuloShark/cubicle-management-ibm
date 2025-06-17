<!--
===================================================================
COMPONENT: NavBar
===================================================================
PURPOSE: 
Main navigation component providing primary navigation, user management,
and application-wide functionality. Implements IBM Carbon Design System
header and side navigation patterns.

FEATURES:
- Primary navigation with route preservation
- User authentication and profile management
- Password change functionality
- Logout confirmation modal
- Responsive side navigation with menu toggle
- Admin user detection and display

INTEGRATION:
- Used in: App.vue as main navigation
- Auth integration: useAuth composable for user state
- Date integration: useDateStore for navigation date preservation
- Router integration: Vue Router for programmatic navigation

DEPENDENCIES:
- Vue 3 Composition API
- @carbon/vue navigation components
- @carbon/icons-vue (User16)
- Firebase Authentication
- useAuth and useDateStore composables

ACCESSIBILITY:
- ARIA labels for navigation elements
- Skip to content functionality
- Proper modal focus management
- Keyboard navigation support

LAST UPDATED: June 2025
===================================================================
-->

<template>
  <cv-header aria-label="IBM Space Optimization Navigation">
    <cv-header-menu-button 
      aria-label="Toggle navigation menu" 
      aria-controls="side-nav" 
      :active="expandedSideNav" 
      @click="toggleSideNav" 
    />
    
    <cv-icon-button 
      @click="showJwtModal = true" 
      kind="secondary" 
      label="View user information"
      class="user-info-button"
    >
      <template #icon>
        <User16 />
      </template>
    </cv-icon-button>
    
    <cv-skip-to-content href="#main-content">Skip to content</cv-skip-to-content>
    
    <cv-header-name href="javascript:void(0)" prefix="IBM">
      Space Optimization
    </cv-header-name>
    <template v-slot:left-panels>
      <cv-side-nav 
        id="side-nav" 
        v-model:expanded="expandedSideNav" 
        :rail="true" 
        :fixed="useFixed"
        aria-label="Primary navigation"
      >
        <cv-side-nav-items>            <cv-side-nav-menu-item 
              href="javascript:void(0)" 
              :active="$route.name === 'reservations'" 
              @click="navigate('reservations')"
              aria-label="View and manage cubicle reservations"
            >
              Reservations
            </cv-side-nav-menu-item>
            <cv-side-nav-menu-item 
              href="javascript:void(0)" 
              :active="$route.name === 'statistics'" 
              @click="navigate('statistics')"
              aria-label="View cubicle usage statistics"
            >
              Statistics
            </cv-side-nav-menu-item>
            <cv-side-nav-menu-item 
              href="javascript:void(0)" 
              :active="$route.name === 'utilization'" 
              @click="navigate('utilization')"
              aria-label="View utilization reports"
            >
              Utilization Reports
            </cv-side-nav-menu-item>
            <cv-side-nav-menu-item 
              href="javascript:void(0)" 
              :active="$route.name === 'notifications'" 
              @click="navigate('notifications')"
              aria-label="Manage notification settings"
            >
              Notifications
            </cv-side-nav-menu-item>
          
          <cv-side-nav-menu-divider/>
          
          <cv-side-nav-menu-item 
            href="javascript:void(0)" 
            :active="showUserModal" 
            @click="showUserModal = true"
            aria-label="Change account password"
          >
            Change Password
          </cv-side-nav-menu-item>
          <cv-side-nav-menu-item 
            href="javascript:void(0)" 
            @click="showLogoutModal = true"
            aria-label="Logout from application"
          >
            Logout
          </cv-side-nav-menu-item>
        </cv-side-nav-items>
      </cv-side-nav>
    </template>
    <!-- User Information Modal -->
    <cv-modal
      :visible="showJwtModal"
      kind="default"
      size="sm"
      :autoHideOff="true"
      :primaryButtonDisabled="false"
      :disableTeleport="false"
      @modal-hide-request="showJwtModal = false"
      aria-labelledby="user-info-title"
    >
      <template v-slot:label>User Info</template>
      <template v-slot:title>
        <span id="user-info-title">User Details</span>
      </template>
      <template v-slot:content>
        <div class="user-info-content">
          <div v-if="currentUser" class="user-details">
            <div class="user-detail-item">
              <span class="detail-label">Email:</span>
              <span class="detail-value">{{ currentUser.email }}</span>
            </div>
            <div class="user-detail-item">
              <span class="detail-label">UID:</span>
              <span class="detail-value">{{ currentUser.uid }}</span>
            </div>
            <div class="user-detail-item">
              <span class="detail-label">Admin:</span>
              <span class="detail-value admin-status" :class="{ 'is-admin': isAdminUser }">
                {{ isAdminUser ? 'Yes' : 'No' }}
              </span>
            </div>
            <div v-if="currentUser.displayName" class="user-detail-item">
              <span class="detail-label">Name:</span>
              <span class="detail-value">{{ currentUser.displayName }}</span>
            </div>
          </div>
          <div v-else class="no-user-message">
            <p>No user is logged in.</p>
          </div>
        </div>
      </template>
      <template v-slot:primary-button>Close</template>
    </cv-modal>
    <!-- Change Password Modal -->
    <cv-modal
      :visible="showUserModal"
      kind="default"
      size="sm"
      :autoHideOff="true"
      :primaryButtonDisabled="false"
      :disableTeleport="false"
      @modal-hide-request="showUserModal = false"
      aria-labelledby="password-change-title"
    >
      <template v-slot:label>Change Password</template>
      <template v-slot:title>
        <span id="password-change-title">Change Password</span>
      </template>
      <template v-slot:content>
        <div v-if="currentUser" class="password-change-content">
          <form @submit.prevent="handleChangePassword" class="password-form">
            <cv-text-input 
              v-model="newPassword" 
              label="New Password" 
              type="password" 
              required 
              class="password-input"
              :invalid="passwordError"
              :invalidMessage="passwordError"
            />
            <cv-text-input 
              v-model="confirmPassword" 
              label="Confirm Password" 
              type="password" 
              required 
              class="password-input"
              :invalid="passwordError"
              :invalidMessage="passwordError"
            />
            <cv-button 
              type="submit" 
              kind="primary"
              class="submit-button"
              :disabled="!newPassword || !confirmPassword"
            >
              Update Password
            </cv-button>
          </form>
          <div class="password-message" :class="{ 'success': passwordSuccess, 'error': passwordError }">
            {{ passwordChangeMessage }}
          </div>
        </div>
      </template>
      <template v-slot:primary-button>
        <span @click="showUserModal = false">Close</span>
      </template>
    </cv-modal>
    <!-- Logout Confirmation Modal -->
    <cv-modal
      :visible="showLogoutModal"
      kind="default"
      size="sm"
      :autoHideOff="true"
      :primaryButtonDisabled="false"
      :disableTeleport="false"
      @modal-hide-request="showLogoutModal = false"
      @primary-click="confirmLogout"
      aria-labelledby="logout-title"
    >
      <template v-slot:label>Logout Confirmation</template>
      <template v-slot:title>
        <span id="logout-title">Confirm Logout</span>
      </template>
      <template v-slot:content>
        <div class="logout-content">
          <p>Are you sure you want to logout? You will need to sign in again to access the application.</p>
        </div>
      </template>
      <template v-slot:primary-button>Yes, Logout</template>
      <template v-slot:secondary-button>Cancel</template>
    </cv-modal>
  </cv-header>
</template>

<script>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { User16 } from '@carbon/icons-vue';
import { updatePassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import useAuth from '../composables/useAuth';
import { useDateStore } from '../composables/useDateStore';
import { isAdminUid } from '../utils/envUtils';

export default {
  name: 'NavBar',
  components: { 
    User16 
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { currentUser, logout } = useAuth();
    const { getRouteDate } = useDateStore();

    // Reactive state
    const expandedSideNav = ref(false);
    const useFixed = ref(true);
    const showJwtModal = ref(false);
    const showUserModal = ref(false);
    const showLogoutModal = ref(false);
    
    // Password change state
    const newPassword = ref('');
    const confirmPassword = ref('');
    const passwordChangeMessage = ref('');
    const passwordError = ref('');
    const passwordSuccess = ref(false);

    // Computed properties
    /**
     * Determines if the current user has admin privileges
     * Uses centralized environment utility for consistent admin checking
     * @returns {boolean} True if user is admin
     */
    const isAdminUser = computed(() => {
      if (!currentUser.value) return false;
      if (currentUser.value.claims && currentUser.value.claims.admin) return true;
      return isAdminUid(currentUser.value.uid);
    });

    // Methods
    /**
     * Toggles the side navigation panel
     */
    const toggleSideNav = () => {
      expandedSideNav.value = !expandedSideNav.value;
    };

    /**
     * Navigates to a route with date preservation for certain views
     * @param {string} routeName - The route name to navigate to
     */
    const navigate = async (routeName) => {
      try {
        const currentDate = await getRouteDate();
        
        if ((routeName === 'reservations' || routeName === 'statistics' || routeName === 'utilization') && currentDate) {
          console.log(`Navigating to ${routeName} with date: ${currentDate}`);
          router.push(`/${routeName}/${currentDate}`);
        } else {
          router.push({ name: routeName });
        }
      } catch (error) {
        console.error('Error getting route date for navigation:', error);
        // Fallback to base route without date
        router.push({ name: routeName });
      }
      
      // Close sidebar after navigation
      expandedSideNav.value = false;
    };

    /**
     * Handles password change form submission with validation
     */
    const handleChangePassword = async () => {
      // Reset state
      passwordChangeMessage.value = '';
      passwordError.value = '';
      passwordSuccess.value = false;

      // Validation
      if (!newPassword.value || !confirmPassword.value) {
        passwordError.value = 'Both fields are required.';
        passwordChangeMessage.value = 'Both fields are required.';
        return;
      }

      if (newPassword.value !== confirmPassword.value) {
        passwordError.value = 'Passwords do not match.';
        passwordChangeMessage.value = 'Passwords do not match.';
        return;
      }

      if (newPassword.value.length < 6) {
        passwordError.value = 'Password must be at least 6 characters.';
        passwordChangeMessage.value = 'Password must be at least 6 characters.';
        return;
      }

      try {
        await updatePassword(currentUser.value, newPassword.value);
        passwordSuccess.value = true;
        passwordChangeMessage.value = 'Password updated successfully. You will be logged out for security.';
        
        // Clear form
        newPassword.value = '';
        confirmPassword.value = '';
        
        // Auto-logout for security
        setTimeout(() => {
          logout();
          localStorage.removeItem('auth_token');
          router.push({ path: '/' });
          showUserModal.value = false;
        }, 1500);
        
      } catch (err) {
        passwordError.value = err.message || 'Failed to update password.';
        
        if (err.code === 'auth/requires-recent-login') {
          passwordChangeMessage.value = 'Please log out and log in again, then try changing your password.';
        } else if (err.code === 'auth/weak-password') {
          passwordChangeMessage.value = 'Password is too weak. Please choose a stronger password.';
        } else {
          passwordChangeMessage.value = err.message || 'Failed to update password.';
        }
        
        console.error('Password change error:', err);
      }
    };

    /**
     * Confirms logout and redirects to login page
     */
    const confirmLogout = () => {
      logout();
      localStorage.removeItem('auth_token');
      router.push({ path: '/' });
      showUserModal.value = false;
      showLogoutModal.value = false;
    };

    return {
      // Reactive state
      expandedSideNav,
      useFixed,
      showJwtModal,
      showUserModal,
      showLogoutModal,
      newPassword,
      confirmPassword,
      passwordChangeMessage,
      passwordError,
      passwordSuccess,
      
      // Computed
      currentUser,
      isAdminUser,
      
      // Methods
      toggleSideNav,
      navigate,
      handleChangePassword,
      confirmLogout,
      
      // Router
      $route: route
    };
  }
};
</script>

<style scoped>
/* ===========================================
   NAVBAR - CLEAN CARBON IMPLEMENTATION
   IBM Carbon Design System Compliant
   =========================================== */

/* User Info Button Styling */
.user-info-button {
  margin-left: auto;
}

/* Smooth Sidebar Transitions */
:deep(.bx--side-nav) {
  transition: transform 0.3s cubic-bezier(0.2, 0, 0.38, 0.9), 
              width 0.3s cubic-bezier(0.2, 0, 0.38, 0.9);
}

:deep(.bx--side-nav--expanded) {
  transition: transform 0.3s cubic-bezier(0.2, 0, 0.38, 0.9), 
              width 0.3s cubic-bezier(0.2, 0, 0.38, 0.9);
}

:deep(.bx--side-nav__overlay) {
  transition: opacity 0.3s cubic-bezier(0.2, 0, 0.38, 0.9);
}

:deep(.bx--side-nav__menu-item),
:deep(.bx--side-nav__menu) {
  transition: opacity 0.2s ease 0.1s;
}

:deep(.bx--side-nav--rail:not(.bx--side-nav--expanded)) .bx--side-nav__menu-item {
  transition: opacity 0.2s ease;
}

/* Modal Content Styling */
.user-info-content {
  padding: 1rem 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.user-detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 600;
  color: #161616;
  min-width: 4rem;
}

.detail-value {
  color: #525252;
  font-family: 'IBM Plex Mono', monospace;
  word-break: break-all;
  text-align: right;
}

.admin-status.is-admin {
  color: #0f62fe;
  font-weight: 600;
}

.no-user-message {
  text-align: center;
  padding: 1rem;
  color: #6f6f6f;
}

/* Password Change Modal */
.password-change-content {
  padding: 1rem 0;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.password-input {
  margin-bottom: 0;
}

.submit-button {
  align-self: flex-start;
  margin-top: 0.5rem;
}

.password-message {
  min-height: 1.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.password-message.success {
  background-color: #d4f1d4;
  color: #24a148;
  border: 1px solid #24a148;
}

.password-message.error {
  background-color: #ffd7d9;
  color: #da1e28;
  border: 1px solid #da1e28;
}

/* Logout Modal */
.logout-content {
  padding: 0.5rem 0;
}

.logout-content p {
  margin: 0;
  color: #525252;
  line-height: 1.5;
}

/* Responsive Design - Single Breakpoint */
@media (max-width: 768px) {
  .user-detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .detail-value {
    text-align: left;
    word-break: break-word;
  }
}
</style>
