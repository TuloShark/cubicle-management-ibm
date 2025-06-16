<template>
  <div class="reservations-container">
    <!-- Simple Consistent Header Component -->
    <PageHeader
      title="Cubicle Reservations"
      subtitle="Reserve, release, and manage office cubicle assignments"
    />
    
    <!-- Main Content Area -->
    <cv-grid class="reservations-grid">
      <!-- Quick Actions Panel - Simplified without date controls -->
      <cv-row class="actions-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <div class="actions-panel">
            <div class="panel-header">
              <h3 class="panel-title">Quick Actions</h3>
              <p class="panel-subtitle">Common cubicle management operations</p>
            </div>
            
            <!-- Date Selection Panel -->
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
                      <span class="stat-value">{{ formatDisplayDate(selectedDateString) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Utilization</span>
                      <span class="stat-value">{{ dateStats.general ? dateStats.general.percentReserved : 0 }}%</span>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
            
            <!-- Status Legend -->
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
              title="Reservation Error"
              :subtitle="error"
              @close="error = null"
            >
              <template #action>
                <cv-button
                  kind="tertiary"
                  size="sm"
                  @click="error = null"
                >
                  Dismiss
                </cv-button>
              </template>
            </cv-inline-notification>
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
import PageHeader from '../components/PageHeader.vue';
import useAuth from '../composables/useAuth';
import { useDateStore } from '../composables/useDateStore';
import { getApiBaseUrl } from '../utils/envUtils';
import './styles/ReservationsViewStyles.css';

export default {
  name: 'ReservationsView',
  components: {
    DateCubicleGrid,
    PageHeader
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { token, authError, clearError, refreshToken } = useAuth();
    
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

    // Format display date function to match the header
    const formatDisplayDate = (dateStr) => {
      if (!dateStr) return 'No date selected'
      try {
        const date = new Date(dateStr + 'T00:00:00') // Parse as local date
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      } catch (error) {
        console.warn('Error formatting date:', error)
        return dateStr
      }
    }

    // Methods - enhanced but keeping original patterns
    const fetchCubiclesForDate = async (date = selectedDate.value) => {
      loading.value = true;
      error.value = null;
      
      try {
        // Get authentication token from centralized auth management
        const idToken = token.value;
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
        
        const response = await axios.get(`${getApiBaseUrl()}/api/cubicles/date/${dateString}`, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        
        cubicles.value = response.data.cubicles;
        
        // Fetch statistics for the date
        const statsResponse = await axios.get(`${getApiBaseUrl()}/api/cubicles/stats/date/${dateString}`, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        
        dateStats.value = statsResponse.data;
        
      } catch (err) {
        console.error('Error fetching cubicles for date:', err);
        
        // Handle authentication errors with token refresh
        if (err.response?.status === 401) {
          try {
            await refreshToken();
            // Retry the request with the new token
            const retryResponse = await axios.get(`${getApiBaseUrl()}/api/cubicles/date/${dateString}`, {
              headers: {
                Authorization: `Bearer ${token.value}`
              }
            });
            cubicles.value = retryResponse.data.cubicles;
            
            const retryStatsResponse = await axios.get(`${getApiBaseUrl()}/api/cubicles/stats/date/${dateString}`, {
              headers: {
                Authorization: `Bearer ${token.value}`
              }
            });
            dateStats.value = retryStatsResponse.data;
            return;
          } catch (refreshErr) {
            console.error('Token refresh failed:', refreshErr);
            error.value = 'Authentication failed. Please log in again.';
          }
        }
        // Handle rate limiting specifically
        else if (err.response?.status === 429) {
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
        // Get authentication token from centralized auth management
        const idToken = token.value;
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
          axios.get(`${getApiBaseUrl()}/api/cubicles/date/${dateString}`, {
            headers: {
              Authorization: `Bearer ${idToken}`
            }
          }),
          // Add a small delay for the stats request
          new Promise(resolve => setTimeout(resolve, 100)).then(() =>
            axios.get(`${getApiBaseUrl()}/api/cubicles/stats/date/${dateString}`, {
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
        // If the refresh fails, we should at least preserve the existing data
        // rather than clearing it completely
        if (err.response?.status === 401) {
          error.value = 'Authentication expired. Please login again.';
        } else if (err.response?.status === 403) {
          error.value = 'Access denied. Insufficient permissions.';
        }
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
        // Get authentication token from centralized auth management
        const idToken = token.value;
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
        
        await axios.post(`${getApiBaseUrl()}/api/cubicles/reserve/date/${dateString}`, {
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
        
        // Enhanced error handling and logging
        console.error('Error reserving cubicle:', err);
        console.error('Error response:', err.response);
        console.error('Error data:', err.response?.data);
        
        // Extract and display meaningful error message
        let errorMessage = 'Failed to reserve cubicle';
        
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response?.status === 400) {
          errorMessage = 'Invalid reservation request. Please check your selection and try again.';
        } else if (err.response?.status === 401) {
          errorMessage = 'Authentication required. Please log in and try again.';
        } else if (err.response?.status === 403) {
          errorMessage = 'Access denied. You do not have permission to make this reservation.';
        } else if (err.response?.status === 409) {
          errorMessage = 'This cubicle is already reserved for the selected date.';
        } else if (err.response?.status >= 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        }
        
        error.value = errorMessage;
      }
    };

    const handleCancel = async (reservationId) => {
      // Store scroll position before making changes
      const scrollContainer = gridContainer.value;
      const scrollTop = scrollContainer?.scrollTop || 0;
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      
      try {
        // Get authentication token from centralized auth management
        const idToken = token.value;
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
        
        await axios.delete(`${getApiBaseUrl()}/api/cubicles/reservation/${reservationId}`, {
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
        
        // Enhanced error handling and logging
        console.error('Error cancelling reservation:', err);
        console.error('Error response:', err.response);
        console.error('Error data:', err.response?.data);
        
        // Extract and display meaningful error message
        let errorMessage = 'Failed to cancel reservation';
        
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response?.status === 400) {
          errorMessage = 'Invalid cancellation request. Please refresh and try again.';
        } else if (err.response?.status === 401) {
          errorMessage = 'Authentication required. Please log in and try again.';
        } else if (err.response?.status === 403) {
          errorMessage = 'Access denied. You can only cancel your own reservations.';
        } else if (err.response?.status === 404) {
          errorMessage = 'Reservation not found. It may have already been cancelled.';
        } else if (err.response?.status >= 500) {
          errorMessage = 'Server error. Please try again later or contact support.';
        }
        
        error.value = errorMessage;
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
      // Use centralized environment utility for API URL
      const apiUrl = getApiBaseUrl();
      socket.value = io(apiUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        withCredentials: true,
        forceNew: false,
        autoConnect: true
      });
      
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
        await initializeFromRoute(route.params.date);
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

    // Watch for global date string changes and refetch data
    // FIXED: Removed duplicate selectedDate watcher to prevent double API calls
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
        // Get authentication token from centralized auth management
        const idToken = token.value;
        if (!idToken) {
          console.error('No authentication token available');
          error.value = 'Authentication required';
          return;
        }
        
        // Update global cubicle status (e.g., for error state)
        await axios.put(`${getApiBaseUrl()}/api/cubicles/${cubicle._id}`, { 
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

    // New event handlers for PageHeader component
    const onDateChanged = async (newDateString) => {
      // The date store will automatically update and trigger watchers
      // Just ensure we have the latest data
      await refreshDataSilently();
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
      formatDisplayDate,
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
      onDateChanged,
      // Auth error management
      authError,
      clearError,
      refreshToken
    };
  }
};
</script>