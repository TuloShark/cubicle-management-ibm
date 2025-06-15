<template>
  <div class="cubicle-container">
    <!-- Single 6x9 Grid Layout -->
    <div class="unified-grid">
      <transition-group name="tile-stagger" tag="div" class="tile-container">
        <DateCubicleTile
          v-for="(cubicle, index) in sortedCubicles"
          :key="`${cubicle._id}`"
          :cubicle="cubicle"
          :selected-date="selectedDate"
          :showName="false"
          :style="{ '--stagger-delay': `${index * 0.01}s` }"
          @click="openModal"
          @reserve="handleReserve"
          @cancel="handleCancel"
        />
      </transition-group>
    </div>

    <!-- Reservation Summary removed as per user request -->

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
      <template v-slot:title>Cubicle Information - {{ formatDate(selectedDate) }}</template>
      <template v-slot:content>
        <p><strong>Section:</strong> {{ selectedCubicle?.section }}</p>
        <p><strong>Row:</strong> {{ selectedCubicle?.row }}</p>
        <p><strong>Column:</strong> {{ selectedCubicle?.col }}</p>
        <p><strong>Code:</strong> {{ selectedCubicle?.serial }}</p>
        <p><strong>Name:</strong> {{ selectedCubicle?.name }}</p>
        <p><strong>Date:</strong> {{ formatDate(selectedDate) }}</p>
        <p><strong>Current Status:</strong> {{ currentDateStatus }}</p>
        <p v-if="selectedCubicle?.status === 'error'">
          <strong>Global Status:</strong> <span style="color: #d32f2f; font-weight: 600;">ERROR/MAINTENANCE</span>
        </p>
        <p v-if="currentDateStatus === 'reserved'">
          <strong>Reserved By: </strong>
          <span v-if="reservationUser">
            {{ reservationUser.email }}
          </span>
          <span v-else>Loading...</span>
        </p>
        <div v-if="!canModifyCubicle && currentDateStatus === 'reserved'" class="permission-notice">
          <p><strong>Notice:</strong> This cubicle is reserved by another user for this date and cannot be modified.</p>
        </div>
        <div v-if="!isAdminUser && selectedCubicle?.status === 'error'" class="permission-notice">
          <p><strong>Notice:</strong> Only administrators can modify cubicles in error state.</p>
        </div>
      </template>
      <template v-slot:other-button v-if="canChangeToError">Error</template>
      <template v-slot:secondary-button v-if="canModifyCubicle && selectedCubicle?.status !== 'error'">Reserve</template>
      <template v-slot:primary-button v-if="canModifyCubicle && currentDateStatus === 'reserved'">Cancel Reservation</template>
      <template v-slot:primary-button v-else-if="canModifyCubicle">Available</template>
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
        <p>This cubicle is reserved by another user for {{ formatDate(selectedDate) }} and cannot be modified by you.</p>
        <p v-if="reservationUser">
          <strong>Reserved by:</strong> {{ reservationUser.email }}
        </p>
      </template>
      <template v-slot:primary-button>OK</template>
    </cv-modal>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import DateCubicleTile from './DateCubicleTile.vue';
import useAuth from '../composables/useAuth';
import axios from 'axios';

export default {
  name: 'DateCubicleGrid',
  components: {
    DateCubicleTile
  },
  props: {
    cubicles: {
      type: Array,
      default: () => []
    },
    selectedDate: {
      type: String,
      required: true
    },
    dateStats: {
      type: Object,
      default: null
    }
  },
  emits: ['reserve', 'cancel', 'update-cubicle-state'],
  setup(props, { emit }) {
    const { currentUser, token } = useAuth();
    
    // Modal state
    const showModal = ref(false);
    const showNotYourReservationModal = ref(false);
    const selectedCubicle = ref(null);
    const reservationUser = ref(null);

    // Check if user is admin using VITE_ADMIN_UIDS
    const isAdminUser = computed(() => {
      if (!currentUser.value) return false;
      const adminUids = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(u => u.trim());
      return adminUids.includes(currentUser.value.uid);
    });

    // Get current date status for selected cubicle
    const currentDateStatus = computed(() => {
      if (!selectedCubicle.value) return null;
      
      // If cubicle is in global error state, always show error
      if (selectedCubicle.value.status === 'error') {
        return 'error';
      }
      
      return selectedCubicle.value.dateStatus || selectedCubicle.value.status;
    });

    // Check if current user can modify the selected cubicle
    const canModifyCubicle = computed(() => {
      if (!selectedCubicle.value || !currentUser.value) return false;
      
      // Admin can modify any cubicle
      if (isAdminUser.value) return true;
      
      // For error state cubicles, only admin can modify
      if (selectedCubicle.value.status === 'error') return false;
      
      // For reserved cubicles, only the user who reserved it can modify
      if (currentDateStatus.value === 'reserved') {
        return reservationUser.value && reservationUser.value.uid === currentUser.value.uid;
      }
      
      // Available cubicles can be modified by anyone
      return currentDateStatus.value === 'available';
    });

    // Check if current user can change cubicle to error state
    const canChangeToError = computed(() => {
      // Admin can always set error state (global cubicle state, not date-specific)
      return isAdminUser.value;
    });

    // Computed properties for sorted cubicles in sequential grid layout
    const sortedCubicles = computed(() => {
      // Sort cubicles by row first, then by column for sequential layout
      return [...props.cubicles].sort((a, b) => {
        if (a.row !== b.row) {
          return a.row - b.row;
        }
        return a.col - b.col;
      });
    });

    // Modal methods
    const openModal = (cubicle) => {
      selectedCubicle.value = cubicle;
      reservationUser.value = null;
      
      // If cubicle is reserved for this date, set reservation info
      if (currentDateStatus.value === 'reserved') {
        // Try reservationInfo first (new format), then fall back to reservedByUser (old format)
        const userInfo = cubicle.reservationInfo?.user || cubicle.reservedByUser;
        
        if (userInfo) {
          // Check if this is not the user's reservation
          if (currentUser.value && userInfo.uid !== currentUser.value.uid) {
            // Set reservation user info for the modal and show "not your reservation" modal
            reservationUser.value = userInfo;
            showNotYourReservationModal.value = true;
            return;
          }
          
          // For own reservations, set reservation info
          reservationUser.value = userInfo;
        }
      }
      
      // Show regular modal for available cubicles or own reservations
      showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
      selectedCubicle.value = null;
      reservationUser.value = null;
    };

    const closeNotYourReservationModal = () => {
      showNotYourReservationModal.value = false;
      selectedCubicle.value = null;
      reservationUser.value = null;
    };

    const changeState = (newState) => {
      if (!selectedCubicle.value) return;
      
      // Special handling for error state - admin can always set error state
      if (newState === 'error') {
        if (!isAdminUser.value) {
          console.warn('Only administrators can set cubicles to error state');
          closeModal();
          return;
        }
        // For error state, we need to update the global cubicle status
        // This should be handled by the parent component
        emit('update-cubicle-state', { ...selectedCubicle.value, status: newState });
        closeModal();
        return;
      }
      
      // Check permissions before allowing other state changes
      if (!canModifyCubicle.value) {
        console.warn('User does not have permission to modify this cubicle');
        closeModal();
        return;
      }
      
      // Handle reservation/cancellation for date-specific actions
      if (newState === 'reserved') {
        emit('reserve', selectedCubicle.value._id);
      } else if (newState === 'available') {
        if (currentDateStatus.value === 'reserved') {
          // Cancel reservation
          if (selectedCubicle.value.reservationInfo) {
            emit('cancel', selectedCubicle.value.reservationInfo._id);
          }
        } else if (selectedCubicle.value.status === 'error') {
          // Change from error state to available - update global status
          emit('update-cubicle-state', { ...selectedCubicle.value, status: newState });
        }
      }
      
      closeModal();
    };

    // Event handlers
    const handleReserve = (cubicleId) => {
      emit('reserve', cubicleId);
    };

    const handleCancel = (reservationId) => {
      emit('cancel', reservationId);
    };

    const formatDate = (dateString) => {
      // Handle YYYY-MM-DD format to avoid timezone issues
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Create local date
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else {
        // Handle other date formats or Date objects
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    };

    return {
      sortedCubicles,
      showModal,
      showNotYourReservationModal,
      selectedCubicle,
      reservationUser,
      currentDateStatus,
      isAdminUser,
      canModifyCubicle,
      canChangeToError,
      openModal,
      closeModal,
      closeNotYourReservationModal,
      changeState,
      handleReserve,
      handleCancel,
      formatDate
    };
  }
};
</script>

<style scoped>
/* Main container - single grid layout */
.cubicle-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  min-height: 100%;
  overflow: hidden; /* Hidden by default for large screens */
  box-sizing: border-box;
  padding: 1rem;
  margin: 0;
}

/* Enable scrolling on mobile/tablet when needed */
@media (max-width: 768px) {
  .cubicle-container {
    overflow: auto;
  }
}

/* Unified 6x9 grid */
.unified-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(9, 1fr);
  gap: 4px;
  width: 100%;
  max-width: 900px;
  height: fit-content;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  padding: 8px;
}

.tile-container {
  display: contents;
}

/* Smooth tile transitions following Carbon Design motion */
.tile-stagger-enter-active,
.tile-stagger-leave-active {
  transition: all 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
  transition-delay: var(--stagger-delay, 0s);
}

.tile-stagger-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(4px);
}

.tile-stagger-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

.tile-stagger-move {
  transition: transform 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
}

/* Cubicle tiles - optimized for 6x9 grid */
:deep(.cubicle-tile) {
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 70px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  min-width: 80px;
  transform-origin: center;
}

:deep(.cubicle-tile:hover) {
  transform: scale(1.01); /* Reduced scale to prevent overflow */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  z-index: 1; /* Ensure hover tile stays on top */
}

/* Reservation Summary - enhanced styling */
.reservation-summary {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: 0;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 300px;
  z-index: 10;
}

.reservation-summary h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #161616;
  text-transform: uppercase;
  letter-spacing: 0.16px;
}

.user-reservations {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-reservation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.375rem 0.5rem;
  background: rgba(15, 98, 254, 0.05);
  border-left: 3px solid #0f62fe;
  font-size: 0.75rem;
}

.user-name {
  font-weight: 500;
  color: #161616;
}

.user-count {
  color: #525252;
  font-weight: 400;
}

/* Responsive design for unified grid */
@media (max-width: 768px) {
  .cubicle-container {
    padding: 0.5rem;
    overflow: auto; /* Allow scrolling on tablets */
  }
  
  .unified-grid {
    gap: 2px;
    max-width: 100%;
  }
  
  :deep(.cubicle-tile) {
    height: 60px;
    min-width: 60px;
  }
}

@media (max-width: 480px) {
  .cubicle-container {
    padding: 0.25rem;
    overflow: auto; /* Allow scrolling on mobile */
  }
  
  .unified-grid {
    gap: 1px;
  }
  
  :deep(.cubicle-tile) {
    height: 50px;
    min-width: 50px;
  }
}

@media (max-width: 360px) {
  .cubicle-container {
    overflow: auto; /* Ensure scrolling on very small screens */
  }
  
  .unified-grid {
    gap: 0.5px;
  }
  
  :deep(.cubicle-tile) {
    height: 45px;
    min-width: 45px;
  }
}

/* Permission notice styling */
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

/* Clean modal implementation without layout shifts */
:deep(.bx--modal),
:deep(.cv-modal) {
  /* Ensure modal doesn't affect background scrolling */
  position: fixed;
  z-index: 9999;
}

/* Clean scrollbar styling for mobile/tablet */
@media (max-width: 768px) {
  .cubicle-container::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .cubicle-container::-webkit-scrollbar-track {
    background: #f4f4f4;
    border-radius: 3px;
  }

  .cubicle-container::-webkit-scrollbar-thumb {
    background: #c6c6c6;
    border-radius: 3px;
  }

  .cubicle-container::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  /* Firefox scrollbar styling */
  .cubicle-container {
    scrollbar-width: thin;
    scrollbar-color: #c6c6c6 #f4f4f4;
  }
}
</style>
