<template>
  <div class="grid-management-container" v-if="!hasError">
    <div class="panel-header">
      <h3 class="panel-title">Grid Management</h3>
      <p class="panel-subtitle">Manage and view cubicle grids by date</p>
    </div>
    
    <!-- Date Selection Section -->
    <div class="date-selection-section">
      <h4 class="section-title">Date Selection</h4>
      <div class="date-picker-container">
        <cv-date-picker
          v-model="internalSelectedDate"
          kind="single"
          date-format="Y-m-d"
          @change="onDateChange"
          :invalid="!isValidDate"
        >
          <cv-date-picker-input
            label="Reservation Date"
            placeholder="YYYY-MM-DD (e.g., 2025-06-01 or 2025-6-1)"
            :invalid="!isValidDate"
            :invalid-message="currentValidationMessage"
          />
        </cv-date-picker>
        <!-- Fixed height validation message container to prevent layout shift -->
        <div class="validation-message-container">
          <div v-if="currentValidationMessage" class="validation-message">
            {{ currentValidationMessage }}
          </div>
        </div>
        <!-- Selected Date Status Display -->
        <div v-if="internalSelectedDate" class="selected-date-status">
          <div class="status-row">
            <span class="status-label">Selected:</span>
            <span class="status-value" :class="{ 'valid': isValidDate, 'invalid': !isValidDate }">
              {{ isValidDate ? formatDate(internalSelectedDate) : internalSelectedDate }}
            </span>
          </div>
          <div v-if="isValidDate" class="status-row">
            <span class="status-label">Status:</span>
            <span class="status-value" :class="gridStatusClass">
              {{ gridStatusText }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Active Grids Display -->
      <div v-if="activeGrids.length > 0" class="active-grids-section">
        <h4 class="grids-title">Quick Select from Active Grids</h4>
        <div class="grid-dates-list">
          <cv-button
            v-for="grid in activeGrids.slice(0, 8)"
            :key="grid.dateString"
            @click="selectGridDate(grid.dateString)"
            :kind="internalSelectedDate === grid.dateString ? 'primary' : 'ghost'"
            size="sm"
            class="grid-date-button"
          >
            {{ formatDate(grid.dateString) }}
            <span class="reservation-count">({{ grid.totalReservations }})</span>
          </cv-button>
        </div>
      </div>
    </div>

    <!-- Date Actions Section - Moved outside the container -->
    <div class="date-actions-section">
      <div class="date-actions">
        <cv-button 
          @click="setToday" 
          kind="secondary" 
          size="md"
          class="today-button"
        >
          Today
        </cv-button>
        <cv-button 
          @click="clearDate" 
          kind="ghost" 
          size="md"
          class="clear-button"
          :disabled="!internalSelectedDate"
        >
          Clear
        </cv-button>
        <cv-button 
          @click="generateGrid" 
          kind="primary" 
          size="md"
          class="generate-button"
          :disabled="!canGenerateGrid || loading"
        >
          <template v-if="generatingGrid">Generating...</template>
          <template v-else>Generate Grid</template>
        </cv-button>
      </div>
    </div>


    
    <!-- Grid List -->
    <div class="grid-list">
      <div class="list-header">
        <h4 class="list-title">Available Grids</h4>
        <div class="list-actions">
          <cv-button
            @click="refreshGrids"
            kind="ghost"
            size="sm"
            class="refresh-button"
            :disabled="loading"
          >
            <template v-if="loading">Refreshing...</template>
            <template v-else>Refresh</template>
          </cv-button>
          <cv-button
            v-if="isAdmin"
            @click="cleanupEmptyGrids"
            kind="secondary"
            size="sm"
            class="cleanup-button"
            :disabled="loading"
          >
            Cleanup Empty
          </cv-button>
        </div>
      </div>
      
      <!-- Grid Items -->
      <div class="grid-items">
        <div
          v-for="grid in paginatedGrids"
          :key="grid.dateString"
          class="grid-item"
          :class="{ 'selected': internalSelectedDate === grid.dateString }"
          @click="selectGridDate(grid.dateString)"
        >
          <div class="grid-info">
            <div class="grid-date">
              <span class="date-primary">{{ formatDate(grid.dateString) }}</span>
              <span class="date-secondary">{{ formatRelativeDate(grid.dateString) }}</span>
            </div>
            <div class="grid-meta">
              <span class="reservation-count">
                {{ grid.totalReservations }} reservation{{ grid.totalReservations !== 1 ? 's' : '' }}
              </span>
              <span class="last-activity">
                Updated {{ formatRelativeTime(grid.lastActivity) }}
              </span>
            </div>
          </div>
          <div class="grid-actions">
            <cv-button
              @click.stop="viewGrid(grid)"
              kind="primary"
              size="sm"
            >
              View
            </cv-button>
            <cv-button
              @click.stop="getGridStatistics(grid)"
              kind="secondary"
              size="sm"
            >
              Stats
            </cv-button>
            <cv-button
              v-if="isAdmin && grid.totalReservations === 0"
              @click.stop="deleteGrid(grid)"
              kind="danger"
              size="sm"
            >
              Delete
            </cv-button>
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-if="activeGrids.length === 0 && !loading" class="empty-state">
          <h4>No Active Grids</h4>
          <p v-if="!internalSelectedDate">
            Select a date above and click "Generate Grid" to create your first grid.
          </p>
          <p v-else-if="!canGenerateGrid && internalSelectedDate">
            <span v-if="isDateInPast">Cannot create grids for past dates.</span>
            <span v-else-if="hasExistingGrid">A grid already exists for {{ formatDate(internalSelectedDate) }}.</span>
            <span v-else>Please select a valid date.</span>
          </p>
          <p v-else>
            Ready to create a new grid for {{ formatDate(internalSelectedDate) }}.
          </p>
        </div>
      </div>
      
      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <cv-button
          @click="currentPage--"
          :disabled="currentPage <= 1"
          kind="ghost"
          size="sm"
        >
          Previous
        </cv-button>
        <span class="page-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <cv-button
          @click="currentPage++"
          :disabled="currentPage >= totalPages"
          kind="ghost"
          size="sm"
        >
          Next
        </cv-button>
      </div>
    </div>
    
    <!-- Grid Statistics Modal -->
    <cv-modal
      :visible="showStatsModal"
      kind="default"
      size="md"
      @modal-hide-request="showStatsModal = false"
      @primary-click="showStatsModal = false"
    >
      <template v-slot:label>Grid Statistics</template>
      <template v-slot:title>{{ selectedGrid?.dateString }} - Statistics</template>
      <template v-slot:content>
        <div v-if="gridStats" class="stats-content">
          <div class="stats-section">
            <h5>General Statistics</h5>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Total Cubicles</span>
                <span class="stat-value">{{ gridStats.general.total || '...' }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Reserved</span>
                <span class="stat-value">{{ gridStats.general.reserved }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Available</span>
                <span class="stat-value">{{ gridStats.general.available }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Utilization</span>
                <span class="stat-value">{{ gridStats.general.percentReserved }}%</span>
              </div>
            </div>
          </div>
          
          <div v-if="gridStats.users.length > 0" class="stats-section">
            <h5>Top Users</h5>
            <div class="users-list">
              <div
                v-for="user in gridStats.users.slice(0, 5)"
                :key="user.user"
                class="user-item"
              >
                <span class="user-email">{{ user.user }}</span>
                <span class="user-stats">{{ user.reserved }} reservations ({{ user.percent }}%)</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="loading-stats">
          Loading statistics...
        </div>
      </template>
      <template v-slot:primary-button>Close</template>
    </cv-modal>
  </div>
  
  <!-- Error Fallback -->
  <div v-else class="error-fallback">
    <h3>Something went wrong</h3>
    <p>There was an error loading the Grid Management view.</p>
    <cv-button @click="hasError = false; $forceUpdate()" kind="primary">
      Try Again
    </cv-button>
  </div>
</template>

<script>
import axios from 'axios';
import useAuth from '../composables/useAuth';

export default {
  name: 'GridManagement',
  props: {
    selectedDate: {
      type: String,
      default: null
    }
  },
  emits: ['grid-selected', 'grid-deleted', 'grids-updated', 'date-selected', 'grid-generated', 'grid-error'],
  data() {
    // Helper to get today's date in YYYY-MM-DD
    function getToday() {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Helper to normalize date format
    function normalizeDateFormat(dateString) {
      if (!dateString) return dateString;
      const [year, month, day] = dateString.split('-');
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      return `${year}-${paddedMonth}-${paddedDay}`;
    }
    
    // Validate initial selectedDate prop
    const dateRegex = /^\d{4}-\d{1,2}-\d{1,2}$/;
    let initialDate = getToday(); // Default to today
    
    // Only use selectedDate prop if it's valid, otherwise stick with today
    if (this.selectedDate && dateRegex.test(this.selectedDate)) {
      initialDate = normalizeDateFormat(this.selectedDate);
    }
    
    return {
      activeGrids: [],
      selectedGrid: null,
      loading: false,
      generatingGrid: false,
      showStatsModal: false,
      gridStats: null,
      currentPage: 1,
      itemsPerPage: 10,
      internalSelectedDate: initialDate, // Always valid at start
      dateValidationMessage: '',
      hasError: false
    };
  },
  created() {
    // Ensure we always have a valid date
    if (!this.internalSelectedDate) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      this.internalSelectedDate = `${year}-${month}-${day}`;
    }
    
    this.fetchActiveGrids();
    // Always emit the initial date to parent
    this.$nextTick(() => {
      this.emitDateToParent();
    });
  },
  errorCaptured(err, instance, info) {
    console.error('GridManagement error:', err, info);
    this.hasError = true;
    return false;
  },
  watch: {
    internalSelectedDate: {
      handler(newVal) {
        // Debounce to prevent multiple rapid calls
        this.$nextTick(() => {
          this.emitDateToParent();
        });
      },
      immediate: false
    },
    selectedDate: {
      handler(newVal) {
        // Update internal state when parent prop changes
        if (newVal !== this.internalSelectedDate) {
          const dateRegex = /^\d{4}-\d{1,2}-\d{1,2}$/;
          if (newVal && dateRegex.test(newVal)) {
            this.internalSelectedDate = this.normalizeDateFormat(newVal);
          }
        }
      },
      immediate: false
    }
  },
  computed: {
    currentValidationMessage() {
      if (!this.internalSelectedDate || this.isValidDate) return '';
      
      // Provide specific error messages
      const dateRegex = /^\d{4}-\d{1,2}-\d{1,2}$/;  // Allow 1-2 digits for month/day
      if (!dateRegex.test(this.internalSelectedDate)) {
        return 'Please enter a date in YYYY-MM-DD format (e.g., 2025-06-01 or 2025-6-1)';
      } else {
        return 'Please enter a valid calendar date';
      }
    },
    
    isValidDate() {
      try {
        if (!this.internalSelectedDate) return true;
        
        // Check format first - allow 1-2 digits for month and day
        const dateRegex = /^\d{4}-\d{1,2}-\d{1,2}$/;
        if (!dateRegex.test(this.internalSelectedDate)) {
          return false;
        }
        
        // Check if it's a valid actual date
        const [year, month, day] = this.internalSelectedDate.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Verify the date components match (handles invalid dates like Feb 30)
        return date.getFullYear() == year && 
               date.getMonth() == (month - 1) && 
               date.getDate() == day;
      } catch (error) {
        console.error('Error validating date:', error);
        return false;
      }
    },
    
    isAdmin() {
      const { currentUser } = useAuth();
      if (!currentUser.value) return false;
      const adminUids = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(u => u.trim());
      return adminUids.includes(currentUser.value.uid);
    },
    
    totalPages() {
      return Math.ceil(this.activeGrids.length / this.itemsPerPage);
    },
    
    paginatedGrids() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.activeGrids.slice(start, end);
    },

    canGenerateGrid() {
      if (!this.internalSelectedDate || !this.isValidDate) return false;

      // Normalize the date for comparison
      const normalizedDate = this.normalizeDateFormat(this.internalSelectedDate);

      // Check if grid already exists for this date using normalized format
      const existingGrid = this.activeGrids.find(grid => this.normalizeDateFormat(grid.dateString) === normalizedDate);
      if (existingGrid) return false;

      // Check if date is today or in the future using local dates for comparison
      const [year, month, day] = normalizedDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day); // Local date creation
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today in local time

      // Allow generation for today and future dates
      return selectedDate >= today;
    },

    isDateInPast() {
      if (!this.internalSelectedDate || !this.isValidDate) return false;
      
      // Normalize the date first to ensure consistent comparison
      const normalizedDate = this.normalizeDateFormat(this.internalSelectedDate);
      const [year, month, day] = normalizedDate.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day); // Local date creation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Only dates before today are considered past
      return selectedDate < today;
    },

    hasExistingGrid() {
      if (!this.internalSelectedDate) return false;
      // Use normalized date for consistent comparison
      const normalizedDate = this.normalizeDateFormat(this.internalSelectedDate);
      return this.activeGrids.some(grid => grid.dateString === normalizedDate);
    },

    gridStatusText() {
      if (!this.internalSelectedDate || !this.isValidDate) return '';
      
      if (this.isDateInPast) {
        return 'Past date - cannot create grid';
      } else if (this.hasExistingGrid) {
        // Use normalized date to find existing grid
        const normalizedDate = this.normalizeDateFormat(this.internalSelectedDate);
        const existingGrid = this.activeGrids.find(grid => grid.dateString === normalizedDate);
        return `Grid exists (${existingGrid?.totalReservations || 0} reservations)`;
      } else if (this.canGenerateGrid) {
        return 'Ready to create new grid';
      } else {
        return 'Cannot create grid';
      }
    },

    gridStatusClass() {
      if (!this.internalSelectedDate || !this.isValidDate) return '';
      
      if (this.isDateInPast) {
        return 'status-past';
      } else if (this.hasExistingGrid) {
        return 'status-exists';
      } else if (this.canGenerateGrid) {
        return 'status-ready';
      } else {
        return 'status-error';
      }
    }
  },
  methods: {
    async fetchActiveGrids() {
      this.loading = true;
      const { token } = useAuth();
      let idToken = token.value;
      if (!idToken) {
        idToken = localStorage.getItem('auth_token');
      }
      
      try {
        const response = await axios.get('/api/cubicles/grid-dates', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        this.activeGrids = response.data;
      } catch (err) {
        console.error('Error fetching active grids:', err);
        this.activeGrids = [];
      } finally {
        this.loading = false;
      }
    },
    
    async refreshGrids() {
      await this.fetchActiveGrids();
      this.$emit('grids-updated');
    },
    
    async cleanupEmptyGrids() {
      if (!this.isAdmin) return;
      
      this.loading = true;
      const { token } = useAuth();
      let idToken = token.value;
      if (!idToken) {
        idToken = localStorage.getItem('auth_token');
      }
      
      try {
        const response = await axios.post('/api/cubicles/cleanup-empty-grids', {}, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        alert(`Cleaned up ${response.data.cleanedDates.length} empty grids`);
        await this.fetchActiveGrids();
      } catch (err) {
        console.error('Error cleaning up grids:', err);
        alert('Error cleaning up grids');
      } finally {
        this.loading = false;
      }
    },
    
    emitDateToParent() {
      try {
        // Only emit a valid date string or null
        if (this.isValidDate && this.internalSelectedDate) {
          this.$emit('date-selected', this.normalizeDateFormat(this.internalSelectedDate));
        } else {
          this.$emit('date-selected', null);
        }
      } catch (error) {
        console.error('Error emitting date to parent:', error);
        this.$emit('date-selected', null);
      }
    },

    /**
     * Set today's date as selected date
     */
    setToday() {
      // Use local timezone to get today's date
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      this.internalSelectedDate = `${year}-${month}-${day}`;
    },
    
    /**
     * Clear selected date
     */
    clearDate() {
      this.internalSelectedDate = '';
    },
    
    /**
     * Handle date change event from the date picker
     */
    onDateChange(value) {
      // The Carbon date picker may pass the value differently
      if (value && typeof value === 'string') {
        this.internalSelectedDate = value;
      }
      // Let the watcher handle validation and emission
    },
    
    /**
     * Normalize date format to YYYY-MM-DD (zero-padded)
     */
    normalizeDateFormat(dateString) {
      try {
        if (!dateString) return dateString;
        
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        
        const [year, month, day] = parts;
        const paddedMonth = month.padStart(2, '0');
        const paddedDay = day.padStart(2, '0');
        
        return `${year}-${paddedMonth}-${paddedDay}`;
      } catch (error) {
        console.error('Error normalizing date format:', error);
        return dateString;
      }
    },
    
    /**
     * Select a grid date from active grids
     */
    selectGridDate(dateString) {
      this.internalSelectedDate = this.normalizeDateFormat(dateString);
    },

    /**
     * Generate a new grid for the selected date
     */
    async generateGrid() {
      if (!this.canGenerateGrid) return;
      
      this.generatingGrid = true;
      const { token } = useAuth();
      let idToken = token.value;
      if (!idToken) {
        idToken = localStorage.getItem('auth_token');
      }
      
      // Use normalized date for API call
      const normalizedDate = this.normalizeDateFormat(this.internalSelectedDate);
      
      try {
        const response = await axios.post('/api/cubicles/generate-grid', 
          { dateString: normalizedDate },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
        
        // Refresh the active grids list
        await this.fetchActiveGrids();
        
        // Emit events to notify parent components
        this.$emit('grids-updated');
        this.$emit('grid-selected', normalizedDate);
        
        // Show success message
        this.$emit('grid-generated', {
          dateString: normalizedDate,
          grid: response.data.grid,
          message: `Grid for ${this.formatDate(normalizedDate)} created successfully!`
        });
        
      } catch (err) {
        console.error('Error generating grid:', err);
        let errorMessage = 'Error generating grid';
        
        if (err.response?.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (err.response?.status === 400) {
          errorMessage = err.response.data.error || 'Invalid request';
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        }
        
        // Use a more user-friendly notification instead of alert
        this.$emit('grid-error', {
          message: errorMessage,
          dateString: normalizedDate
        });
      } finally {
        this.generatingGrid = false;
      }
    },

    selectGrid(grid) {
      this.selectedGrid = grid;
      this.$emit('grid-selected', grid.dateString);
    },
    
    viewGrid(grid) {
      this.$emit('grid-selected', grid.dateString);
    },
    
    async getGridStatistics(grid) {
      this.selectedGrid = grid;
      this.gridStats = null;
      this.showStatsModal = true;
      
      const { token } = useAuth();
      let idToken = token.value;
      if (!idToken) {
        idToken = localStorage.getItem('auth_token');
      }
      
      try {
        const response = await axios.get(`/api/cubicles/date-statistics/${grid.dateString}`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        this.gridStats = response.data;
      } catch (err) {
        console.error('Error fetching grid statistics:', err);
        this.gridStats = { error: 'Failed to load statistics' };
      }
    },
    
    async deleteGrid(grid) {
      if (!this.isAdmin) return;
      
      if (!confirm(`Are you sure you want to delete the grid for ${this.formatDate(grid.dateString)}?`)) {
        return;
      }
      
      // For now, just mark as inactive since we don't have a delete endpoint
      // In a full implementation, you'd call an API to delete the grid
      this.$emit('grid-deleted', grid.dateString);
      await this.fetchActiveGrids();
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      // Use local date parsing to avoid timezone issues
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },
    
    formatRelativeDate(dateString) {
      if (!dateString) return '';
      // Use local date parsing to avoid timezone issues
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      const diffTime = targetDate - today;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';
      if (diffDays > 0) return `In ${diffDays} days`;
      return `${Math.abs(diffDays)} days ago`;
    },
    
    formatRelativeTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    }
  }
};
</script>

<style scoped>
.grid-management-container {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  border: none !important;
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

.date-selection-section {
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: 0; /* Sharp edges */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #161616;
}

.date-picker-container {
  width: 100%;
  margin-bottom: 0;
}

/* Carbon Date Picker styling - Sharp edges and clean cuts */
.date-picker-container :deep(.bx--date-picker) {
  margin-bottom: 1rem;
}

.date-picker-container :deep(.bx--date-picker-input__wrapper) {
  margin-bottom: 0.5rem;
}

.date-picker-container :deep(.bx--date-picker-input) {
  border-radius: 0 !important; /* Sharp edges */
  min-height: 48px !important;
  font-size: 0.875rem !important;
  padding: 0.875rem 1rem !important;
  transition: all 0.15s ease !important;
}

.date-picker-container :deep(.bx--date-picker-input:focus) {
  border-color: #0f62fe !important;
  box-shadow: 0 0 0 2px rgba(15, 98, 254, 0.2) !important;
}

.date-picker-container :deep(.bx--date-picker-input[data-invalid]) {
  border-color: #da1e28 !important;
}

.date-picker-container :deep(.bx--date-picker__icon) {
  fill: #525252 !important;
}

.date-picker-container :deep(.bx--date-picker__icon:hover) {
  fill: #0f62fe !important;
}

/* Date picker calendar styling - Sharp edges */
.date-picker-container :deep(.flatpickr-calendar) {
  border-radius: 0 !important;
  border: 1px solid #e0e0e0 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;
}

.date-picker-container :deep(.flatpickr-day) {
  border-radius: 0 !important;
}

.date-picker-container :deep(.flatpickr-day.selected) {
  background: #0f62fe !important;
  border-color: #0f62fe !important;
}

.date-picker-container :deep(.flatpickr-day:hover) {
  background: #e8f4ff !important;
}

.date-picker-container :deep(.flatpickr-current-month) {
  font-weight: 600 !important;
  color: #161616 !important;
}

.date-picker-container :deep(.flatpickr-weekday) {
  font-weight: 600 !important;
  color: #525252 !important;
}

/* Date Actions Section - External to the main container */
.date-actions-section {
  margin-bottom: 1.5rem;
  padding: 1rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

/* Carbon Design System input spacing overrides */
.date-picker-container :deep(.bx--form-item) {
  margin-bottom: 1rem;
}

.date-picker-container :deep(.bx--text-input-wrapper) {
  margin-bottom: 0.5rem;
}

.date-picker-container :deep(.bx--label) {
  margin-bottom: 0.5rem;
  font-weight: 500;
}

/* Fixed height container to prevent layout displacement */
.validation-message-container {
  height: 1.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: flex-start;
}

.validation-message {
  font-size: 0.75rem;
  color: #da1e28;
  font-weight: 400;
  line-height: 1.2;
}

/* Selected Date Status Display */
.selected-date-status {
  background: rgba(240, 248, 255, 0.8);
  border: 1px solid #e0e8f0;
  border-radius: 4px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-row:last-child {
  margin-bottom: 0;
}

.status-label {
  font-weight: 500;
  color: #525252;
  margin-right: 1rem;
}

.status-value {
  font-weight: 600;
  transition: color 0.2s ease;
}

.status-value.valid {
  color: #24a148;
}

.status-value.invalid {
  color: #da1e28;
}

.status-value.status-exists {
  color: #0f62fe;
}

.status-value.status-ready {
  color: #24a148;
}

.status-value.status-past {
  color: #8d8d8d;
}

.status-value.status-error {
  color: #da1e28;
}

.date-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.today-button,
.clear-button,
.generate-button {
  min-width: 140px;
  height: 48px;
  font-weight: 500;
  letter-spacing: 0.16px;
  border-radius: 0;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: none;
  font-size: 0.875rem;
  padding: 0.875rem 1.5rem;
}

.today-button {
  background: #393939;
  border-color: #393939;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.today-button:hover:not(:disabled) {
  background: #4c4c4c;
  border-color: #4c4c4c;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.clear-button {
  background: transparent;
  border-color: #e0e0e0;
  color: #161616;
  border-width: 1px;
  border-style: solid;
}

.clear-button:hover:not(:disabled) {
  background: #f4f4f4;
  border-color: #c6c6c6;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.clear-button:disabled {
  background: #f4f4f4;
  border-color: #c6c6c6;
  color: #8d8d8d;
  cursor: not-allowed;
}

.generate-button {
  background: #0f62fe;
  border-color: #0f62fe;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 98, 254, 0.2);
}

.generate-button:hover:not(:disabled) {
  background: #0353e9;
  border-color: #0353e9;
}

.generate-button:disabled {
  background: #c6c6c6;
  border-color: #c6c6c6;
  color: #8d8d8d;
  cursor: not-allowed;
  box-shadow: none;
}

/* Carbon Design System button overrides for consistent styling */
.today-button :deep(.bx--btn),
.clear-button :deep(.bx--btn),
.generate-button :deep(.bx--btn) {
  min-width: 120px !important;
  height: 48px !important;
  font-weight: 500 !important;
  letter-spacing: 0.16px !important;
  border-radius: 0 !important;
  transition: all 0.15s ease !important;
  text-transform: none !important;
  font-size: 0.875rem !important;
  padding: 0.875rem 1.5rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.today-button :deep(.bx--btn) {
  background: #393939 !important;
  border-color: #393939 !important;
  color: #ffffff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

.today-button:hover:not(:disabled) :deep(.bx--btn) {
  background: #4c4c4c !important;
  border-color: #4c4c4c !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
}

.clear-button :deep(.bx--btn) {
  background: transparent !important;
  border-color: #e0e0e0 !important;
  color: #161616 !important;
  border-width: 1px !important;
  border-style: solid !important;
}

.clear-button:hover:not(:disabled) :deep(.bx--btn) {
  background: #f4f4f4 !important;
  border-color: #c6c6c6 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
}

.clear-button:disabled :deep(.bx--btn) {
  background: #f4f4f4 !important;
  border-color: #c6c6c6 !important;
  color: #8d8d8d !important;
  cursor: not-allowed !important;
}

.generate-button :deep(.bx--btn) {
  background: #0f62fe !important;
  border-color: #0f62fe !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  box-shadow: 0 1px 3px rgba(15, 98, 254, 0.2) !important;
}

.generate-button:hover:not(:disabled) :deep(.bx--btn) {
  background: #0353e9 !important;
  border-color: #0353e9 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 6px rgba(15, 98, 254, 0.3) !important;
}

.generate-button:disabled :deep(.bx--btn) {
  background: #c6c6c6 !important;
  border-color: #c6c6c6 !important;
  color: #8d8d8d !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
}

.refresh-button,
.cleanup-button {
  min-width: 120px;
  height: 48px;
  font-weight: 500;
  letter-spacing: 0.16px;
  border-radius: 0;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: none;
  font-size: 0.875rem;
  padding: 0.875rem 1.5rem;
}

.refresh-button {
  background: transparent;
  border-color: #e0e0e0;
  color: #161616;
  border-width: 1px;
  border-style: solid;
}

.refresh-button:hover:not(:disabled) {
  background: #f4f4f4;
  border-color: #c6c6c6;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.refresh-button:disabled {
  background: #f4f4f4;
  border-color: #c6c6c6;
  color: #8d8d8d;
  cursor: not-allowed;
}

.cleanup-button {
  background: #393939;
  border-color: #393939;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.cleanup-button:hover:not(:disabled) {
  background: #4c4c4c;
  border-color: #4c4c4c;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.cleanup-button:disabled {
  background: #c6c6c6;
  border-color: #c6c6c6;
  color: #8d8d8d;
  cursor: not-allowed;
  box-shadow: none;
}

/* Carbon Design System button overrides for Refresh and Cleanup buttons */
.refresh-button :deep(.bx--btn),
.cleanup-button :deep(.bx--btn) {
  min-width: 120px !important;
  height: 48px !important;
  font-weight: 500 !important;
  letter-spacing: 0.16px !important;
  border-radius: 0 !important;
  transition: all 0.15s ease !important;
  text-transform: none !important;
  font-size: 0.875rem !important;
  padding: 0.875rem 1.5rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.refresh-button :deep(.bx--btn) {
  background: transparent !important;
  border-color: #e0e0e0 !important;
  color: #161616 !important;
  border-width: 1px !important;
  border-style: solid !important;
}

.refresh-button:hover:not(:disabled) :deep(.bx--btn) {
  background: #f4f4f4 !important;
  border-color: #c6c6c6 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
}

.refresh-button:disabled :deep(.bx--btn) {
  background: #f4f4f4 !important;
  border-color: #c6c6c6 !important;
  color: #8d8d8d !important;
  cursor: not-allowed !important;
}

.cleanup-button :deep(.bx--btn) {
  background: #393939 !important;
  border-color: #393939 !important;
  color: #ffffff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

.cleanup-button:hover:not(:disabled) :deep(.bx--btn) {
  background: #4c4c4c !important;
  border-color: #4c4c4c !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
}

.cleanup-button:disabled :deep(.bx--btn) {
  background: #c6c6c6 !important;
  border-color: #c6c6c6 !important;
  color: #8d8d8d !important;
  cursor: not-allowed !important;
  box-shadow: none !important;
}

.active-grids-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(224, 224, 224, 0.5);
}

.grids-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: #161616;
}

.grid-dates-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.grid-date-button {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  white-space: nowrap;
  border-radius: 0 !important; /* Sharp edges */
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.list-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: #161616;
}

.list-actions {
  display: flex;
  gap: 0.5rem;
}

.grid-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  background: #f4f4f4;
  border: 1px solid #e0e0e0;
  border-radius: 0; /* Sharp edges following Carbon Design */
}

.grid-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 0; /* Sharp edges following Carbon Design */
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.grid-item:hover {
  background: #f4f4f4;
  border-color: #0f62fe;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.grid-item.selected {
  background: #e8f4ff;
  border-color: #0f62fe;
  border-width: 2px;
  box-shadow: 0 2px 6px rgba(15, 98, 254, 0.2);
}

.grid-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.grid-date {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.date-primary {
  font-size: 1rem;
  font-weight: 600;
  color: #161616;
}

.date-secondary {
  font-size: 0.75rem;
  color: #525252;
}

.grid-meta {
  display: flex;
  gap: 1rem;
}

.reservation-count {
  font-size: 0.875rem;
  color: #0f62fe;
  font-weight: 500;
}

.last-activity {
  font-size: 0.75rem;
  color: #8d8d8d;
}

.grid-actions {
  display: flex;
  gap: 0.5rem;
}

.grid-actions .bx--btn {
  border-radius: 0; /* Sharp edges for buttons */
  font-weight: 500;
}

.grid-actions .bx--btn--primary {
  background: #0f62fe;
  border-color: #0f62fe;
}

.grid-actions .bx--btn--secondary {
  background: #393939;
  border-color: #393939;
}

.grid-actions .bx--btn--danger {
  background: #da1e28;
  border-color: #da1e28;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #525252;
  background: white;
  border: 2px dashed #c6c6c6;
  border-radius: 0; /* Sharp edges */
}

.empty-state h4 {
  margin: 0 0 0.5rem 0;
  color: #161616;
  font-weight: 600;
  font-size: 1.125rem;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  line-height: 1.4;
}

.empty-state-action {
  margin-top: 1.5rem;
}

.empty-state-action .bx--btn {
  border-radius: 0; /* Sharp edges */
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.page-info {
  font-size: 0.875rem;
  color: #525252;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-section h5 {
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #161616;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: #f4f4f4;
  border-radius: 4px;
}

.user-email {
  font-weight: 500;
  color: #161616;
}

.user-stats {
  font-size: 0.875rem;
  color: #525252;
}

.loading-stats {
  text-align: center;
  padding: 2rem;
  color: #525252;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .grid-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .grid-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* Error fallback styles */
.error-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background: #f4f4f4;
  border: 1px solid #e0e0e0;
  min-height: 200px;
}

.error-fallback h3 {
  color: #da1e28;
  margin-bottom: 1rem;
}

.error-fallback p {
  color: #525252;
  margin-bottom: 1.5rem;
}
</style>
