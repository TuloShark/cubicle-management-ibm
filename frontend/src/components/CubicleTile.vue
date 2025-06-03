<template>
  <cv-tile
    class="cubicle-tile"
    :class="statusClass"
    @mouseover="hoverDetails"
    @mouseleave="clearDetails"
  >
    <div class="serial">{{ cubicle.serial }}</div>
    <div v-if="showName" class="name">{{ cubicle.name }}</div>
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
  },
};
</script>

<style scoped>
.cubicle-tile {
  text-align: center;
  border: 1px solid #e0e0e0;
  color: #e0e0e0;
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
}
</style>
