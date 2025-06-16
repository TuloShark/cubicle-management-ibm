<!--
===================================================================
COMPONENT: DateCubicleGrid
===================================================================
PURPOSE: 
Main cubicle grid display component that renders a 6x9 grid of cubicle tiles 
for a specific date. Handles cubicle reservations, cancellations, and state management
with role-based permissions and modal interactions.

FEATURES:
- 6x9 responsive grid layout for 54 cubicles
- Date-specific cubicle status display (available/reserved/error)
- Role-based permissions (admin vs regular users)
- Modal dialogs for cubicle details and state changes
- Reservation management with user validation
- Smooth animations and transitions
- Mobile-responsive design with scrolling support

INTEGRATION:
- Used in: ReservationsView.vue as primary cubicle interface
- Child component: DateCubicleTile.vue for individual cubicle display
- Events: 'reserve', 'cancel', 'update-cubicle-state'
- Auth integration: useAuth composable for user permissions

DEPENDENCIES:
- Vue 3 Composition API
- @carbon/vue (cv-modal component)
- DateCubicleTile component
- useAuth composable
- axios (imported but not used - potential cleanup needed)

ACCESSIBILITY:
- Modal dialogs with proper ARIA attributes
- Keyboard navigation support
- Screen reader friendly status information
- Focus management for modal interactions

LAST UPDATED: June 2025
===================================================================
-->

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
          <strong>Global Status:</strong> <span class="error-status">ERROR/MAINTENANCE</span>
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
/**
 * DateCubicleGrid Component
 * 
 * Displays a 6x9 grid of cubicles for a specific date with reservation management.
 * Handles user permissions, modal interactions, and state changes.
 * 
 * @component
 * @example
 * <DateCubicleGrid 
 *   :cubicles="cubicleArray" 
 *   :selected-date="dateString"
 *   :date-stats="statsObject"
 *   @reserve="handleReserve"
 *   @cancel="handleCancel"
 *   @update-cubicle-state="updateState"
 * />
 */
import { computed, ref } from 'vue';
import DateCubicleTile from './DateCubicleTile.vue';
import useAuth from '../composables/useAuth';
import { isAdminUid } from '../utils/envUtils';

export default {
  name: 'DateCubicleGrid',
  components: {
    DateCubicleTile
  },
  props: {
    /**
     * Array of cubicle objects with status and reservation information
     */
    cubicles: {
      type: Array,
      default: () => [],
      validator: (cubicles) => {
        return cubicles.every(cubicle => 
          cubicle._id && 
          typeof cubicle.row === 'number' && 
          typeof cubicle.col === 'number'
        );
      }
    },
    /**
     * Selected date in YYYY-MM-DD format
     */
    selectedDate: {
      type: String,
      required: true,
      validator: (date) => {
        return /^\d{4}-\d{2}-\d{2}$/.test(date);
      }
    },
    /**
     * Optional statistics for the selected date
     */
    dateStats: {
      type: Object,
      default: null
    }
  },
  emits: [
    /**
     * Emitted when a cubicle is reserved
     * @param {string} cubicleId - The ID of the cubicle to reserve
     */
    'reserve',
    /**
     * Emitted when a reservation is cancelled
     * @param {string} reservationId - The ID of the reservation to cancel
     */
    'cancel',
    /**
     * Emitted when a cubicle's global state needs to be updated
     * @param {Object} cubicle - The cubicle object with updated status
     */
    'update-cubicle-state'
  ],
  setup(props, { emit }) {
    const { currentUser, token } = useAuth();
    
    // Modal state management
    const showModal = ref(false);
    const showNotYourReservationModal = ref(false);
    const selectedCubicle = ref(null);
    const reservationUser = ref(null);

    /**
     * Determines if the current user has admin privileges
     * Uses centralized environment utility for consistent admin checking
     * @returns {boolean} True if user is admin
     */
    const isAdminUser = computed(() => {
      if (!currentUser.value) return false;
      
      try {
        return isAdminUid(currentUser.value.uid);
      } catch (error) {
        console.warn('DateCubicleGrid: Error checking admin status:', error);
        return false;
      }
    });

    /**
     * Gets the current date-specific status for the selected cubicle
     * @returns {string|null} Status: 'available', 'reserved', 'error', or null
     */
    const currentDateStatus = computed(() => {
      if (!selectedCubicle.value) return null;
      
      // If cubicle is in global error state, always show error
      if (selectedCubicle.value.status === 'error') {
        return 'error';
      }
      
      return selectedCubicle.value.dateStatus || selectedCubicle.value.status;
    });

    /**
     * Determines if the current user can modify the selected cubicle
     * @returns {boolean} True if user can modify the cubicle
     */
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

    /**
     * Determines if the current user can set cubicles to error state
     * @returns {boolean} True if user can set error state (admin only)
     */
    const canChangeToError = computed(() => {
      return isAdminUser.value;
    });

    /**
     * Sorts cubicles in sequential grid layout (row by row, then column by column)
     * @returns {Array} Sorted array of cubicle objects
     */
    const sortedCubicles = computed(() => {
      try {
        return [...props.cubicles].sort((a, b) => {
          if (a.row !== b.row) {
            return a.row - b.row;
          }
          return a.col - b.col;
        });
      } catch (error) {
        console.error('DateCubicleGrid: Error sorting cubicles:', error);
        return props.cubicles;
      }
    });

    /**
     * Opens the cubicle details modal or access denied modal
     * @param {Object} cubicle - The cubicle object to display
     */
    const openModal = (cubicle) => {
      try {
        if (!cubicle || !cubicle._id) {
          console.warn('DateCubicleGrid: Invalid cubicle object provided to openModal');
          return;
        }

        selectedCubicle.value = cubicle;
        reservationUser.value = null;
        
        // If cubicle is reserved for this date, handle reservation info
        if (currentDateStatus.value === 'reserved') {
          // Try reservationInfo first (new format), then fall back to reservedByUser (old format)
          const userInfo = cubicle.reservationInfo?.user || cubicle.reservedByUser;
          
          if (userInfo) {
            // Check if this is not the user's reservation
            if (currentUser.value && userInfo.uid !== currentUser.value.uid) {
              // Set reservation user info and show "not your reservation" modal
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
      } catch (error) {
        console.error('DateCubicleGrid: Error opening modal:', error);
      }
    };

    /**
     * Closes the main cubicle details modal and resets state
     */
    const closeModal = () => {
      showModal.value = false;
      selectedCubicle.value = null;
      reservationUser.value = null;
    };

    /**
     * Closes the "not your reservation" modal and resets state
     */
    const closeNotYourReservationModal = () => {
      showNotYourReservationModal.value = false;
      selectedCubicle.value = null;
      reservationUser.value = null;
    };

    /**
     * Handles cubicle state changes with permission validation
     * @param {string} newState - The new state: 'available', 'reserved', or 'error'
     */
    const changeState = (newState) => {
      try {
        if (!selectedCubicle.value) {
          console.warn('DateCubicleGrid: No cubicle selected for state change');
          return;
        }
        
        // Special handling for error state - admin only
        if (newState === 'error') {
          if (!isAdminUser.value) {
            console.warn('DateCubicleGrid: Only administrators can set cubicles to error state');
            closeModal();
            return;
          }
          // For error state, update the global cubicle status
          emit('update-cubicle-state', { ...selectedCubicle.value, status: newState });
          closeModal();
          return;
        }
        
        // Check permissions before allowing other state changes
        if (!canModifyCubicle.value) {
          console.warn('DateCubicleGrid: User does not have permission to modify this cubicle');
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
            } else {
              console.warn('DateCubicleGrid: No reservation info found for cancellation');
            }
          } else if (selectedCubicle.value.status === 'error') {
            // Change from error state to available - update global status
            emit('update-cubicle-state', { ...selectedCubicle.value, status: newState });
          }
        }
        
        closeModal();
      } catch (error) {
        console.error('DateCubicleGrid: Error changing cubicle state:', error);
        closeModal();
      }
    };

    /**
     * Handles cubicle reservation events from child components
     * @param {string} cubicleId - The ID of the cubicle to reserve
     */
    const handleReserve = (cubicleId) => {
      if (!cubicleId) {
        console.warn('DateCubicleGrid: Invalid cubicle ID for reservation');
        return;
      }
      emit('reserve', cubicleId);
    };

    /**
     * Handles reservation cancellation events from child components
     * @param {string} reservationId - The ID of the reservation to cancel
     */
    const handleCancel = (reservationId) => {
      if (!reservationId) {
        console.warn('DateCubicleGrid: Invalid reservation ID for cancellation');
        return;
      }
      emit('cancel', reservationId);
    };

    /**
     * Formats a date string for display in modals and UI
     * Handles timezone issues by treating YYYY-MM-DD as local date
     * @param {string} dateString - Date in YYYY-MM-DD format
     * @returns {string} Formatted date string
     */
    const formatDate = (dateString) => {
      try {
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
          if (isNaN(date.getTime())) {
            console.warn('DateCubicleGrid: Invalid date provided:', dateString);
            return 'Invalid Date';
          }
          return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      } catch (error) {
        console.error('DateCubicleGrid: Error formatting date:', error);
        return 'Invalid Date';
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
/* ===========================================
   DATE CUBICLE GRID - SIMPLIFIED & CLEAN
   IBM Carbon Design System Compliant
   =========================================== */

/* Main Container - Clean Flexbox Layout */
.cubicle-container {
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 1rem;
  overflow-x: auto; /* Simple horizontal scroll when needed */
}

/* 6x9 Grid Layout - Simplified */
.unified-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(9, 1fr);
  gap: 4px;
  width: 100%;
  max-width: 900px;
  padding: 0.5rem;
}

.tile-container {
  display: contents;
}

/* Clean Tile Transitions - IBM Carbon Motion */
.tile-stagger-enter-active,
.tile-stagger-leave-active {
  transition: all 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
  transition-delay: var(--stagger-delay, 0s);
}

.tile-stagger-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.tile-stagger-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Simplified Cubicle Tile Styles */
:deep(.cubicle-tile) {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  height: 70px;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.cubicle-tile:hover) {
  border-color: #0f62fe;
  box-shadow: 0 2px 6px rgba(15, 98, 254, 0.2);
}

/* Permission Notice - IBM Carbon Notification Style */
.permission-notice {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef7cd;
  border-left: 3px solid #f1c21b;
  border-radius: 0;
}

.permission-notice p {
  margin: 0;
  font-size: 0.875rem;
  color: #8d6e00;
}

/* Error Status Text */
.error-status {
  color: #da1e28;
  font-weight: 600;
}

/* Clean Responsive Design - Single Breakpoint */
@media (max-width: 768px) {
  .cubicle-container {
    padding: 0.5rem;
  }
  
  .unified-grid {
    gap: 2px;
    padding: 0.25rem;
  }
  
  :deep(.cubicle-tile) {
    height: 55px;
  }
}
</style>
