<!--
===================================================================
COMPONENT: DateCubicleTile
===================================================================
PURPOSE: 
Individual cubicle tile component that displays a single cubicle's status,
serial number, and reservation information. Handles user interactions and
visual state representation within the DateCubicleGrid layout.

FEATURES:
- Visual status representation (available/reserved/error)
- Click and hover interactions
- User reservation display with name extraction
- Responsive text sizing
- IBM Carbon Design System color compliance
- Smooth animations and state transitions

INTEGRATION:
- Used in: DateCubicleGrid.vue as child component
- Parent events: 'click', 'reserve', 'cancel', 'hoverCubicle'
- Auth integration: useAuth composable for user permissions

DEPENDENCIES:
- Vue 3 Composition API
- @carbon/vue (cv-tile component)
- useAuth composable

ACCESSIBILITY:
- Clickable tile with proper cursor states
- Visual status indicators with color coding
- Hover states for better user feedback

LAST UPDATED: June 2025
===================================================================
-->

<template>
  <cv-tile
    class="cubicle-tile"
    :class="statusClass"
    @click="handleTileClick"
    @mouseover="hoverDetails"
    @mouseleave="clearDetails"
  >
    <div class="cubicle-content">
      <div class="serial">{{ cubicle?.serial || 'N/A' }}</div>
      <div v-if="showName && cubicle?.name" class="name">{{ cubicle.name }}</div>
      <div v-if="isReserved && cubicle?.reservationInfo" class="reserved-by">
        {{ getDisplayName(cubicle.reservationInfo.user) }}
      </div>
    </div>
  </cv-tile>
</template>

<script>
import { computed } from 'vue';
import useAuth from '../composables/useAuth';

export default {
  name: 'DateCubicleTile',
  props: {
    cubicle: {
      type: Object,
      required: true
    },
    selectedDate: {
      type: String,
      required: true
    },
    showName: {
      type: Boolean,
      default: false
    }
  },
  emits: ['reserve', 'cancel', 'hoverCubicle', 'click'],
  setup(props, { emit }) {
    const { currentUser } = useAuth();

    // Computed properties
    /**
     * Determines the CSS classes for the tile based on cubicle status
     * Prioritizes global error state over date-specific status
     * @returns {Object} Object with boolean values for each status class
     */
    const statusClass = computed(() => {
      // Global error state takes priority
      if (props.cubicle.status === 'error') {
        return { available: false, reserved: false, error: true };
      }
      
      // Use date-specific status if available, fallback to general status
      const currentStatus = props.cubicle.dateStatus || props.cubicle.status;
      return {
        available: currentStatus === 'available',
        reserved: currentStatus === 'reserved',
        error: currentStatus === 'error',
      };
    });

    /**
     * Determines if the cubicle is currently reserved
     * Excludes global error state from reservation consideration
     * @returns {boolean} True if cubicle is reserved and has reservation info
     */
    const isReserved = computed(() => {
      // Global error state overrides reservation status
      if (props.cubicle.status === 'error') return false;
      
      const currentStatus = props.cubicle.dateStatus || props.cubicle.status;
      return currentStatus === 'reserved' && !!props.cubicle.reservationInfo;
    });

    /**
     * Checks if the current reservation belongs to the logged-in user
     * @returns {boolean} True if current user owns this reservation
     */
    const isMyReservation = computed(() => {
      if (!isReserved.value || !currentUser.value || !props.cubicle.reservationInfo) return false;
      return props.cubicle.reservationInfo.user?.uid === currentUser.value.uid;
    });

    // Methods
    /**
     * Handles tile click events and emits to parent component
     * Delegates action handling to parent (DateCubicleGrid)
     */
    const handleTileClick = () => {
      emit('click', props.cubicle);
    };

    /**
     * Emits hover event to show cubicle details in parent
     * @param {Event} event - Mouse hover event
     */
    const hoverDetails = () => {
      emit('hoverCubicle', props.cubicle);
    };

    /**
     * Clears hover details by emitting null to parent
     */
    const clearDetails = () => {
      emit('hoverCubicle', null);
    };

    /**
     * Extracts and formats a user's display name from their profile data
     * Prioritizes first name extraction from email, with fallbacks
     * @param {Object} user - User object containing email, displayName, or uid
     * @returns {string} Formatted display name
     */
    const getDisplayName = (user) => {
      if (!user) return '';
      
      // Try to extract first name from email
      if (user.email && typeof user.email === 'string') {
        try {
          const emailParts = user.email.split('@')[0];
          const nameParts = emailParts.split('.');
          const firstName = nameParts[0];
          
          if (firstName && firstName.length > 0) {
            return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
          }
        } catch (error) {
          console.warn('Error parsing email for display name:', error);
        }
      }
      
      // Fallback to displayName or uid
      return user.displayName || user.uid || 'Unknown User';
    };

    return {
      statusClass,
      isReserved,
      isMyReservation,
      handleTileClick,
      hoverDetails,
      clearDetails,
      getDisplayName
    };
  }
};
</script>

<style scoped>
/* ===========================================
   DATE CUBICLE TILE - SIMPLIFIED & CLEAN
   IBM Carbon Design System Compliant
   =========================================== */

/* Base Tile Styles - Clean Carbon Implementation */
.cubicle-tile {
  border: 1px solid #e0e0e0;
  color: #ffffff;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
  cursor: pointer;
  text-align: center;
  margin: 0;
  padding: 0;
  border-radius: 0;
  min-height: auto;
}

/* Status Colors - IBM Carbon Design System */
.cubicle-tile.available {
  background: #0f62fe;
  border-color: #0043ce;
}

.cubicle-tile.reserved {
  background: #393939;
  border-color: #262626;
}

.cubicle-tile.error {
  background: #da1e28;
  border-color: #a2191f;
}

/* Clean Hover States */
.cubicle-tile:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.cubicle-tile.available:hover {
  background: #0353e9;
}

.cubicle-tile.reserved:hover {
  background: #525252;
}

.cubicle-tile.error:hover {
  background: #b81922;
}

/* Content Layout */
.cubicle-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 2px;
}

/* Text Styles */
.serial {
  font-weight: 600;
  font-size: 0.75rem;
  line-height: 1;
}

.name {
  font-size: 0.625rem;
  line-height: 1;
}

.reserved-by {
  font-size: 0.5rem;
  line-height: 1;
  opacity: 0.9;
  font-weight: 500;
  text-transform: capitalize;
}

/* Simple Responsive Design - Single Breakpoint */
@media (max-width: 768px) {
  .serial {
    font-size: 0.6875rem;
  }
  
  .name {
    font-size: 0.5625rem;
  }
  
  .reserved-by {
    font-size: 0.4375rem;
  }
}
</style>
