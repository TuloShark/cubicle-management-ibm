<template>
  <cv-tile
    class="cubicle-tile"
    :class="statusClass"
    @click="handleTileClick"
    @mouseover="hoverDetails"
    @mouseleave="clearDetails"
  >
    <div class="cubicle-content">
      <div class="serial">{{ cubicle.serial }}</div>
      <div v-if="showName" class="name">{{ cubicle.name }}</div>
      <div v-if="isReserved && cubicle.reservationInfo" class="reserved-by">
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
    const statusClass = computed(() => {
      // Error state is global and takes priority over date-specific status
      if (props.cubicle.status === 'error') {
        return {
          available: false,
          reserved: false,
          error: true,
        };
      }
      
      // Use dateStatus if available, otherwise fall back to regular status
      const status = props.cubicle.dateStatus || props.cubicle.status;
      return {
        available: status === 'available',
        reserved: status === 'reserved',
        error: status === 'error',
      };
    });

    const isReserved = computed(() => {
      // If cubicle is in global error state, it's not considered reserved for UI purposes
      if (props.cubicle.status === 'error') return false;
      
      const status = props.cubicle.dateStatus || props.cubicle.status;
      return status === 'reserved' && props.cubicle.reservationInfo;
    });

    const isMyReservation = computed(() => {
      if (!isReserved.value || !currentUser.value || !props.cubicle.reservationInfo) return false;
      return props.cubicle.reservationInfo.user?.uid === currentUser.value.uid;
    });

    const canReserve = computed(() => {
      // Cannot reserve if cubicle is in global error state
      if (props.cubicle.status === 'error') return false;
      
      const status = props.cubicle.dateStatus || props.cubicle.status;
      return status === 'available' && currentUser.value;
    });

    const canCancel = computed(() => {
      return isMyReservation.value;
    });

    // Methods
    const handleTileClick = () => {
      emit('click', props.cubicle);
    };

    const hoverDetails = () => {
      emit('hoverCubicle', props.cubicle);
    };

    const clearDetails = () => {
      emit('hoverCubicle', null);
    };

    const getDisplayName = (user) => {
      if (!user) return '';
      // Extract first name from email if available, otherwise use email
      if (user.email) {
        const firstName = user.email.split('@')[0].split('.')[0];
        return firstName.charAt(0).toUpperCase() + firstName.slice(1);
      }
      return user.displayName || user.uid || '';
    };

    return {
      statusClass,
      isReserved,
      isMyReservation,
      canReserve,
      canCancel,
      handleTileClick,
      hoverDetails,
      clearDetails,
      getDisplayName
    };
  }
};
</script>

<style scoped>
.cubicle-tile {
  text-align: center;
  border: 1px solid #e0e0e0;
  color: #e0e0e0;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  border-radius: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.cubicle-tile::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  opacity: 0;
  transition: opacity 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
  pointer-events: none;
}

.cubicle-tile:hover::before {
  opacity: 1;
}

.cubicle-tile:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: scale(1.02) translateY(-1px);
  z-index: 1;
}

.cubicle-tile:active {
  transform: scale(0.98);
  transition-duration: 0.1s;
}

.cubicle-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 1px;
}

/* Remove Carbon Design margins and padding completely */
:deep(.bx--tile) {
  margin: 0 !important;  
  padding: 0 !important;
  border-radius: 0 !important;
  box-sizing: border-box !important;
  width: 100% !important;
  height: 100% !important;
  min-height: auto !important;
  max-width: none !important;
  max-height: none !important;
}

.cubicle-tile.available {
  background-color: #2962ff;
  border-color: #1f4fd4;
}

.cubicle-tile.reserved {
  background-color: #3c3c3c;
  border-color: #2d2d2d;
}

.cubicle-tile.error {
  background-color: #d32f2f;
  border-color: #b71c1c;
}

.cubicle-tile:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  filter: brightness(1.1);
  transform: scale(1.03) translateY(-2px);
}

.cubicle-tile.available:hover {
  box-shadow: 0 4px 12px rgba(41, 98, 255, 0.4);
}

.cubicle-tile.reserved:hover {
  box-shadow: 0 4px 12px rgba(60, 60, 60, 0.4);
}

.cubicle-tile.error:hover {
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.4);
}

.serial {
  font-weight: bold;
  font-size: 0.75rem;
  line-height: 1;
  margin: 0;
  padding: 0;
}

.name {
  font-size: 0.625rem;
  line-height: 1;
  margin: 0;
  padding: 0;
}

.reserved-by {
  font-size: 0.5rem;
  line-height: 1;
  margin: 0;
  padding: 0;
  opacity: 0.8;
  font-weight: 500;
  text-transform: capitalize;
}

/* Strategic responsive text sizing - only for very small screens */
@media (max-width: 480px) {
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

@media (max-width: 360px) {
  .serial {
    font-size: 0.625rem;
  }
  
  .name {
    font-size: 0.5rem;
  }
  
  .reserved-by {
    font-size: 0.375rem;
  }
}
</style>
