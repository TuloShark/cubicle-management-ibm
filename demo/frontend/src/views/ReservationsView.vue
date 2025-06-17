<!--
===================================================================
VIEWS: ReservationsView
===================================================================
PURPOSE: 
Main cubicle reservation management interface that provides comprehensive
cubicle booking functionality with real-time updates, optimistic UI changes,
and seamless user experience for office space management.

FEATURES:
- Interactive cubicle grid with date-based filtering
- Real-time reservation updates via WebSocket integration
- Optimistic UI updates for immediate user feedback
- Comprehensive error handling with user-friendly messages
- Scroll position preservation during operations
- Role-based access control for reservations with calendar picker integration
- Statistics integration and legend with live counts

INTEGRATION:
- Routes: /reservations, /reservations/:date (supports optional date parameter)
- Authentication: Requires valid Firebase auth token with refresh capability
- API Dependencies: Multiple endpoints for cubicles, reservations, and statistics
- Global State: Uses useDateStore for centralized date management
- Real-time: WebSocket connection with date-specific event filtering
- Components: DateCubicleGrid, PageHeader

CORE FUNCTIONALITY:
1. **Data Fetching**: Retrieves cubicles and statistics for selected date
2. **Reservation Management**: Handle reserve/cancel operations with optimistic updates
3. **Real-time Updates**: Live data refresh via WebSocket events
4. **State Management**: Cubicle status updates and error state handling
5. **Navigation**: Date selection and statistics page integration

DATA FLOW:
- selectedDate (from global store) → API endpoints → cubicles/stats processing
- User interactions → optimistic updates → API calls → data refresh
- WebSocket events → filtered updates → UI state synchronization

ERROR HANDLING:
- Network failures with retry mechanisms and user notifications
- Authentication errors with automatic token refresh
- Rate limiting with debounced requests and user feedback
- Validation errors with specific error messages
- Optimistic update rollback on operation failures

PERFORMANCE OPTIMIZATIONS:
- Debounced WebSocket updates to prevent excessive API calls
- Silent data refresh to avoid loading states during navigation
- Scroll position preservation for seamless user experience
- Parallel API calls with staggered requests to avoid rate limiting
- Optimistic UI updates for immediate user feedback

ACCESSIBILITY:
- ARIA labels for all interactive elements
- Keyboard navigation support for grid interactions
- Screen reader announcements for status changes
- High contrast design following IBM Carbon standards
- Semantic HTML structure for assistive technologies

DEPENDENCIES:
- Vue 3 Composition API with reactive state management
- Socket.io for real-time data synchronization
- IBM Carbon Design System components
- Global date store and authentication composables
- Axios for HTTP requests with interceptors
- Vue Router for navigation and parameter handling

LAST UPDATED: June 2025 - Enhanced with comprehensive error handling,
performance optimizations, and production-ready improvements
===================================================================
-->

<template>
  <div class="reservations-container">
    <!-- Simple Consistent Header Component -->
    <PageHeader
      title="Cubicle Reservations"
      subtitle="Reserve, release, and manage office cubicle assignments"
    />
    
    <!-- User Notification Toast -->
    <cv-toast-notification
      v-if="notification.show"
      :kind="notification.type"
      :title="notification.title"
      :sub-title="notification.message"
      :close-aria-label="'Dismiss notification'"
      @close="dismissNotification"
      class="reservations-notification"
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
                <input
                  type="date"
                  v-model="selectedDateInput"
                  :min="minDate"
                  :max="maxDate"
                  class="date-input"
                />
              </div>
              
              <!-- Date-specific Statistics -->
              <div class="date-stats" v-if="dateStats">
                <transition name="stats-fade" mode="out-in">
                  <div :key="selectedDateString" class="stats-content">
                    <div class="stat-item today-button-container">
                      <cv-button
                        @click="goToToday"
                        kind="primary"
                        size="lg"
                        class="action-button today-button"
                        :disabled="loading.data || loading.reserve || loading.cancel || loading.update"
                      >
                        {{ (loading.data || loading.reserve || loading.cancel || loading.update) ? 'Loading...' : 'Today' }}
                      </cv-button>
                    </div>
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
      <cv-row v-if="loading.data" class="loading-row">
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
            <transition name="fade-slide" mode="out-in">
              <div 
                class="grid-content-wrapper"
                :class="{ 'loading-state': loading.data }"
              >
                <DateCubicleGrid 
                  :cubicles="cubicles" 
                  :selected-date="selectedDateString"
                  :date-stats="dateStats"
                  :is-historical="isHistoricalDate"
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
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
    
    // Reactive state - enhanced with operation-specific loading states
    const cubicles = ref([]);
    const dateStats = ref(null);
    const loading = ref({
      data: false,
      reserve: false,
      cancel: false,
      update: false
    });
    const error = ref(null);
    const showCounts = ref(false);
    const socket = ref(null);
    const gridContainer = ref(null);

    // Notification system for user feedback
    const notification = ref({
      show: false,
      type: 'info', // 'success', 'warning', 'error', 'info'
      title: '',
      message: ''
    });

    // Timer management for proper cleanup
    let socketUpdateTimeout = null;
    let errorDismissTimeout = null;
    let notificationTimeout = null;

    // Computed properties - matching original (keeping the ones not in date store)
    const minDate = computed(() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // 30 days back for historical viewing
      const year = thirtyDaysAgo.getFullYear();
      const month = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
      const day = String(thirtyDaysAgo.getDate()).padStart(2, '0');
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
    
    // Check if selected date is in the past (for historical viewing mode)
    const isHistoricalDate = computed(() => {
      const today = new Date();
      const selectedDate = new Date(selectedDateString.value + 'T00:00:00');
      today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
      selectedDate.setHours(0, 0, 0, 0);
      return selectedDate < today;
    });

    /**
     * Fetch Cubicles for Date
     * 
     * Primary data fetching function that retrieves cubicles and statistics
     * for a specific date with comprehensive error handling and authentication.
     * 
     * @async
     * @function fetchCubiclesForDate
     * @param {Date} date - The date to fetch cubicles for (defaults to selectedDate)
     * @returns {Promise<void>}
     * 
     * @throws {Error} Authentication errors with automatic token refresh
     * @throws {Error} Rate limiting errors with auto-retry mechanism
     * @throws {Error} Network errors with user-friendly messages
     */
    const fetchCubiclesForDate = async (date = selectedDate.value) => {
      error.value = null;
      
      // Add a small delay before showing loading state to prevent flicker on fast responses
      const loadingTimeout = setTimeout(() => {
        loading.value.data = true;
      }, 150);
      
      try {
        // Get authentication token from centralized auth management
        const idToken = token.value;
        if (!idToken) {
          clearTimeout(loadingTimeout);
          showErrorWithTimeout('Authentication required', 8000);
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
            showErrorWithTimeout('Authentication failed. Please log in again.', 10000);
          }
        }
        // Handle rate limiting specifically
        else if (err.response?.status === 429) {
          showErrorWithTimeout('Too many requests. Please wait a moment and try again.', 6000);
        } else {
          showErrorWithTimeout(err.response?.data?.error || 'Failed to load cubicles', 8000);
        }
      } finally {
        clearTimeout(loadingTimeout);
        loading.value.data = false;
      }
    };

    // Silent refresh function that doesn't show loading state
    const refreshDataSilently = async (date = selectedDate.value) => {
      try {
        // Get authentication token from centralized auth management
        const idToken = token.value;
        if (!idToken) {
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
        // If the refresh fails, we should at least preserve the existing data
        // rather than clearing it completely
        if (err.response?.status === 401) {
          showErrorWithTimeout('Authentication expired. Please login again.', 10000);
        } else if (err.response?.status === 403) {
          showErrorWithTimeout('Access denied. Insufficient permissions.', 8000);
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
      
      // Wait for the next tick to ensure the date has been updated
      await nextTick();
      
      // Use smooth refresh with the updated date
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
        showErrorWithTimeout('Failed to refresh cubicles', 6000);
      }
    };

    /**
     * Handle Cubicle Reservation
     * 
     * Manages cubicle reservation process with optimistic UI updates,
     * comprehensive error handling, and scroll position preservation.
     * 
     * @async
     * @function handleReserve
     * @param {string|Object} reservationData - The cubicle ID or reservation data object
     * @param {string} reservationData.cubicleId - The ID of the cubicle to reserve
     * @param {string} [reservationData.assignedEmail] - Optional email to assign for notifications
     * @returns {Promise<void>}
     * 
     * @features
     * - Optimistic UI updates for immediate feedback
     * - Automatic rollback on operation failure
     * - Scroll position preservation during updates
     * - Comprehensive error handling with user notifications
     * - Support for email assignment notifications
     */
    const handleReserve = async (reservationData) => {
      loading.value.reserve = true;
      
      try {
        // Handle both old (string) and new (object) parameter formats
        let cubicleId, assignedEmail;
        if (typeof reservationData === 'string') {
          cubicleId = reservationData;
          assignedEmail = null;
        } else {
          cubicleId = reservationData.cubicleId;
          assignedEmail = reservationData.assignedEmail;
        }
        
        // Get authentication token from centralized auth management
        const idToken = token.value;
        if (!idToken) {
          showErrorWithTimeout('Authentication required', 8000);
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
              },
              assignedEmail: assignedEmail
            }
          };
        }
        
        // Format date properly to avoid timezone issues
        const year = selectedDate.value.getFullYear();
        const month = String(selectedDate.value.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.value.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        // Prepare request body
        const requestBody = { cubicleId };
        if (assignedEmail) {
          requestBody.assignedEmail = assignedEmail;
        }
        
        await axios.post(`${getApiBaseUrl()}/api/cubicles/reserve/date/${dateString}`, requestBody, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        
        // Silently refresh data without loading state
        await refreshDataSilently();
        
        // Show success notification if email assignment was used
        if (assignedEmail) {
          showNotification(
            'success',
            'Reservation Successful',
            `Cubicle reserved with email assignment to ${assignedEmail}. They will be notified when the reservation is completed.`,
            7000
          );
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
        
        // Enhanced error handling with detailed logging
        let errorMessage = 'Failed to reserve cubicle';
        
        // Log the error for debugging
        console.error('Reservation Error:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message,
          cubicleId
        });
        
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response?.data?.errors) {
          // Handle validation errors array
          const validationErrors = err.response.data.errors.map(e => e.msg || e.message).join(', ');
          errorMessage = `Validation error: ${validationErrors}`;
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
        
        showErrorWithTimeout(errorMessage, 8000);
      } finally {
        loading.value.reserve = false;
      }
    };

    /**
     * Handle Reservation Cancellation
     * 
     * Manages reservation cancellation with optimistic UI updates,
     * comprehensive error handling, and scroll position preservation.
     * 
     * @async
     * @function handleCancel
     * @param {string} reservationId - The ID of the reservation to cancel
     * @returns {Promise<void>}
     * 
     * @features
     * - Optimistic UI updates for immediate feedback
     * - Automatic rollback on operation failure
     * - Scroll position preservation during updates
     * - Comprehensive error handling with user notifications
     */
    const handleCancel = async (reservationId) => {
      loading.value.cancel = true;
      
      try {
        // Get authentication token from centralized auth management
        const idToken = token.value;
        if (!idToken) {
          showErrorWithTimeout('Authentication required', 8000);
          return;
        }
        
        // Find the cubicle with this reservation and optimistically update
        const cubicleIndex = cubicles.value.findIndex(c => 
          c.reservationInfo && c.reservationInfo._id === reservationId
        );
        
        let originalReservationInfo = null;
        if (cubicleIndex !== -1) {
          originalReservationInfo = cubicles.value[cubicleIndex].reservationInfo;
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
        
      } catch (err) {
        // Revert optimistic update on error
        if (cubicleIndex !== -1 && originalReservationInfo) {
          cubicles.value[cubicleIndex] = {
            ...cubicles.value[cubicleIndex],
            dateStatus: 'reserved',
            reservationInfo: originalReservationInfo
          };
        } else {
          // If we can't revert, refresh the data
          await refreshDataSilently();
        }
        
        // Enhanced error handling without debug logs
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
        
        showErrorWithTimeout(errorMessage, 8000);
      } finally {
        loading.value.cancel = false;
      }
    };

    const toggleLegendCounts = () => {
      showCounts.value = !showCounts.value;
    };

    /**
     * Navigate to Statistics View
     * 
     * Navigates to StatisticsView while preserving the currently
     * selected date for consistent user experience across views.
     * 
     * @function goToStatistics
     */
    const goToStatistics = async () => {
      try {
        // Pass the currently selected date to StatisticsView using the global date store
        const dateToUse = await getRouteDate();
        if (dateToUse) {
          router.push(`/statistics/${dateToUse}`);
        } else {
          router.push('/statistics');
        }
      } catch (error) {
        console.error('Error getting route date for statistics navigation:', error);
        // Fallback to base statistics route
        router.push('/statistics');
      }
    };

    /**
     * Setup WebSocket Connection
     * 
     * Establishes real-time connection for live reservation updates with
     * date-specific filtering and debounced refresh to prevent rate limiting.
     * 
     * @function setupSocket
     */
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
        await initializeFromRoute(route.params.date);
      }
      
      // Fetch initial data using current global date
      await fetchCubiclesForDate(selectedDate.value);
      setupSocket();
    });

    onUnmounted(() => {
      if (socket.value) {
        socket.value.disconnect();
      }
      cleanupTimers();
    });

    // Watch for global date string changes and refetch data
    watch(selectedDateString, async (newDateString) => {
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
          showErrorWithTimeout('Authentication required', 8000);
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
        showErrorWithTimeout(err.response?.data?.error || 'Failed to update cubicle state', 8000);
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

    /**
     * Scroll Position Preservation Utility
     * 
     * Wraps async operations to preserve grid scroll position for seamless UX.
     * Prevents jarring user experience during data updates and operations.
     * 
     * @async
     * @function withScrollPreservation
     * @param {Function} asyncOperation - The async operation to execute
     * @returns {Promise<void>}
     */
    const withScrollPreservation = async (asyncOperation) => {
      const scrollContainer = gridContainer.value;
      const scrollTop = scrollContainer?.scrollTop || 0;
      const scrollLeft = scrollContainer?.scrollLeft || 0;
      
      await asyncOperation();
      
      // Restore scroll position with a small delay to ensure DOM updates
      if (scrollContainer) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = scrollTop;
          scrollContainer.scrollLeft = scrollLeft;
        });
      }
    };

    /**
     * Error Display with Auto-Dismissal
     * 
     * Shows user-friendly error messages with automatic dismissal to prevent
     * persistent error states and improve user experience.
     * 
     * @function showErrorWithTimeout
     * @param {string} message - Error message to display
     * @param {number} duration - Auto-dismiss duration in milliseconds (default: 5000)
     */
    const showErrorWithTimeout = (message, duration = 5000) => {
      // Clear any existing timeout
      if (errorDismissTimeout) {
        clearTimeout(errorDismissTimeout);
      }
      
      error.value = message;
      
      // Auto-dismiss error after specified duration
      errorDismissTimeout = setTimeout(() => {
        error.value = null;
      }, duration);
    };

    /**
     * Show User Notification
     * 
     * Displays user-friendly notifications with automatic dismissal.
     * Supports different notification types for various scenarios.
     * 
     * @param {string} type - Notification type ('success', 'warning', 'error', 'info')
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {number} duration - Auto-dismiss duration in milliseconds (default: 5000)
     */
    const showNotification = (type, title, message, duration = 5000) => {
      // Clear any existing notification timeout
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
      
      notification.value = {
        show: true,
        type,
        title,
        message
      };
      
      // Auto-dismiss notification
      notificationTimeout = setTimeout(() => {
        notification.value.show = false;
      }, duration);
    };

    /**
     * Dismiss Notification
     * 
     * Manually dismisses the current notification and clears timeout.
     */
    const dismissNotification = () => {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
      notification.value.show = false;
    };

    /**
     * Debounced Socket Update Handler
     * 
     * Prevents excessive API calls from rapid WebSocket events by implementing
     * a debounce mechanism with configurable delay.
     * 
     * @function debouncedSocketUpdate
     * @param {Function} updateFunction - The update function to debounce
     * @param {number} delay - Debounce delay in milliseconds (default: 1000)
     */
    const debouncedSocketUpdate = (updateFunction, delay = 1000) => {
      if (socketUpdateTimeout) {
        clearTimeout(socketUpdateTimeout);
      }
      socketUpdateTimeout = setTimeout(updateFunction, delay);
    };

    /**
     * Cleanup Timers
     * 
     * Cleans up all active timers to prevent memory leaks and ensure
     * proper resource management during component lifecycle.
     * 
     * @function cleanupTimers
     */
    const cleanupTimers = () => {
      if (socketUpdateTimeout) {
        clearTimeout(socketUpdateTimeout);
        socketUpdateTimeout = null;
      }
      if (errorDismissTimeout) {
        clearTimeout(errorDismissTimeout);
        errorDismissTimeout = null;
      }
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
      }
    };
    
    // Watch for historical date changes and show notification
    watch(isHistoricalDate, (isHistorical) => {
      if (isHistorical) {
        showNotification('info', 'Historical View Mode', 
          `You are viewing cubicle reservations for ${formatDisplayDate(selectedDateString.value)}. Editing is disabled for past dates.`, 
          8000);
      }
    }, { immediate: true }); // Check immediately on component mount

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
      isHistoricalDate,
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
      // Utility functions
      withScrollPreservation,
      showErrorWithTimeout,
      debouncedSocketUpdate,
      cleanupTimers,
      // Notification system
      notification,
      showNotification,
      dismissNotification,
      // Auth error management
      authError,
      clearError,
      refreshToken
    };
  }
};
</script>