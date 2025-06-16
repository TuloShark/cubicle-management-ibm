<!--
===================================================================
COMPONENT: AnalyticsCarousel
===================================================================
PURPOSE: 
Reusable carousel component that displays analytics statistics with visual indicators.
Auto-rotates through multiple stats with smooth transitions and manual navigation controls.

FEATURES:
- Auto-rotating carousel with configurable interval
- Visual indicators with IBM Carbon Design System colors
- Manual navigation with accessibility support
- Smooth slide transitions with fade effects
- Screen reader announcements for stat changes
- Responsive design for all device sizes

INTEGRATION:
- Used in: StatisticsView.vue, UtilizationView.vue
- Data format: Array of { label, value, indicatorClass } objects
- Events: Emits 'stat-changed' on carousel transitions

DEPENDENCIES:
- Vue 3 Composition API
- IBM Carbon Design System color tokens
- CSS custom properties for theming

ACCESSIBILITY:
- ARIA labels and roles for navigation
- Screen reader live announcements
- Keyboard accessible navigation controls
- Focus management and visual indicators

LAST UPDATED: June 2025
===================================================================
-->

<template>
  <div 
    class="analytics-carousel"
    role="region"
    aria-label="Analytics Statistics Carousel"
  >
    <div class="analytics-carousel-container">
      <div class="analytics-cards-stack">
        <transition name="slide" mode="out-in">
          <div 
            :key="currentIndex" 
            class="analytics-card-stacked"
            role="img"
            :aria-label="`${currentStat.label}: ${currentStat.value}`"
          >
            <div 
              :class="['analytics-indicator-medium', currentStat.indicatorClass]"
              aria-hidden="true"
            ></div>
            <div class="analytics-details">
              <span 
                class="analytics-label-medium"
                aria-label="Metric name"
              >{{ currentStat.label }}</span>
              <span 
                class="analytics-value-medium"
                aria-label="Metric value"
              >{{ currentStat.value }}</span>
            </div>
          </div>
        </transition>
      </div>
      
      <!-- Carousel Controls for Accessibility -->
      <div 
        class="carousel-controls" 
        v-if="stats && stats.length > 1"
        role="group"
        aria-label="Carousel navigation"
      >
        <button
          v-for="(stat, index) in stats"
          :key="index"
          @click="goToSlide(index)"
          :class="['carousel-dot', { active: index === currentIndex }]"
          :aria-label="`Go to ${stat.label}`"
          :aria-pressed="index === currentIndex"
          type="button"
        >
          <span class="sr-only">{{ stat.label }}</span>
        </button>
      </div>
    </div>
    
    <!-- Screen reader announcements -->
    <div 
      class="sr-only" 
      aria-live="polite" 
      aria-atomic="true"
    >
      {{ `Showing ${currentStat.label}: ${currentStat.value}. ${currentIndex + 1} of ${stats ? stats.length : 0}` }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'AnalyticsCarousel',
  props: {
    /**
     * Array of statistics objects to display in carousel
     * Each object must have: { label: string, value: string, indicatorClass: string }
     */
    stats: {
      type: Array,
      required: true,
      validator: (stats) => {
        if (!Array.isArray(stats)) return false;
        return stats.every(stat => 
          stat && 
          typeof stat === 'object' &&
          typeof stat.label === 'string' && 
          (typeof stat.value === 'string' || typeof stat.value === 'number') && 
          typeof stat.indicatorClass === 'string'
        );
      }
    },
    /**
     * Auto-rotation interval in milliseconds
     * Must be a positive number, defaults to 4000ms (4 seconds)
     */
    interval: {
      type: Number,
      default: 4000,
      validator: (value) => value > 0
    },
    /**
     * Whether to auto-rotate through stats
     * Only affects behavior when stats array has more than 1 item
     */
    autoRotate: {
      type: Boolean,
      default: true
    }
  },
  emits: ['stat-changed'],
  setup(props, { emit }) {
    const currentIndex = ref(0);
    const intervalId = ref(null);

    /**
     * Computed property that returns the current statistic to display
     * Includes error handling and validation for malformed data
     * @returns {Object} Current stat object with label, value, and indicatorClass
     */
    const currentStat = computed(() => {
      try {
        if (!props.stats || props.stats.length === 0) {
          return {
            label: 'No Data',
            value: '--',
            indicatorClass: 'no-data'
          };
        }
        
        const stat = props.stats[currentIndex.value] || props.stats[0];
        
        // Validate stat structure
        if (!stat || typeof stat !== 'object') {
          console.warn('Invalid stat object:', stat);
          return { label: 'Invalid Data', value: '--', indicatorClass: 'no-data' };
        }
        
        if (!stat.label || stat.value === undefined || stat.value === null || !stat.indicatorClass) {
          console.warn('Incomplete stat object - missing required properties:', stat);
          return { 
            label: stat.label || 'Unknown', 
            value: stat.value !== undefined && stat.value !== null ? stat.value : '--', 
            indicatorClass: stat.indicatorClass || 'no-data' 
          };
        }
        
        return stat;
      } catch (error) {
        console.error('Error computing current stat:', error);
        return { label: 'Error', value: '--', indicatorClass: 'no-data' };
      }
    });

    /**
     * Starts the carousel auto-rotation
     * Always clears existing interval before creating new one to prevent race conditions
     */
    const startCarousel = () => {
      // Always stop existing carousel first to prevent multiple intervals
      stopCarousel();
      
      if (props.autoRotate && props.stats && props.stats.length > 1) {
        intervalId.value = setInterval(() => {
          currentIndex.value = (currentIndex.value + 1) % props.stats.length;
          emit('stat-changed', currentStat.value);
        }, props.interval);
      }
    };

    /**
     * Stops the carousel auto-rotation and cleans up interval
     * Prevents memory leaks by properly clearing intervals
     */
    const stopCarousel = () => {
      if (intervalId.value) {
        clearInterval(intervalId.value);
        intervalId.value = null;
      }
    };

    /**
     * Manually navigate to a specific slide
     * Temporarily stops auto-rotation to allow user control
     * @param {number} index - The slide index to navigate to
     */
    const goToSlide = (index) => {
      if (index >= 0 && index < props.stats.length) {
        currentIndex.value = index;
        emit('stat-changed', currentStat.value);
        
        // Restart auto-rotation after user interaction
        if (props.autoRotate) {
          startCarousel();
        }
      }
    };

    onMounted(() => {
      startCarousel();
    });

    onUnmounted(() => {
      stopCarousel();
    });

    return {
      currentIndex,
      currentStat,
      startCarousel,
      stopCarousel,
      goToSlide
    };
  }
};
</script>

<style scoped>
/* ===========================================
   ANALYTICS CAROUSEL - SIMPLIFIED & ACCESSIBLE
   IBM Carbon Design System Compliant
   =========================================== */

/* Screen Reader Only Content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Main Container */
.analytics-carousel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1.5rem;
}

.analytics-carousel-container {
  position: relative;
  width: 100%;
  max-width: 450px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.analytics-cards-stack {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Analytics Card */
.analytics-card-stacked {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #0f62fe;
  width: 100%;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 100px;
}

.analytics-card-stacked:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

/* Indicator Styles - Simplified with CSS Custom Properties */
.analytics-indicator-medium {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  border: 2px solid var(--indicator-color, #c6c6c6);
  background: var(--indicator-bg, #f4f4f4);
}

.analytics-indicator-medium::before {
  content: '';
  width: var(--icon-size, 12px);
  height: var(--icon-size, 12px);
  background: var(--indicator-color, #c6c6c6);
  border-radius: var(--icon-radius, 2px);
}

/* Indicator Variations */
.analytics-indicator-medium.utilization-avg {
  --indicator-color: #198038;
  --indicator-bg: #d9f0dd;
  --icon-size: 16px;
  --icon-radius: 3px;
}

.analytics-indicator-medium.utilization-peak {
  --indicator-color: #f1c21b;
  --indicator-bg: #fef7cd;
}

.analytics-indicator-medium.utilization-peak::before {
  width: 0;
  height: 0;
  background: transparent;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 12px solid var(--indicator-color);
}

.analytics-indicator-medium.reservations {
  --indicator-color: #0f62fe;
  --indicator-bg: #d0e2ff;
  --icon-size: 16px;
  --icon-radius: 50%;
}

.analytics-indicator-medium.users {
  --indicator-color: #8a3ffc;
  --indicator-bg: #f0e6ff;
}

.analytics-indicator-medium.users::before {
  width: 0;
  height: 0;
  background: transparent;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 14px solid var(--indicator-color);
}

.analytics-indicator-medium.error-rate,
.analytics-indicator-medium.danger {
  --indicator-color: #da1e28;
  --indicator-bg: #fdebed;
}

.analytics-indicator-medium.good {
  --indicator-color: #42be65;
  --indicator-bg: #d9f0dd;
  --icon-radius: 50%;
}

.analytics-indicator-medium.warning {
  --indicator-color: #f1c21b;
  --indicator-bg: #fef7cd;
}

.analytics-indicator-medium.warning::before {
  width: 0;
  height: 0;
  background: transparent;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 12px solid var(--indicator-color);
}

.analytics-indicator-medium.no-data {
  --indicator-color: #c6c6c6;
  --indicator-bg: #f4f4f4;
}

/* Analytics Details */
.analytics-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.analytics-label-medium {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6f6f6f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.analytics-value-medium {
  font-size: 1.5rem;
  font-weight: 700;
  color: #161616;
  line-height: 1.1;
}

/* Carousel Controls */
.carousel-controls {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.carousel-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: #c6c6c6;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.carousel-dot:hover {
  background: #8d8d8d;
  transform: scale(1.1);
}

.carousel-dot:focus {
  outline: 2px solid #0f62fe;
  outline-offset: 2px;
}

.carousel-dot.active {
  background: #0f62fe;
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Simple Responsive Design */
@media (max-width: 768px) {
  .analytics-carousel {
    padding: 1.5rem 1rem;
  }

  .analytics-card-stacked {
    padding: 1rem 1.5rem;
    gap: 1rem;
    min-height: 80px;
  }
  
  .analytics-indicator-medium {
    width: 32px;
    height: 32px;
  }
  
  .analytics-label-medium {
    font-size: 0.75rem;
  }
  
  .analytics-value-medium {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .analytics-carousel {
    padding: 1rem 0.75rem;
  }

  .analytics-card-stacked {
    padding: 0.75rem 1rem;
    gap: 0.75rem;
    min-height: 70px;
  }
  
  .analytics-indicator-medium {
    width: 28px;
    height: 28px;
  }
  
  .analytics-label-medium {
    font-size: 0.6875rem;
  }
  
  .analytics-value-medium {
    font-size: 1.125rem;
  }
}
</style>
