<template>
  <cv-header aria-label="Carbon header">
    <cv-header-menu-button aria-label="Header menu" aria-controls="side-nav" :active="expandedSideNav" @click="toggleSideNav" />
    <cv-icon-button @click="showJwtModal = true" kind="secondary" label="User">
      <template #icon>
        <User16 />
      </template>
    </cv-icon-button>
    <cv-skip-to-content href="#main-content">Skip to content</cv-skip-to-content>
    <cv-header-name href="javascript:void(0)" prefix="IBM">Space Optimization</cv-header-name>
    <template v-slot:left-panels>
      <cv-side-nav id="side-nav" v-model:expanded="expandedSideNav" :rail="true" :fixed="useFixed">
        <cv-side-nav-items>
          <cv-side-nav-menu title="Spaces">
            <cv-side-nav-menu-item 
              href="javascript:void(0)" 
              :active="$route.name === 'reservations'" 
              @click="navigate('reservations')"
            >Reservations</cv-side-nav-menu-item>
            <cv-side-nav-menu-item 
              href="javascript:void(0)" 
              :active="$route.name === 'statistics'" 
              @click="navigate('statistics')"
            >Statistics</cv-side-nav-menu-item>
            <cv-side-nav-menu-item 
              href="javascript:void(0)" 
              :active="$route.name === 'utilization'" 
              @click="navigate('utilization')"
            >Utilization Reports</cv-side-nav-menu-item>
            <cv-side-nav-menu-item 
              href="javascript:void(0)" 
              :active="$route.name === 'notifications'" 
              @click="navigate('notifications')"
            >Notifications</cv-side-nav-menu-item>
          </cv-side-nav-menu>
          <cv-side-nav-menu-divider/>
          <cv-side-nav-menu title="User">
            <cv-side-nav-menu-item 
              :active="showUserModal" 
              @click="showUserModal = true"
            >
              Change Password
            </cv-side-nav-menu-item>
            <cv-side-nav-menu-item @click="showLogoutModal = true">
              Logout
            </cv-side-nav-menu-item>
          </cv-side-nav-menu>
        </cv-side-nav-items>
      </cv-side-nav>
    </template>
    <cv-modal
      :visible="showJwtModal"
      kind="default"
      size="sm"
      :autoHideOff="true"
      :primaryButtonDisabled="false"
      :disableTeleport="false"
      @modal-hide-request="showJwtModal = false"
    >
      <template v-slot:label>User Info</template>
      <template v-slot:title>User Details</template>
      <template v-slot:content>
        <div v-if="currentUser">
          <p><strong>Email:</strong> {{ currentUser.email }}</p>
          <p><strong>UID:</strong> {{ currentUser.uid }}</p>
          <p><strong>Admin:</strong> <span v-if="isAdminUser">Yes</span><span v-else>No</span></p>
          <p v-if="currentUser.displayName"><strong>Name:</strong> {{ currentUser.displayName }}</p>
        </div>
        <div v-else>
          <p>No user is logged in.</p>
        </div>
      </template>
      <template v-slot:primary-button>Close</template>
    </cv-modal>
    <cv-modal
      :visible="showUserModal"
      kind="default"
      size="sm"
      :autoHideOff="true"
      :primaryButtonDisabled="false"
      :disableTeleport="false"
      @modal-hide-request="showUserModal = false"
    >
      <template v-slot:label>Change Password</template>
      <template v-slot:title>Change Password</template>
      <template v-slot:content>
        <div v-if="currentUser" style="padding: 2rem 2rem; margin: 1rem 1rem;">
          <form @submit.prevent="handleChangePassword">
            <cv-text-input v-model="newPassword" label="New Password" type="password" required style="margin-bottom: 1rem;" />
            <cv-text-input v-model="confirmPassword" label="Confirm Password" type="password" required style="margin-bottom: 1rem;" />
            <cv-button type="submit" kind="primary">Update Password</cv-button>
          </form>
          <div style="margin-top: 1rem; min-height: 1.5em;">
            {{ passwordChangeMessage || ' ' }}
          </div>
        </div>
      </template>
      <template v-slot:primary-button>
        <span style="min-width: 80px; display: inline-block;" @click="showUserModal = false">Close</span>
      </template>
    </cv-modal>
    <cv-modal
      :visible="showLogoutModal"
      kind="default"
      size="sm"
      :autoHideOff="true"
      :primaryButtonDisabled="false"
      :disableTeleport="false"
      @modal-hide-request="showLogoutModal = false"
      @primary-click="confirmLogout"
    >
      <template v-slot:label>Logout Confirmation</template>
      <template v-slot:title>Confirm Logout</template>
      <template v-slot:content>
        <p>Are you sure you want to logout?</p>
      </template>
      <template v-slot:primary-button>Yes</template>
      <template v-slot:secondary-button>No</template>
    </cv-modal>
  </cv-header>
</template>

<script>
import { User16 } from '@carbon/icons-vue';
import useAuth from '../composables/useAuth';
import { updatePassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { computed } from 'vue';

export default {
  name: 'NavBar',
  components: { User16 },
  setup() {
    const { currentUser, logout } = useAuth();
    const isAdminUser = computed(() => {
      if (!currentUser.value) return false;
      if (currentUser.value.claims && currentUser.value.claims.admin) return true;
      const adminUids = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(u => u.trim());
      return adminUids.includes(currentUser.value.uid);
    });
    return { currentUser, logout, $firebaseAuth: auth, isAdminUser };
  },
  data() {
    return {
      expandedSideNav: false,
      useFixed: true,
      showJwtModal: false,
      showUserModal: false,
      showLogoutModal: false,
      newPassword: '',
      confirmPassword: '',
      passwordChangeMessage: '',
    };
  },
  computed: {
    jwt() {
      return localStorage.getItem('auth_token') || 'No token found';
    }
  },
  methods: {
    toggleSideNav() {
      this.expandedSideNav = !this.expandedSideNav;
    },
    navigate(route) {
      // Use Vue Router for navigation
      this.$router.push({ name: route });
      this.expandedSideNav = false;
    },
    async handleChangePassword() {
      this.passwordChangeMessage = '';
      if (!this.newPassword || !this.confirmPassword) {
        this.passwordChangeMessage = 'Both fields are required.';
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.passwordChangeMessage = 'Passwords do not match.';
        return;
      }
      try {
        await updatePassword(this.currentUser, this.newPassword);
        this.passwordChangeMessage = 'Password updated successfully. You will be logged out.';
        this.newPassword = '';
        this.confirmPassword = '';
        setTimeout(() => {
          this.logout();
          localStorage.removeItem('auth_token');
          this.$router.push({ path: '/' }); // Redirect to root (login page)
          this.showUserModal = false;
        }, 1500);
      } catch (err) {
        if (err.code === 'auth/requires-recent-login') {
          this.passwordChangeMessage = 'Please log out and log in again, then try changing your password.';
        } else {
          this.passwordChangeMessage = err.message || 'Failed to update password.';
        }
      }
    },
    confirmLogout() {
      this.logout();
      localStorage.removeItem('auth_token');
      this.$router.push({ path: '/' });
      this.showUserModal = false;
      this.showLogoutModal = false;
    },
  },
};
</script>

<style scoped>
.cv-header {
  position: fixed;
  width: 100%;
  z-index: 1000;
  top: 0;
  left: 0;
}

/* Prevent scrollbar from disappearing when modal is open */
:global(body.bx--body--with-modal-open),
:global(html.bx--body--with-modal-open) {
  overflow-y: scroll !important;
  overflow-x: hidden !important;
}

/* Ensure modal does not create its own scroll context */
:global(.bx--modal),
:global(.cv-modal) {
  overflow-x: hidden !important;
}

:global(.bx--modal-container) {
  overflow: visible !important;
}
</style>
