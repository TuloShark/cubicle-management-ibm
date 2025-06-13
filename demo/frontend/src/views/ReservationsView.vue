<template>
  <div class="reservations-container">
    <div class="page-header">
      <h1 class="page-title">Cubicle Reservations</h1>
      <p class="page-subtitle">Reserve, release, and manage office cubicle assignments</p>
    </div>
    
    <!-- Main Content Area -->
    <cv-grid class="reservations-grid">
      <!-- Quick Actions Panel - Enhanced with Date Selection -->
      <cv-row class="actions-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <div class="actions-panel">
            <div class="panel-header">
              <h3 class="panel-title">Quick Actions</h3>
              <p class="panel-subtitle">Common cubicle management operations</p>
            </div>

            <!-- Date Selection Enhancement -->
            <div class="date-selection-container">
              <div class="date-selector-group">
                <label class="date-label">Select Date:</label>
                <input
                  type="date"
                  v-model="selectedDateInput"
                  :min="minDate"
                  :max="maxDate"
                  class="date-input"
                />
                <cv-button
                  @click="goToToday"
                  kind="primary"
                  size="lg"
                  class="action-button today-button"
                  :disabled="loading"
                >
                  {{ loading ? 'Loading...' : 'Today' }}
                </cv-button>
              </div>
              
              <!-- Date-specific Statistics -->
              <div class="date-stats" v-if="dateStats">
                <transition name="stats-fade" mode="out-in">
                  <div :key="selectedDateString" class="stats-content">
                    <div class="stat-item">
                      <span class="stat-label">Selected Date</span>
                      <span class="stat-value">{{ selectedDateString }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Utilization</span>
                      <span class="stat-value">{{ dateStats.general.percentReserved }}%</span>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
            
            <div class="actions-content">
              <div class="action-container">
                <div class="action-info-card">
                  <span class="action-label">Refresh Cubicles</span>
                  <span class="action-description">Update all cubicle statuses for selected date</span>
                </div>
                <cv-button 
                  @click="handleRefresh" 
                  kind="primary" 
                  size="lg"
                  class="action-button refresh-button"
                  :disabled="loading"
                >
                  {{ loading ? 'Loading...' : 'Refresh' }}
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
                      <transition name="count-fade" mode="out-in">
                        <span v-if="showCounts && dateStats" :key="`available-${dateStats.general.available}`" class="legend-count">{{ dateStats.general.available }}</span>
                      </transition>
                    </span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-indicator reserved"></div>
                    <span class="legend-label">
                      Reserved
                      <transition name="count-fade" mode="out-in">
                        <span v-if="showCounts && dateStats" :key="`reserved-${dateStats.general.reserved}`" class="legend-count">{{ dateStats.general.reserved }}</span>
                      </transition>
                    </span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-indicator error"></div>
                    <span class="legend-label">
                      Err/Maintenance
                      <transition name="count-fade" mode="out-in">
                        <span v-if="showCounts && dateStats" :key="`error-${dateStats.general.error}`" class="legend-count">{{ dateStats.general.error }}</span>
                      </transition>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </cv-column>
      </cv-row>
      
      <!-- Loading State -->
      <cv-row v-if="loading" class="loading-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <div class="loading-container">
            <cv-loading overlay="true" />
          </div>
        </cv-column>
      </cv-row>

      <!-- Error State -->
      <cv-row v-else-if="error" class="error-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <div class="error-container">
            <cv-inline-notification
              kind="error"
              :title="error"
              @close="error = null"
            />
          </div>
        </cv-column>
      </cv-row>

      <!-- Enhanced Cubicle Grid -->
      <cv-row v-else class="content-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <div class="grid-container" ref="gridContainer">
            <div 
              v-if="loading" 
              class="loading-overlay"
              :class="{ 'visible': loading }"
            >
              <div class="loading-indicator">
                <div class="loading-spinner"></div>
                <span class="loading-text">Loading cubicles...</span>
              </div>
            </div>
            <transition name="fade-slide" mode="out-in">
              <div 
                :key="selectedDateString" 
                class="grid-content-wrapper"
                :class="{ 'loading-state': loading }"
              >
                <DateCubicleGrid 
                  :cubicles="cubicles" 
                  :selected-date="selectedDateString"
                  :date-stats="dateStats"
                  @reserve="handleReserve"
                  @cancel="handleCancel"
                  @update-cubicle-state="updateCubicleState"
                />
              </div>
            </transition>
          </div>
        </cv-column>
      </cv-row>

      <!-- Reservation Summary removed as per user request -->
    </cv-grid>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import { io } from 'socket.io-client';
import DateCubicleGrid from '../components/DateCubicleGrid.vue';
import useAuth from '../composables/useAuth';
import { useDateStore } from '../composables/useDateStore';

export default {
  name: 'ReservationsView',
  components: { 
    DateCubicleGrid 
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { token } = useAuth();
    
    // Use global date store instead of local state
    const {
      selectedDate,
      selectedDateInput,
      selectedDateString,
      setSelectedDate,
      goToToday: goToTodayGlobal,
      handleDateInputChange: handleDateInputChangeGlobal,
      getRouteDate,
      initializeFromRoute
    } = useDateStore();
    
    // Reactive state - keeping other state that's not date-related
    const cubicles = ref([]);
    const dateStats = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const showCounts = ref(false);
    const socket = ref(null);
    const gridContainer = ref(null);

    // Computed properties - matching original (keeping the ones not in date store)
    const minDate = computed(() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    const maxDate = computed(() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90); // 90 days ahead
      const year = futureDate.getFullYear();
      const month = String(futureDate.getMonth() + 1).padStart(2, '0');
      const day = String(futureDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    // Methods - enhanced but keeping original patterns
    const fetchCubiclesForDate = async (date = selectedDate.value) => {
      loading.value = true;
      error.value = null;
      
      try {
        // Get authentication token with fallback to localStorage
        let idToken = token.value;
        if (!idToken) {
          idToken = localStorage.getItem('auth_token');
        }
        
        if (!idToken) {
          console.error('No authentication token available');
          error.value = 'Authentication required';
          return;
        }
        
        // Format date properly to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        const response = await axios.get(`/api/cubicles/date/${dateString}`, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        
        cubicles.value = response.data.cubicles;
        
        // Fetch statistics for the date
        const statsResponse = await axios.get(`/api/cubicles/stats/date/${dateString}`, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        
        dateStats.value = statsResponse.data;
        
      } catch (err) {
        console.error('Error fetching cubicles for date:', err);
        
        // Handle rate limiting specifically
        if (err.response?.status === 429) {
          error.value = 'Too many requests. Please wait a moment and try again.';
          // Retry after 2 seconds for rate limit errors
          setTimeout(() => {
            error.value = null;
          }, 2000);
        } else {
          error.value = err.response?.data?.error || 'Failed to load cubicles';
        }
      } finally {
        loading.value = false;
      }
    };

    // Silent refresh function that doesn't show loading state
    const refreshDataSilently = async (date = selectedDate.value) => {
      try {
        // Get authentication token with fallback to localStorage
        let idToken = token.value;
        if (!idToken) {
          idToken = localStorage.getItem('auth_token');
        }
        
        if (!idToken) {
          console.error('No authentication token available');
          return;
        }
        
        // Format date properly to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        // Add delay between requests to avoid rate limiting
        const [response, statsResponse] = await Promise.all([
          axios.get(`/api/cubicles/date/${dateString}`, {
            headers: {
              Authorization: `Bearer ${idToken}`
            }
          }),
          // Add a small delay for the stats request
          new Promise(resolve => setTimeout(resolve, 100)).then(() =>
            axios.get(`/api/cubicles/stats/date/${dateString}`, {
              headers: {
                Authorization: `Bearer ${idToken}`
              }
            })
          )
        ]);
        
        cubicles.value = response.data.cubicles;
        dateStats.value = statsResponse.data;
        
      } catch (err) {
        console.error('Error refreshing cubicles data:', err);
        // Don't show error for silent refresh, just log it
      }
    };

    const handleDateInputChange = async (event) => {
      // Store scroll position before making changes
      const scrollContainer = gridContainer.value;
      const scrollTop = scrollContainer?.scrollTop || 0;
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      
      // Use global date store to handle date change
      handleDateInputChangeGlobal(event);
      
      // Use smooth refresh instead of showing loading state
      await refreshDataSilently(selectedDate.value);
      
      // Restore scroll position
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
        scrollContainer.scrollLeft = scrollLeft;
      }
    };

    const goToToday = async () => {
      // Store scroll position before making changes
      const scrollContainer = gridContainer.value;
      const scrollTop = scrollContainer?.scrollTop || 0;
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      
      // Use global date store to go to today
      goToTodayGlobal();
      
      // Use smooth refresh instead of showing loading state
      await refreshDataSilently(selectedDate.value);
      
      // Restore scroll position
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
        scrollContainer.scrollLeft = scrollLeft;
      }
    };

    const handleRefresh = async () => {
      // Store scroll position before making changes
      const scrollContainer = gridContainer.value;
      const scrollTop = scrollContainer?.scrollTop || 0;
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      
      try {
        // Use smooth refresh instead of showing loading state for consistency
        await refreshDataSilently(selectedDate.value);
        
        // Restore scroll position
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollTop;
          scrollContainer.scrollLeft = scrollLeft;
        }
      } catch (err) {
        console.error('Error during refresh:', err);
        error.value = 'Failed to refresh cubicles';
      }
    };

    const handleReserve = async (cubicleId) => {
      // Store scroll position before making changes
      const scrollContainer = gridContainer.value;
      const scrollTop = scrollContainer?.scrollTop || 0;
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      
      try {
        // Get authentication token with fallback to localStorage
        let idToken = token.value;
        if (!idToken) {
          idToken = localStorage.getItem('auth_token');
        }
        
        if (!idToken) {
          console.error('No authentication token available');
          error.value = 'Authentication required';
          return;
        }
        
        // Optimistic update - immediately update the UI
        const cubicleIndex = cubicles.value.findIndex(c => c._id === cubicleId);
        if (cubicleIndex !== -1) {
          cubicles.value[cubicleIndex] = {
            ...cubicles.value[cubicleIndex],
            dateStatus: 'reserved',
            reservationInfo: {
              user: {
                uid: 'current-user', // Will be updated with real data
                email: 'Current User'
              }
            }
          };
        }
        
        // Format date properly to avoid timezone issues
        const year = selectedDate.value.getFullYear();
        const month = String(selectedDate.value.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.value.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        await axios.post(`/api/cubicles/reserve/date/${dateString}`, {
          cubicleId
        }, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        
        // Silently refresh data without loading state
        await refreshDataSilently();
        
        // Restore scroll position
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollTop;
          scrollContainer.scrollLeft = scrollLeft;
        }
        
      } catch (err) {
        // Revert optimistic update on error
        const cubicleIndex = cubicles.value.findIndex(c => c._id === cubicleId);
        if (cubicleIndex !== -1) {
          cubicles.value[cubicleIndex] = {
            ...cubicles.value[cubicleIndex],
            dateStatus: 'available',
            reservationInfo: null
          };
        }
        
        console.error('Error reserving cubicle:', err);
        error.value = err.response?.data?.error || 'Failed to reserve cubicle';
      }
    };

    const handleCancel = async (reservationId) => {
      // Store scroll position before making changes
      const scrollContainer = gridContainer.value;
      const scrollTop = scrollContainer?.scrollTop || 0;
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      
      try {
        // Get authentication token with fallback to localStorage
        let idToken = token.value;
        if (!idToken) {
          idToken = localStorage.getItem('auth_token');
        }
        
        if (!idToken) {
          console.error('No authentication token available');
          error.value = 'Authentication required';
          return;
        }
        
        // Find the cubicle with this reservation and optimistically update
        const cubicleIndex = cubicles.value.findIndex(c => 
          c.reservationInfo && c.reservationInfo._id === reservationId
        );
        
        if (cubicleIndex !== -1) {
          cubicles.value[cubicleIndex] = {
            ...cubicles.value[cubicleIndex],
            dateStatus: 'available',
            reservationInfo: null
          };
        }
        
        await axios.delete(`/api/cubicles/reservation/${reservationId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        
        // Silently refresh data without loading state
        await refreshDataSilently();
        
        // Restore scroll position
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollTop;
          scrollContainer.scrollLeft = scrollLeft;
        }
        
      } catch (err) {
        // Revert optimistic update on error
        const cubicleIndex = cubicles.value.findIndex(c => 
          c.dateStatus === 'available' && !c.reservationInfo
        );
        
        if (cubicleIndex !== -1) {
          // Note: We can't fully revert without knowing the original reservation info
          // So we'll just refresh the data
          await refreshDataSilently();
        }
        
        console.error('Error cancelling reservation:', err);
        error.value = err.response?.data?.error || 'Failed to cancel reservation';
      }
    };

    const toggleLegendCounts = () => {
      showCounts.value = !showCounts.value;
    };

    const goToStatistics = () => {
      // Pass the currently selected date to StatisticsView using the global date store
      console.log('goToStatistics called with selectedDate:', selectedDate.value);
      console.log('goToStatistics called with selectedDateString:', selectedDateString.value);
      console.log('goToStatistics called with selectedDateInput:', selectedDateInput.value);
      
      // Use getRouteDate from global store for consistency
      const dateToUse = getRouteDate();
      if (dateToUse) {
        console.log('Navigating to /statistics/' + dateToUse);
        router.push(`/statistics/${dateToUse}`);
      } else {
        console.log('No date selected, navigating to /statistics');
        router.push('/statistics');
      }
    };

    // Debounce timer for socket updates
    let socketUpdateTimeout = null;

    const setupSocket = () => {
      socket.value = io('http://localhost:3000');
      
      socket.value.on('dateReservationUpdate', (data) => {
        if (data.date === selectedDateString.value) {
          // Update the specific cubicle without full refresh
          const cubicleIndex = cubicles.value.findIndex(c => c._id === data.cubicleId);
          if (cubicleIndex !== -1) {
            cubicles.value[cubicleIndex] = {
              ...cubicles.value[cubicleIndex],
              dateStatus: data.status,
              reservationInfo: data.reservation
            };
          }
          
          // Debounce statistics refresh to prevent rate limiting
          if (socketUpdateTimeout) {
            clearTimeout(socketUpdateTimeout);
          }
          socketUpdateTimeout = setTimeout(() => {
            refreshDataSilently(selectedDate.value);
          }, 1000); // Wait 1 second before refreshing stats
        }
      });
    };

    // Lifecycle - matching original patterns
    onMounted(async () => {
      // Initialize from route parameter if available, otherwise use global date store
      if (route.params.date && typeof route.params.date === 'string') {
        console.log('ReservationsView - initializing from route date:', route.params.date);
        initializeFromRoute(route.params.date);
      } else {
        console.log('ReservationsView - using current global date:', selectedDate.value);
      }
      
      // Fetch initial data using current global date
      await fetchCubiclesForDate(selectedDate.value);
      setupSocket();
    });

    onUnmounted(() => {
      if (socket.value) {
        socket.value.disconnect();
      }
    });

    // Watch for global date changes and refetch data
    watch(selectedDate, async (newDate) => {
      console.log('ReservationsView - selectedDate changed to:', newDate);
      await refreshDataSilently(newDate);
    });

    // Watch for global date string changes and refetch data
    watch(selectedDateString, async (newDateString) => {
      console.log('ReservationsView - selectedDateString changed to:', newDateString);
      await fetchCubiclesForDate(selectedDate.value);
    });

    // Update cubicle global state (for Error state changes)
    const updateCubicleState = async (cubicle) => {
      // Store scroll position before making changes
      const scrollContainer = gridContainer.value;
      const scrollTop = scrollContainer?.scrollTop || 0;
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      
      try {
        // Get authentication token with fallback to localStorage
        let idToken = token.value;
        if (!idToken) {
          idToken = localStorage.getItem('auth_token');
        }
        
        if (!idToken) {
          console.error('No authentication token available');
          error.value = 'Authentication required';
          return;
        }
        
        // Update global cubicle status (e.g., for error state)
        await axios.put(`/cubicles/${cubicle._id}`, { 
          status: cubicle.status 
        }, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        
        // Silently refresh data to get updated state
        await refreshDataSilently();
        
        // Restore scroll position
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollTop;
          scrollContainer.scrollLeft = scrollLeft;
        }
        
      } catch (err) {
        console.error('Error updating cubicle state:', err);
        error.value = err.response?.data?.error || 'Failed to update cubicle state';
        // Still refresh to ensure UI is in sync
        await refreshDataSilently();
      }
    };

    return {
      selectedDate,
      selectedDateInput,
      selectedDateString,
      cubicles,
      dateStats,
      loading,
      error,
      showCounts,
      minDate,
      maxDate,
      gridContainer,
      fetchCubiclesForDate,
      refreshDataSilently,
      handleDateInputChange,
      goToToday,
      handleRefresh,
      handleReserve,
      handleCancel,
      updateCubicleState,
      toggleLegendCounts,
      goToStatistics,
    };
  }
};
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

.loading-row,
.error-row,
.summary-row {
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

:deep(.bx--btn--tertiary) {
  background: transparent !important;
  border-color: #0f62fe !important;
  color: #0f62fe !important;
}

:deep(.bx--btn--tertiary:hover) {
  background: rgba(15, 98, 254, 0.1) !important;
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

/* Grid Container Styles - Fully responsive without media queries */
.grid-container {
  background: transparent;
  border-radius: 0;
  padding: clamp(0.5rem, 2vw, 0.75rem);
  box-shadow: none;
  border: none;
  width: 100%;
  /* Smart overflow handling - auto adjusts based on content */
  overflow: auto;
  /* Responsive height that adapts to viewport */
  max-height: clamp(60vh, 80vh, 85vh);
  margin-top: clamp(0.25rem, 1vw, 0.5rem);
  box-sizing: border-box;
  position: relative;
  /* Smooth scrolling for better UX */
  scroll-behavior: smooth;
}

/* Responsive scrollbar styling - works across all devices */
.grid-container::-webkit-scrollbar {
  width: clamp(4px, 1vw, 8px);
  height: clamp(4px, 1vw, 8px);
}

.grid-container::-webkit-scrollbar-track {
  background: #f4f4f4;
  border-radius: 0;
}

.grid-container::-webkit-scrollbar-thumb {
  background: #c6c6c6;
  border-radius: 0;
}

.grid-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Firefox scrollbar styling */
.grid-container {
  scrollbar-width: thin;
  scrollbar-color: #c6c6c6 #f4f4f4;
}

.grid-content-wrapper {
  transition: opacity 0.15s ease-in-out, transform 0.15s ease-in-out;
  will-change: opacity, transform;
}

.grid-content-wrapper.loading-state {
  opacity: 0.6;
  pointer-events: none;
}

/* Smooth Transitions - Carbon Design System */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.stats-fade-enter-active,
.stats-fade-leave-active {
  transition: all 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
}

.stats-fade-enter-from {
  opacity: 0;
  transform: translateX(4px);
}

.stats-fade-leave-to {
  opacity: 0;
  transform: translateX(-4px);
}

.count-fade-enter-active,
.count-fade-leave-active {
  transition: all 0.1s cubic-bezier(0.2, 0, 0.38, 0.9);
}

.count-fade-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.count-fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.stats-content {
  display: flex;
  gap: 2rem;
  align-items: center;
}

/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(244, 244, 244, 0.8);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  transition: all 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
}

.loading-overlay.visible {
  opacity: 1;
  visibility: visible;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #0f62fe;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 0.875rem;
  color: #525252;
  font-weight: 400;
  letter-spacing: 0.16px;
}



/* Loading and Error States */
.loading-container,
.error-container {
  padding: 2rem;
  text-align: center;
}

/* Actions Panel Styles */
.actions-panel {
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

/* Date Selection Styles */
.date-selection-container {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: 0;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.date-selector-group {
  display: flex;
  align-items: stretch;
  gap: clamp(0.5rem, 2vw, 1rem);
  margin-bottom: 1rem;
  min-height: clamp(48px, 8vh, 60px);
  flex-wrap: wrap;
  /* Smart responsive behavior without media queries */
  flex-direction: row;
  /* Will auto-wrap when space is too tight */
}

.date-label {
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  font-weight: 600;
  color: #161616;
  white-space: nowrap;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  /* Responsive min-width that adapts to content */
  min-width: fit-content;
  /* Will take more space when available */
  flex: 0 1 auto;
}

.date-input {
  /* Smart flexible sizing - grows and shrinks as needed */
  flex: 1 1 clamp(160px, 30vw, 250px);
  min-width: clamp(120px, 25vw, 160px);
  padding: clamp(0.4rem, 1vw, 0.5rem);
  border: 1px solid #8d8d8d;
  border-radius: 0;
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  background: #ffffff;
  color: #161616;
  transition: all 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
  height: 100%;
  box-sizing: border-box;
  position: relative;
}

.date-input:focus {
  outline: 2px solid #0f62fe;
  outline-offset: -2px;
  border-color: #0f62fe;
  box-shadow: inset 0 0 0 1px #0f62fe;
}

.date-input:hover:not(:focus) {
  border-color: #393939;
}

.today-button {
  /* Smart button sizing that adapts */
  flex: 0 1 auto;
  min-width: clamp(80px, 15vw, 120px);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(0.25rem, 1vw, 0.5rem);
  font-weight: 400;
  font-size: clamp(0.8rem, 2vw, 0.875rem);
  border-radius: 0;
  transition: all 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
  letter-spacing: 0.16px;
  margin: 0;
  padding: clamp(0.75rem, 2vw, 1rem);
  text-transform: none;
  position: relative;
  /* Will shrink when space is tight */
  flex-shrink: 1;
  overflow: hidden;
}

.action-button.today-button {
  background: #0f62fe;
  border-color: #0f62fe;
  color: #ffffff;
}

.action-button.today-button:hover:not(:disabled) {
  background: #0353e9;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(15, 98, 254, 0.3);
}

.action-button.today-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(15, 98, 254, 0.3);
}

.action-button.today-button:disabled {
  background: #8d8d8d;
  border-color: #8d8d8d;
  color: #c6c6c6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.date-stats {
  display: flex;
  gap: 2rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #525252;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.32px;
}

.stat-value {
  font-size: 1.25rem;
  color: #161616;
  font-weight: 600;
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
  min-height: 60px;
  flex-wrap: wrap;
}

.action-container {
  display: flex;
  flex-direction: row;
  flex: 1 1 300px;
  min-width: 280px;
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
  flex: 1 1 auto;
  min-width: 180px;
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
  flex: 0 0 auto;
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
  transition: all 0.15s cubic-bezier(0.2, 0, 0.38, 0.9);
  letter-spacing: 0.16px;
  margin: 0;
  padding: 1rem;
  text-transform: none;
  position: relative;
  overflow: hidden;
}

.action-button.refresh-button {
  background: #0f62fe;
  border-color: #0f62fe;
  color: #ffffff;
}

.action-button.refresh-button:hover:not(:disabled) {
  background: #0353e9;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(15, 98, 254, 0.3);
}

.action-button.refresh-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(15, 98, 254, 0.3);
}

.action-button.refresh-button:disabled {
  background: #8d8d8d;
  border-color: #8d8d8d;
  color: #c6c6c6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.action-button.statistics-button {
  background: #393939;
  border-color: #393939;
  color: #ffffff;
}

.action-button.statistics-button:hover:not(:disabled) {
  background: #4c4c4c;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(57, 57, 57, 0.3);
}

.action-button.statistics-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(57, 57, 57, 0.3);
}

/* Legend Container */
.legend-container {
  position: relative;
  width: 100%;
  margin-top: 0.5rem;
}

/* Status Legend Styles */
.status-legend {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: 0;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
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
  transform: translateY(-1px);
}

.status-legend.show-counts {
  background: rgba(15, 98, 254, 0.05);
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
  border-radius: 0;
  font-size: 0.75rem;
  animation: fadeIn 0.3s ease;
}

/* Reservation Summary Panel */
.reservation-summary-panel {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: 0;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-top: 0.5rem;
}

.summary-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #161616;
  letter-spacing: 0.16px;
  text-transform: uppercase;
}

.user-reservations {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
}

.user-reservation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgba(15, 98, 254, 0.05);
  border-left: 3px solid #0f62fe;
}

.user-name {
  font-weight: 500;
  color: #161616;
}

.user-count {
  font-size: 0.75rem;
  color: #525252;
  font-weight: 400;
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

/* Modern Flexbox Responsive Design - No Media Queries Needed! */
.page-header {
  padding: clamp(0.75rem, 2vw, 1.5rem);
}

.page-title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
}

.actions-content {
  /* Auto-stacking when space is tight */
  flex-direction: column;
  height: auto;
  gap: clamp(0.5rem, 1vw, 1rem);
  /* Will arrange horizontally when there's enough space */
  flex-wrap: wrap;
}

.action-container {
  height: clamp(50px, 8vh, 70px);
  /* Flexible sizing */
  flex: 1 1 auto;
}

/* Date selector group already improved above */

.date-stats {
  /* Smart responsive layout */
  flex-direction: row;
  flex-wrap: wrap;
  gap: clamp(0.5rem, 2vw, 1rem);
  justify-content: space-between;
  align-items: center;
}

.legend-items {
  /* Auto-wrapping layout */
  flex-direction: row;
  flex-wrap: wrap;
  gap: clamp(0.5rem, 2vw, 1rem);
  align-items: center;
  justify-content: flex-start;
}

.status-legend {
  /* Smart responsive layout */
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: clamp(0.75rem, 2vw, 1.5rem);
  justify-content: space-between;
}

.user-reservations {
  /* Responsive grid using auto-fit */
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}
</style>
