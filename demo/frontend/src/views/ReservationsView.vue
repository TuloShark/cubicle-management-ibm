<template>
  <div class="reservations-container">
    <div class="page-header">
      <h1 class="page-title">Cubicle Reservations</h1>
      <p class="page-subtitle">Reserve, release, and manage office cubicle assignments</p>
    </div>
    
    <!-- Main Content Area -->
    <cv-grid class="reservations-grid">
      <!-- Quick Actions Panel - First -->
      <cv-row class="actions-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <div class="actions-panel">
            <div class="panel-header">
              <h3 class="panel-title">Quick Actions</h3>
              <p class="panel-subtitle">Common cubicle management operations</p>
            </div>
            <div class="actions-content">
              <div class="action-container">
                <div class="action-info-card">
                  <span class="action-label">Refresh Cubicles</span>
                  <span class="action-description">Update all cubicle statuses from server</span>
                </div>
                <cv-button 
                  @click="fetchCubicles" 
                  kind="primary" 
                  size="lg"
                  class="action-button refresh-button"
                >
                  Refresh
                </cv-button>
              </div>
              
              <div class="action-container">
                <div class="action-info-card">
                  <span class="action-label">View Statistics</span>
                  <span class="action-description">Check usage analytics and metrics</span>
                </div>
                <cv-button 
                  @click="goToStatistics" 
                  kind="secondary" 
                  size="lg"
                  class="action-button statistics-button"
                >
                  Statistics
                </cv-button>
              </div>
            </div>
            
            <!-- Status Legend inside actions panel -->
            <div class="legend-container">
              <div 
                class="status-legend"
                :class="{ 'show-counts': showCounts }"
                @click="toggleLegendCounts"
              >
                <h4 class="legend-title">Status Legend</h4>
                <div class="legend-items">
                  <div class="legend-item">
                    <div class="legend-indicator available"></div>
                    <span class="legend-label">
                      Available
                      <span v-if="showCounts" class="legend-count">{{ cubicleStats.available }}</span>
                    </span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-indicator reserved"></div>
                    <span class="legend-label">
                      Reserved
                      <span v-if="showCounts" class="legend-count">{{ cubicleStats.reserved }}</span>
                    </span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-indicator error"></div>
                    <span class="legend-label">
                      Err/Maintenance
                      <span v-if="showCounts" class="legend-count">{{ cubicleStats.error }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </cv-column>
      </cv-row>
      
      <!-- Cubicle Grid - Third -->
      <cv-row class="content-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <div class="grid-container" ref="gridContainer">
            <CubicleGrid :cubicles="cubicles" @update-cubicle-state="updateCubicleState" />
          </div>
        </cv-column>
      </cv-row>
    </cv-grid>
  </div>
</template>
  
<script>
/**
 * ReservationsView
 * Main view for displaying and managing cubicle reservations.
 * Fetches cubicle data and handles state updates via CubicleGrid.
 */
import axios from 'axios';
import CubicleGrid from '../components/CubicleGrid.vue';
import useAuth from '../composables/useAuth';

export default {
  name: 'ReservationsView',
  components: { CubicleGrid },
  data() {
    return { 
      cubicles: [],
      // Status legend state
      showCounts: false
    }
  },
  created() {
    // Fetch cubicle data on view creation
    this.fetchCubicles();
  },
  beforeUnmount() {
    // Clean up any remaining event listeners if needed
  },
  computed: {
    cubicleStats() {
      const stats = {
        available: 0,
        reserved: 0,
        error: 0
      };
      
      this.cubicles.forEach(cubicle => {
        if (cubicle.status === 'available') {
          stats.available++;
        } else if (cubicle.status === 'reserved') {
          stats.reserved++;
        } else if (cubicle.status === 'error') {
          stats.error++;
        }
      });
      
      return stats;
    }
  },
  methods: {
    /**
     * Fetch all cubicles from backend API.
     * Sets cubicles array for grid display.
     */
    async fetchCubicles() {
      const { token } = useAuth();
      let idToken = token.value;
      if (!idToken) {
        idToken = localStorage.getItem('auth_token');
      }
      try {
        const r = await axios.get('/cubicles', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        this.cubicles = r.data;
      } catch (err) {
        this.cubicles = [];
      }
    },
    /**
     * Handles cubicle state updates (reserve, release, error).
     * Calls backend API and refreshes cubicle data.
     */
    async updateCubicleState(cubicle) {
      const { token } = useAuth();
      let idToken = token.value;
      if (!idToken) {
        idToken = localStorage.getItem('auth_token');
      }
      if (cubicle.status === 'reserved') {
        // Use POST /reserve to persist reservation and user info
        await axios.post('/reserve', { cubicleId: cubicle._id }, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
      } else {
        // Use PUT for other status changes (e.g., available, error)
        await axios.put(`/cubicles/${cubicle._id}`, { status: cubicle.status }, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
      }
      this.fetchCubicles();
    },
    /**
     * Navigate to statistics view
     */
    goToStatistics() {
      this.$router.push('/statistics');
    },
    
    /**
     * Toggle status legend to show/hide counts
     */
    toggleLegendCounts() {
      this.showCounts = !this.showCounts;
    }
  }
}
</script>

<style scoped>
/* Main Layout Styles */
.reservations-container {
  min-height: 100vh;
  background: #f4f4f4;
  padding: 0;
  margin: 0;
  margin-top: 48px;
}

.page-header {
  background: #161616;
  color: white;
  padding: 2rem;
  margin-bottom: 0;
  border-bottom: 1px solid #393939;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 300;
  margin: 0 0 0.5rem 0;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 1rem;
  opacity: 0.75;
  margin: 0;
  font-weight: 400;
}

.reservations-grid {
  max-width: 1584px;
  margin: 0 auto;
  padding: 0;
}

.actions-row {
  margin-bottom: 1rem;
}

.content-row {
  margin-bottom: 1rem;
}

/* Carbon Design System Overrides - Clean and Consistent */
:deep(.bx--grid) {
  max-width: 100%;
  overflow-x: hidden;
}

:deep(.bx--row) {
  margin-left: 0;
  margin-right: 0;
}

:deep(.bx--col) {
  padding-left: 1rem;
  padding-right: 1rem;
}

:deep(.bx--tile) {
  border-radius: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  min-height: auto !important;
  max-width: none !important;
  max-height: none !important;
}

:deep(.bx--btn) {
  border-radius: 0 !important;
  font-weight: 400 !important;
  text-transform: none !important;
  letter-spacing: 0.16px !important;
  transition: all 0.15s ease !important;
  box-shadow: none !important;
}

:deep(.bx--btn--primary) {
  background: #0f62fe !important;
  border-color: #0f62fe !important;
}

:deep(.bx--btn--primary:hover) {
  background: #0353e9 !important;
  transform: none !important;
  box-shadow: none !important;
}

:deep(.bx--btn--secondary) {
  background: #393939 !important;
  border-color: #393939 !important;
  color: #ffffff !important;
}

:deep(.bx--btn--secondary:hover) {
  background: #4c4c4c !important;
  transform: none !important;
  box-shadow: none !important;
}

/* Cubicle Grid Specific Overrides */
:deep(.cubicle-container) {
  margin: 0 !important;
  padding: 0 !important;
}

:deep(.section-wrapper) {
  margin: 0 !important;
  padding: 0 !important;
}

:deep(.cubicle-grid) {
  margin: 0 !important;
  padding: 0 !important;
  padding-right: 0;
  box-sizing: border-box;
}

:deep(.left-grid), 
:deep(.middle-grid), 
:deep(.right-grid) {
  margin: 0 !important;
  padding: 0 !important;
}

/* Grid Container Styles */
.grid-container {
  background: transparent;
  border-radius: 0;
  padding: 0.75rem;
  box-shadow: none;
  border: none;
  width: 100%;
  overflow: auto !important; /* Force override any global styles */
  max-height: 80vh;
  margin-top: 0.5rem; /* Reduced margin to decrease spacing */
  box-sizing: border-box;
}

/* Custom scrollbar styling - Consistent with UtilizationView */
.grid-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.grid-container::-webkit-scrollbar-track {
  background: #f4f4f4;
  border-radius: 4px;
}

.grid-container::-webkit-scrollbar-thumb {
  background: #0f62fe;
  border-radius: 4px;
}

.grid-container::-webkit-scrollbar-thumb:hover {
  background: #0043ce;
}

/* Actions Panel Styles */
.actions-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(224, 224, 224, 0.15);
  border-radius: 0;
  box-shadow: none;
  padding: 1rem;
  position: relative;
  overflow: visible !important;
  width: 100%;
  box-sizing: border-box;
}

.panel-header {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(224, 224, 224, 0.2);
}

.panel-title {
  font-size: 1.75rem;
  font-weight: 400;
  margin: 0 0 0.5rem 0;
  color: #161616;
  letter-spacing: 0;
}

.panel-subtitle {
  font-size: 0.875rem;
  color: #525252;
  margin: 0;
  font-weight: 400;
}

.actions-content {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: stretch;
  margin-bottom: 0;
  width: 100%;
  overflow: visible !important;
  box-sizing: border-box;
  height: 60px;
}

.action-container {
  display: flex;
  flex-direction: row;
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
  background: #ffffff;
  transition: all 0.15s ease;
  height: 100%;
  box-sizing: border-box;
}

.action-container:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.action-info-card {
  padding: 1rem 1.5rem;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  border-right: 1px solid #e0e0e0;
  justify-content: center;
  height: 100%;
  box-sizing: border-box;
}

.action-label {
  font-weight: 600;
  color: #161616;
  font-size: 1rem;
  line-height: 1.375;
}

.action-description {
  font-size: 0.75rem;
  color: #525252;
  line-height: 1.34;
}

.action-button {
  width: auto;
  min-width: 100px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 400;
  font-size: 0.875rem;
  border-radius: 0;
  border-left: none;
  transition: all 0.15s ease;
  letter-spacing: 0.16px;
  margin: 0;
  padding: 1rem;
  text-transform: none;
}

.action-button.refresh-button {
  background: #0f62fe;
  border-color: #0f62fe;
  color: #ffffff;
}

.action-button.refresh-button:hover {
  background: #0353e9;
}

.action-button.statistics-button {
  background: #393939;
  border-color: #393939;
  color: #ffffff;
}

.action-button.statistics-button:hover {
  background: #4c4c4c;
}

/* Legend Container */
.legend-container {
  position: relative;
  width: 100%;
  margin-top: 0.5rem; /* Reduced margin */
}

/* Status Legend Styles */
.status-legend {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: 0;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer; /* Changed from grab to pointer */
  user-select: none;
  transition: all 0.15s ease; /* Added smooth transitions */
  width: 100%;
  max-width: none;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-sizing: border-box;
}

.status-legend:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 1);
  transform: translateY(-1px); /* Subtle lift effect */
}

.status-legend.show-counts {
  background: rgba(15, 98, 254, 0.05); /* Light blue background when showing counts */
  border-color: #0f62fe;
}

.legend-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: #161616;
  letter-spacing: 0.16px;
  text-transform: uppercase;
  flex-shrink: 0;
}

.legend-items {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.legend-indicator {
  width: 12px;
  height: 12px;
  border-radius: 0;
  border: none;
  flex-shrink: 0;
}

.legend-indicator.available {
  background-color: #2962ff;
}

.legend-indicator.reserved {
  background-color: #3c3c3c;
}

.legend-indicator.error {
  background-color: #d32f2f;
}

.legend-label {
  font-size: 0.875rem;
  color: #161616;
  font-weight: 400;
  line-height: 1.34;
  white-space: nowrap;
}

.legend-count {
  font-weight: 600;
  color: #0f62fe;
  margin-left: 0.5rem;
  background: rgba(15, 98, 254, 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Strategic Responsive Design - Mobile First Approach */

/* Tablet and small desktop adjustments */
@media (max-width: 1024px) {
  .reservations-grid {
    padding: 0;
  }
  
  .actions-content {
    gap: 0.75rem;
  }
  
  .action-info-card {
    padding: 1rem 1.25rem;
    justify-content: center;
  }
}

/* Mobile landscape adjustments */
@media (max-width: 768px) {
  .reservations-grid {
    padding: 0;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .panel-title {
    font-size: 1.5rem;
  }
  
  /* Stack actions content vertically on mobile */
  .actions-content {
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    height: auto;
  }
  
  /* Optimize status legend for mobile */
  .status-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
  }
  
  .legend-items {
    gap: 1rem;
    width: 100%;
    justify-content: space-between;
  }
  
  .action-container {
    height: auto;
    margin-bottom: 0;
  }
  
  .action-info-card {
    padding: 0.75rem 1rem;
    justify-content: center;
  }
}

/* Mobile portrait optimizations */
@media (max-width: 480px) {
  .reservations-grid {
    padding: 0;
  }
  
  .page-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .page-subtitle {
    font-size: 0.875rem;
  }
  
  .panel-title {
    font-size: 1.25rem;
  }
  
  .panel-subtitle {
    font-size: 0.8125rem;
  }
  
  /* Further optimize actions panel for small screens */
  .actions-panel {
    padding: 0.75rem;
  }
  
  /* Stack legend items vertically on small mobile */
  .status-legend {
    padding: 0.75rem;
    gap: 0.5rem;
  }
  
  .legend-items {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    width: auto;
  }
  
  .legend-title {
    font-size: 0.875rem;
  }
  
  .legend-label {
    font-size: 0.8125rem;
  }
  
  .legend-count {
    font-size: 0.6875rem;
    padding: 0.0625rem 0.375rem;
    margin-left: 0.375rem;
  }
  
  .action-info-card {
    padding: 0.75rem;
  }
  
  .action-label {
    font-size: 0.875rem;
  }
  
  .action-description {
    font-size: 0.6875rem;
  }
  
  .action-button {
    padding: 0.75rem;
    font-size: 0.8125rem;
    min-width: 80px;
  }
  
  /* Optimize grid container for mobile */
  .grid-container {
    padding: 0.5rem;
    max-height: 70vh;
  }
}

/* Very small screens - minimal adjustments only */
@media (max-width: 360px) {
  .reservations-grid {
    padding: 0;
  }
  
  .action-container {
    flex-direction: column;
  }
  
  .action-info-card {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .action-button {
    min-height: 44px;
  }
}

</style>
