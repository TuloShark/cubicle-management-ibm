<template>
  <cv-tile
    class="cubicle-tile"
    :class="statusClass"
    @mouseover="hoverDetails"
    @mouseleave="clearDetails"
  >
    <div class="cubicle-content">
      <div class="serial">{{ cubicle.serial }}</div>
      <div v-if="showName" class="name">{{ cubicle.name }}</div>
      <div v-if="cubicle.status === 'reserved' && reservedByUser" class="reserved-by">
        {{ getDisplayName(reservedByUser) }}
      </div>
    </div>
  </cv-tile>
</template>

<script>
/**
 * CubicleTile.vue
 * Represents a single cubicle tile in the grid.
 * Emits 'hoverCubicle' event on mouseover/mouseleave for parent to show details.
 */
export default {
  name: 'CubicleTile',
  props: {
    cubicle: Object,
    showName: {
      type: Boolean,
      default: true
    },
    reservedByUser: {
      type: Object,
      default: null
    }
  },
  computed: {
    statusClass() {
      // Returns CSS class based on cubicle status
      return {
        available: this.cubicle.status === 'available',
        reserved: this.cubicle.status === 'reserved',
        error: this.cubicle.status === 'error',
      };
    },
  },
  methods: {
    /**
     * Emits cubicle info on hover for parent to display details.
     */
    hoverDetails() {
      this.$emit('hoverCubicle', this.cubicle); // Emit event on hover
    },
    /**
     * Emits null on mouse leave to clear details.
     */
    clearDetails() {
      this.$emit('hoverCubicle', null); // Clear details on mouse leave
    },
    /**
     * Get display name for reserved user
     */
    getDisplayName(user) {
      if (!user) return '';
      // Extract first name from email if available, otherwise use email
      if (user.email) {
        const firstName = user.email.split('@')[0].split('.')[0];
        return firstName.charAt(0).toUpperCase() + firstName.slice(1);
      }
      return user.displayName || user.uid || '';
    }
  },
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
}

.cubicle-tile.reserved {
  background-color: #3c3c3c;
}

.cubicle-tile.error {
  background-color: #d32f2f;
}

.cubicle-tile:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  filter: brightness(0.92);
  transform: scale(1.02);
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
