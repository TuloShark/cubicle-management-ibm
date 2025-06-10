<template>
  <!--
    CubicleGrid.vue
    Main grid component for displaying and managing cubicle reservations.
    Sections: A (left), B (middle), C (right). Each section is a grid of CubicleTile components.
    Modal allows changing cubicle state and viewing reservation info.
  -->
  <div class="cubicle-container">
    <!-- Section A (Left) -->
    <div class="section-wrapper left-grid">
      <div class="cubicle-grid">
        <CubicleTile
          v-for="cubicle in leftSection"
          :key="cubicle.serial"
          :cubicle="cubicle"
          :showName="false"
          :reservedByUser="cubicle.reservedByUser"
          @click="openModal(cubicle)"
        />
      </div>
    </div>
    <!-- Section B (Middle) -->
    <div class="section-wrapper middle-grid">
      <div class="cubicle-grid">
        <CubicleTile
          v-for="cubicle in middleSection"
          :key="cubicle.serial"
          :cubicle="cubicle"
          :showName="false"
          :reservedByUser="cubicle.reservedByUser"
          @click="openModal(cubicle)"
        />
      </div>
    </div>
    <!-- Section C (Right) -->
    <div class="section-wrapper right-grid">
      <div class="cubicle-grid">
        <CubicleTile
          v-for="cubicle in rightSection"
          :key="cubicle.serial"
          :cubicle="cubicle"
          :showName="false"
          :reservedByUser="cubicle.reservedByUser"
          @click="openModal(cubicle)"
        />
      </div>
    </div>
    <!-- Modal for cubicle details and state change -->
    <cv-modal
      :visible="showModal"
      kind="default"
      size="sm"
      :autoHideOff="true"
      :primaryButtonDisabled="!canModifyCubicle"
      :disableTeleport="false"
      @modal-hide-request="closeModal"
      @primary-click="changeState('available')"
      @secondary-click="changeState('reserved')"
      @other-btn-click="changeState('error')"
    >
      <template v-slot:label>Details</template>
      <template v-slot:title>Cubicle Information</template>
      <template v-slot:content>
        <p><strong>Section:</strong> {{ selectedCubicle?.section }}</p>
        <p><strong>Row:</strong> {{ selectedCubicle?.row }}</p>
        <p><strong>Column:</strong> {{ selectedCubicle?.col }}</p>
        <p><strong>Code:</strong> {{ selectedCubicle?.serial }}</p>
        <p><strong>Name:</strong> {{ selectedCubicle?.name }}</p>
        <p><strong>Current State:</strong> {{ selectedCubicle?.status }}</p>
        <p v-if="selectedCubicle?.status === 'reserved'">
          <strong>Reserved By: </strong>
          <span v-if="reservationUser">
            {{ reservationUser.email }}
          </span>
          <span v-else>Loading...</span>
        </p>
        <div v-if="!canModifyCubicle && selectedCubicle?.status === 'reserved'" class="permission-notice">
          <p><strong>Notice:</strong> This cubicle is reserved by another user and cannot be modified.</p>
        </div>
        <div v-if="!isAdminUser && selectedCubicle?.status === 'error'" class="permission-notice">
          <p><strong>Notice:</strong> Only administrators can modify cubicles in error state.</p>
        </div>
      </template>
      <template v-slot:other-button v-if="canChangeToError">Error</template>
      <template v-slot:secondary-button v-if="canModifyCubicle">Reserved</template>
      <template v-slot:primary-button v-if="canModifyCubicle">Available</template>
    </cv-modal>

    <!-- Not Your Reservation Modal -->
    <cv-modal
      :visible="showNotYourReservationModal"
      kind="default"
      size="sm"
      :autoHideOff="true"
      :disableTeleport="false"
      @modal-hide-request="closeNotYourReservationModal"
      @primary-click="closeNotYourReservationModal"
    >
      <template v-slot:label>Access Denied</template>
      <template v-slot:title>This is not your Reservation</template>
      <template v-slot:content>
        <p>This cubicle is reserved by another user and cannot be modified by you.</p>
        <p v-if="reservationUser">
          <strong>Reserved by:</strong> {{ reservationUser.email }}
        </p>
      </template>
      <template v-slot:primary-button>OK</template>
    </cv-modal>
  </div>
</template>

<script>
// CubicleGrid.vue
// This component displays the main cubicle grid for all sections (A, B, C).
// Handles modal logic for cubicle details and reservation state changes.
// Emits 'update-cubicle-state' to parent when a cubicle's state is changed.
import CubicleTile from './CubicleTile.vue';
import { CvDropdown, CvButton, CvToggle } from '@carbon/vue';
import axios from 'axios';
import useAuth from '../composables/useAuth';
import { computed } from 'vue';

export default {
  name: 'CubicleGrid',
  components: {
    CubicleTile,
    CvDropdown,
    CvButton,
    CvToggle,
  },
  setup() {
    const { currentUser, isAdmin } = useAuth();
    
    // Check if user is admin using VITE_ADMIN_UIDS
    const isAdminUser = computed(() => {
      if (!currentUser.value) return false;
      const adminUids = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(u => u.trim());
      return adminUids.includes(currentUser.value.uid);
    });
    
    return {
      currentUser,
      isAdmin,
      isAdminUser
    };
  },
  props: {
    cubicles: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      selectedCubicle: null, // Cubicle selected for modal
      showModal: false,      // Modal visibility
      showNotYourReservationModal: false, // Not your reservation modal visibility
      reservationUser: null, // Reservation user info for selected cubicle
    };
  },
  computed: {
    // Section A (left grid)
    leftSection() {
      return this.cubicles.filter(c => c.section === 'A');
    },
    // Section B (middle grid)
    middleSection() {
      return this.cubicles.filter(c => c.section === 'B');
    },
    // Section C (right grid)
    rightSection() {
      return this.cubicles.filter(c => c.section === 'C');
    },
    // Check if current user can modify the selected cubicle
    canModifyCubicle() {
      if (!this.selectedCubicle || !this.currentUser) return false;
      
      // Admin can modify any cubicle
      if (this.isAdminUser) return true;
      
      // For error state cubicles, only admin can modify
      if (this.selectedCubicle.status === 'error') return false;
      
      // For reserved cubicles, only the user who reserved it can modify
      if (this.selectedCubicle.status === 'reserved') {
        return this.reservationUser && this.reservationUser.uid === this.currentUser.uid;
      }
      
      // Available cubicles can be modified by anyone
      return this.selectedCubicle.status === 'available';
    },
    // Check if current user can change cubicle to error state
    canChangeToError() {
      return this.isAdminUser && this.canModifyCubicle;
    }
  },
  methods: {
    /**
     * Opens the modal for a selected cubicle and fetches reservation info if reserved.
     * Checks if user has permission to access the cubicle.
     */
    openModal(cubicle) {
      this.selectedCubicle = cubicle;
      this.reservationUser = null;
      
      // If cubicle is reserved, fetch reservation info first
      if (cubicle.status === 'reserved') {
        // Check if this is not the user's reservation
        if (cubicle.reservedByUser && 
            this.currentUser && 
            cubicle.reservedByUser.uid !== this.currentUser.uid) {
          // Set reservation user info for the modal and show "not your reservation" modal
          this.reservationUser = cubicle.reservedByUser;
          this.showNotYourReservationModal = true;
          return;
        }
        
        // For own reservations, fetch full reservation info
        this.fetchReservationUser(cubicle._id);
      }
      
      // Show regular modal for available cubicles or own reservations
      this.showModal = true;
    },
    /**
     * Fetches the user who reserved the cubicle (if any).
     * Sets reservationUser to the user object or null.
     */
    async fetchReservationUser(cubicleId) {
      try {
        const { token } = useAuth();
        let idToken = token.value;
        if (!idToken) {
          idToken = localStorage.getItem('auth_token');
        }
        const res = await axios.get(`/cubicles/${cubicleId}/reservation`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        console.log('Reservation fetch result:', res.data); // DEBUG LOG
        if (res.data && res.data.user && res.data.user.uid) {
          this.reservationUser = {
            uid: res.data.user.uid,
            email: res.data.user.email || ''
          };
        } else {
          this.reservationUser = null;
        }
      } catch (err) {
        this.reservationUser = null;
        console.error('Error fetching reservation user:', err);
      }
    },
    /**
     * Closes the modal and clears selected cubicle.
     */
    closeModal() {
      this.showModal = false;
      this.selectedCubicle = null;
    },
    /**
     * Closes the "not your reservation" modal and clears selected cubicle.
     */
    closeNotYourReservationModal() {
      this.showNotYourReservationModal = false;
      this.selectedCubicle = null;
      this.reservationUser = null;
    },
    /**
     * Emits an event to parent to update the cubicle's state in the backend.
     * @param {string} newState - The new state to set (available, reserved, error)
     */
    changeState(newState) {
      if (!this.selectedCubicle) return;
      
      // Check permissions before allowing state change
      if (!this.canModifyCubicle) {
        console.warn('User does not have permission to modify this cubicle');
        this.closeModal();
        return;
      }
      
      // Only admin can set error state
      if (newState === 'error' && !this.isAdminUser) {
        console.warn('Only administrators can set cubicles to error state');
        this.closeModal();
        return;
      }
      
      // Emit event to parent to update backend
      this.$emit('update-cubicle-state', { ...this.selectedCubicle, status: newState });
      this.closeModal();
    },
    // The following methods are stubs for potential future row reservation features.
    reserveRow(section, row) {
      // Not implemented
    },
    isRowReserved(section, row) {
      // Not used in UI, but returns true if all cubicles in a row are reserved.
      const cubs = this.cubicles.filter(c => c.section === section && c.row === row);
      return cubs.length === 3 && cubs.every(c => c.status === 'reserved');
    },
    toggleReserveRow(section, row) {
      // Not implemented
    },
  },
};
</script>

<style scoped>
.cubicle-container {
  display: grid;
  grid-template-areas:
    "left middle right"
    "left empty right";
  padding: 0;
  margin: 0;
  align-items: start;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
}

@media (max-width: 768px) {
  .cubicle-container {
    padding: 0;
    margin: 0;
    gap: 4px;
  }
}

@media (max-width: 480px) {
  .cubicle-container {
    padding: 0;
    margin: 0;
    gap: 2px;
  }
  
  /* Only reduce tile size on very small screens */
  .cubicle-tile {
    width: 60px;
    height: 60px;
  }
  
  .cubicle-grid {
    gap: 1px;
  }
}

/* Very small screens - minimal size reduction */
@media (max-width: 360px) {
  .cubicle-tile {
    width: 50px;
    height: 50px;
  }
  
  .cubicle-container {
    gap: 1px;
  }
  
  .cubicle-grid {
    gap: 0.5px;
  }
}

.left-grid .cubicle-grid {
  grid-template-columns: repeat(3, 1fr); /* 3 columns */
  grid-template-rows: repeat(9, 1fr); /* 9 rows for Section A */
}

.middle-grid .cubicle-grid {
  grid-template-columns: repeat(3, 1fr); /* 3 columns */
  grid-template-rows: repeat(6, 1fr); /* 6 rows for Section B */
}

.right-grid .cubicle-grid {
  grid-template-columns: repeat(3, 1fr); /* 3 columns */
  grid-template-rows: repeat(9, 1fr); /* 9 rows for Section C, should match Section A */
}

.section-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Align all grids to the top */
}

.left-grid {
  grid-area: left;
}

.middle-grid {
  grid-area: middle;
}

.right-grid {
  grid-area: right;
}

.cubicle-grid {
  display: grid;
  padding: 0;
  margin: 0;
  gap: 2px;
  box-sizing: border-box;
}

.cubicle-tile {
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 70px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.cubicle-tile:hover {
  transform: scale(1.02); /* Slight zoom on hover */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15); /* Slightly stronger shadow on hover */
}

.custom-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 0; /* Sharp edges */
  width: 400px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  position: relative;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 20px;
  cursor: pointer;
}

.modal-body {
  margin-bottom: 20px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  gap: 5px;
}

.row-controls {
  margin-bottom: 10px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
}

.left-grid-controls {
  grid-area: left;
  margin-left: 10px;
}

.permission-notice {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #fef7cd;
  border: 1px solid #f1c21b;
  border-radius: 4px;
  border-left: 4px solid #f1c21b;
}

.permission-notice p {
  margin: 0;
  font-size: 0.875rem;
  color: #8d6e00;
  font-weight: 500;
}
</style>

