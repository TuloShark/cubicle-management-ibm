<template>
  <div class="reservations-container">
    <div class="page-header">
      <h1 class="page-title">Cubicle Reservations</h1>
      <p class="page-subtitle">Reserve, release, and manage office cubicle assignments</p>
    </div>
    
    <!-- Main Content Area -->
    <cv-grid class="reservations-grid">
      <cv-row class="content-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <div class="grid-container">
            <CubicleGrid :cubicles="cubicles" @update-cubicle-state="updateCubicleState" />
          </div>
        </cv-column>
      </cv-row>
      
      <!-- Quick Actions Panel -->
      <cv-row class="actions-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile class="actions-tile">
            <div class="tile-header">
              <h3 class="tile-title">Quick Actions</h3>
              <p class="tile-subtitle">Common cubicle management operations</p>
            </div>
            <div class="actions-content">
              <div class="action-item">
                <div class="action-info">
                  <span class="action-label">Refresh Cubicles</span>
                  <span class="action-description">Update all cubicle statuses from server</span>
                </div>
                <cv-button 
                  @click="fetchCubicles" 
                  kind="tertiary" 
                  size="md"
                  class="action-button"
                >
                  Refresh
                </cv-button>
              </div>
              
              <div class="action-item">
                <div class="action-info">
                  <span class="action-label">View Statistics</span>
                  <span class="action-description">Check usage analytics and metrics</span>
                </div>
                <cv-button 
                  @click="goToStatistics" 
                  kind="tertiary" 
                  size="md"
                  class="action-button"
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
  padding: 2rem;
}

.content-row {
  margin-bottom: 2rem;
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
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  min-height: 600px;
  width: 100%;
  overflow: visible;
}

.actions-row {
  margin-bottom: 1rem;
}

.actions-tile {
  background: white !important;
  border: 1px solid #e0e0e0 !important;
  border-radius: 8px !important;
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
  flex-direction: column;
  gap: 1.5rem;
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  background: #f4f4f4;
  border-radius: 6px;
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
  flex-shrink: 0;
  margin-left: 1rem;
  min-width: 140px;
  width: 140px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.status-legend {
  background: #f4f4f4;
  border-radius: 6px;
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
  border-radius: 50%;
  border: 2px solid transparent;
}

.legend-indicator.available {
  background-color: #24a148;
  border-color: #1e8e3e;
}

.legend-indicator.reserved {
  background-color: #0f62fe;
  border-color: #0043ce;
}

.legend-indicator.error {
  background-color: #da1e28;
  border-color: #ba1b23;
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
  }
  
  .actions-tile {
    padding: 1rem !important;
  }
  
  .action-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
  }
  
  .action-button {
    margin-left: 0;
    align-self: stretch;
    min-width: 140px;
    width: 100%;
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
</style>
