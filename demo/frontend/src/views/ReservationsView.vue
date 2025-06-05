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
          <cv-tile class="actions-tile">
            <div class="tile-header">
              <h3 class="tile-title">Quick Actions</h3>
              <p class="tile-subtitle">Common cubicle management operations</p>
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
              
              <div class="status-legend">
                <h4 class="legend-title">Status Legend</h4>
                <div class="legend-items">
                  <div class="legend-item">
                    <div class="legend-indicator available"></div>
                    <span class="legend-label">Available</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-indicator reserved"></div>
                    <span class="legend-label">Reserved</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-indicator error"></div>
                    <span class="legend-label">Error/Maintenance</span>
                  </div>
                </div>
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- Cubicle Grid - Second -->
      <cv-row class="content-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <div class="grid-container">
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
    return { cubicles: [] }
  },
  created() {
    // Fetch cubicle data on view creation
    this.fetchCubicles();
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
    }
  }
}
</script>

<style scoped>
.reservations-container {
  min-height: 100vh;
  /* Remove fixed height to prevent scroll context conflicts */
  background: linear-gradient(135deg, #f4f4f4 0%, #ffffff 100%);
  padding: 0;
  margin: 0;
  margin-top: 48px; /* Space for navbar */
  /* Remove overflow-y to use document scroll */
}

.page-header {
  background: linear-gradient(135deg, #0f62fe 0%, #0043ce 100%);
  color: white;
  padding: 2rem;
  margin-bottom: 0;
  box-shadow: 0 4px 12px rgba(15, 98, 254, 0.15);
}

.page-title {
  font-size: 2.5rem;
  font-weight: 300;
  margin: 0;
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 1.125rem;
  opacity: 0.9;
  margin: 0;
  font-weight: 400;
}

.reservations-grid {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
}

.actions-row {
  margin-bottom: 1.5rem;
}

.content-row {
  margin-bottom: 1rem;
}

/* Global styles to prevent horizontal overflow */
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

.grid-container {
  background: white;
  border-radius: 0; /* Sharp edges */
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  min-height: 500px;
  width: 100%;
  overflow: visible;
}

.actions-row {
  margin-bottom: 1rem;
}

.actions-tile {
  background: white !important;
  border: 1px solid #e0e0e0 !important;
  border-radius: 0 !important; /* Sharp edges */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  padding: 1.5rem !important;
}

.tile-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.tile-title {
  font-size: 1.5rem;
  font-weight: 400;
  margin: 0;
  margin-bottom: 0.5rem;
  color: #161616;
}

.tile-subtitle {
  font-size: 1rem;
  color: #6f6f6f;
  margin: 0;
}

.actions-content {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  align-items: stretch;
}

.action-container {
  display: flex;
  flex-direction: row;
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 0; /* Sharp edges */
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.action-container:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.action-info-card {
  padding: 1.25rem;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  border-right: 1px solid #e0e0e0;
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  background: #f4f4f4;
  border-radius: 0; /* Sharp edges */
  border: 1px solid #e0e0e0;
  transition: background-color 0.15s ease;
}

.action-item:hover {
  background: #e8e8e8;
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.action-label {
  font-weight: 600;
  color: #161616;
  font-size: 1rem;
}

.action-description {
  font-size: 0.875rem;
  color: #6f6f6f;
}

.action-button {
  width: auto;
  min-width: 120px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  border-radius: 0; /* Sharp edges */
  border-left: none; /* Remove left border to attach to content */
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
  margin: 0;
  padding: 1.25rem;
}

.action-button.refresh-button {
  background: linear-gradient(135deg, #0f62fe, #0043ce);
  border-color: #0f62fe;
}

.action-button.refresh-button:hover {
  background: linear-gradient(135deg, #0353e9, #002d9c);
  box-shadow: inset 0 0 0 1px #0043ce;
}

.action-button.statistics-button {
  background: linear-gradient(135deg, #393939, #262626);
  border-color: #393939;
}

.action-button.statistics-button:hover {
  background: linear-gradient(135deg, #4c4c4c, #393939);
  box-shadow: inset 0 0 0 1px #262626;
}

.status-legend {
  background: #f4f4f4;
  border-radius: 0; /* Sharp edges */
  padding: 1rem;
  border: 1px solid #e0e0e0;
}

.legend-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  margin-bottom: 0.75rem;
  color: #161616;
}

.legend-items {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-indicator {
  width: 12px;
  height: 12px;
  border-radius: 0; /* Sharp edges for indicators */
  border: 2px solid transparent;
}

.legend-indicator.available {
  background-color: #3c3c3c;
  border-color: #3c3c3c;
}

.legend-indicator.reserved {
  background-color: #2962ff;
  border-color: #2962ff;
}

.legend-indicator.error {
  background-color: #d32f2f;
  border-color: #d32f2f;
}

.legend-label {
  font-size: 0.875rem;
  color: #161616;
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 768px) {
  .reservations-container {
    padding: 0;
    margin-top: 48px;
  }
  
  .page-header {
    padding: 1.5rem;
    margin-bottom: 0;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .reservations-grid {
    padding: 1rem;
    max-width: 100%;
  }
  
  .grid-container {
    padding: 1rem;
    min-height: 400px;
    border-radius: 0; /* Maintain sharp edges on mobile */
  }
  
  .actions-tile {
    padding: 1rem !important;
  }
  
  .actions-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .action-container {
    flex-direction: column;
  }
  
  .action-info-card {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .action-button {
    width: 100%;
    height: 44px;
    font-size: 0.95rem;
    padding: 0;
    border-left: none;
    border-top: none;
  }
  
  .legend-items {
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .legend-items {
    flex-direction: column;
    gap: 0.75rem;
  }
}

/* Carbon component overrides for sharp edges */
:deep(.bx--tile) {
  border-radius: 0 !important; /* Sharp edges for all tiles */
}

:deep(.bx--btn) {
  border-radius: 0 !important; /* Sharp edges for all buttons */
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

:deep(.bx--btn--primary) {
  background: linear-gradient(135deg, #0f62fe, #0043ce) !important;
  border-color: #0f62fe !important;
}

:deep(.bx--btn--primary:hover) {
  background: linear-gradient(135deg, #0353e9, #002d9c) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 98, 254, 0.3) !important;
}

:deep(.bx--btn--secondary) {
  background: linear-gradient(135deg, #393939, #262626) !important;
  border-color: #393939 !important;
  color: #ffffff !important;
}

:deep(.bx--btn--secondary:hover) {
  background: linear-gradient(135deg, #4c4c4c, #393939) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(57, 57, 57, 0.3) !important;
}

:deep(.bx--form-item) {
  border-radius: 0 !important;
}
</style>
