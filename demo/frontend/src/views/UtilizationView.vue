<!--
===================================================================
VIEWS: UtilizationView
===================================================================
PURPOSE: 
Main view component for displaying utilization reports and analytics dashboard.
Provides comprehensive cubicle usage statistics with data visualization, 
report generation capabilities, and interactive filtering options.

FEATURES:
- Real-time utilization data display with interactive cards
- Date-based filtering with calendar picker integration
- Report generation for current and custom date ranges
- Excel export functionality for detailed analysis
- Pagination support for large datasets
- Loading states with timeout handling to prevent infinite loading
- Comprehensive error handling with user-friendly notifications
- Responsive design optimized for all device sizes
- Integration with IBM Carbon Design System components

INTEGRATION:
- Route: /utilization/:date? (supports optional date parameter)
- Authentication: Requires valid Firebase auth token
- API Dependencies: /api/utilization-reports endpoints
- Global State: Uses useDateStore for date management
- Components: PageHeader, AnalyticsCarousel, IBM Carbon components

CORE FUNCTIONALITY:
1. **Data Fetching**: Retrieves utilization reports with pagination
2. **Report Generation**: Creates new reports for specified dates
3. **Date Management**: Handles date selection and validation
4. **Export Features**: Supports Excel export of report data
5. **Real-time Updates**: Auto-refreshes data after report generation

DATA FLOW:
- selectedDate (from global store) → API params → backend query
- API response → reports array → UI components
- User interactions → loading states → API calls → UI updates

ERROR HANDLING:
- Network failures with retry suggestions
- Invalid date formats with validation messages
- Authentication errors with login redirects
- Rate limiting with appropriate user feedback
- Empty states with actionable guidance

PERFORMANCE OPTIMIZATIONS:
- Debounced API calls to prevent excessive requests
- Loading timeouts to handle slow network conditions
- Efficient re-rendering with Vue 3 reactivity
- Lazy loading of heavy components
- Optimized date formatting to avoid timezone issues

ACCESSIBILITY:
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader announcements for loading states
- High contrast color schemes
- Focus management for modal interactions

DEPENDENCIES:
- Vue 3 Composition API with reactivity
- IBM Carbon Design System components
- Axios for HTTP requests
- Firebase Authentication
- Global date store (useDateStore)
- Utility functions for date handling and error management

LAST UPDATED: June 2025
===================================================================
-->

<template>
  <div class="utilization-container">
    <!-- Simple Consistent Header Component -->
    <PageHeader
      title="Utilization Reports"
      subtitle="Daily cubicle usage analytics and historical trends"
    />
    
    <!-- Main Reports Dashboard -->
    <cv-grid class="utilization-grid">
      <!-- Report Controls Row - Status Legend Style -->
      <cv-row class="controls-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile class="controls-tile-legend">
            <div class="controls-legend-layout">
              <div class="controls-title-section">
                <h3 class="controls-legend-title">REPORT CONTROLS</h3>
              </div>
              <div class="controls-buttons-section">
                <div class="control-item" v-if="isAdminUser">
                  <cv-button 
                    @click="generateCurrentDayReport" 
                    kind="primary" 
                    size="md"
                    :disabled="loading.generateCurrent"
                    class="control-button-legend"
                    style="width: 100% !important; display: block !important; min-width: 100% !important;"
                  >
                    <span v-if="loading.generateCurrent">Generating...</span>
                    <span v-else>Generate Date Report</span>
                  </cv-button>
                </div>
                
                <div class="control-item">
                  <cv-button 
                    @click="refreshReports" 
                    kind="tertiary" 
                    size="md"
                    :disabled="loading.refresh"
                    class="control-button-legend"
                    style="width: 100% !important; display: block !important; min-width: 100% !important;"
                  >
                    <span v-if="loading.refresh">Refreshing...</span>
                    <span v-else>Refresh Reports</span>
                  </cv-button>
                </div>
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- Main Content Row - Reports and Stats Side by Side -->
      <cv-row class="main-content-row">
        <!-- Available Reports - Left Side -->
        <cv-column :sm="4" :md="8" :lg="8">
          <cv-tile class="reports-tile">
            <div class="tile-header">
              <div class="tile-title-section">
                <h3 class="tile-title">Available Reports</h3>
              </div>
              <p class="tile-subtitle">
                Historical utilization reports with export options
              </p>
            </div>
            
            <!-- Pagination Controls -->
            <div class="pagination-controls" v-if="filteredPagination.totalPages > 1">
              <cv-pagination 
                v-model="currentPage"
                :number-of-items="filteredPagination.totalReports"
                :page-size="pageSize"
                :page-sizes="[5, 10, 20]"
                @change="handlePaginationChange"
              />
            </div>
            
            <!-- Reports Cards -->
            <div class="reports-container">
              <div v-if="filteredReports.length > 0" class="reports-grid">
                <div 
                  v-for="report in filteredReports" 
                  :key="report._id"
                  class="report-card"
                  :class="{ 'latest-report': report === latestReport }"
                >
                  <!-- Report Header -->
                  <div class="report-header">
                    <div class="report-period">
                      <h4 class="report-date-label">{{ formatReportDate(report) }}</h4>
                      <span class="generated-date">Generated: {{ formatDateTime(report.generatedAt) }}</span>
                      <span v-if="report === latestReport" class="latest-badge">Latest</span>
                    </div>
                    <div class="utilization-indicator">
                      <div class="utilization-circle" :class="getUtilizationClass(report.summary.avgUtilization)">
                        <span class="utilization-percentage">{{ report.summary.avgUtilization }}%</span>
                      </div>
                    </div>
                  </div>

                  <!-- Report Stats -->
                  <div class="report-stats">
                    <div class="stat-row">
                      <div class="stat-group">
                        <div class="stat-item-mini">
                          <span class="mini-label">Peak</span>
                          <span class="mini-value">{{ report.summary.peakUtilization }}%</span>
                        </div>
                        <div class="stat-item-mini">
                          <span class="mini-label">Reservations</span>
                          <span class="mini-value">{{ report.summary.totalReservations }}</span>
                        </div>
                      </div>
                      <div class="stat-group">
                        <div class="stat-item-mini">
                          <span class="mini-label">Users</span>
                          <span class="mini-value">{{ report.summary.uniqueUsers }}</span>
                        </div>
                        <div class="stat-item-mini">
                          <span class="mini-label">Errors</span>
                          <span class="mini-value error-count" :class="{ 'has-errors': report.summary.errorIncidents > 0 }">
                            {{ report.summary.errorIncidents }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Utilization Bar -->
                  <div class="utilization-bar-container">
                    <div class="utilization-bar">
                      <div 
                        class="utilization-fill" 
                        :style="{ width: report.summary.avgUtilization + '%' }"
                        :class="getUtilizationClass(report.summary.avgUtilization)"
                      ></div>
                    </div>
                    <div class="utilization-range">
                      <span class="range-min">{{ report.summary.lowestUtilization }}%</span>
                      <span class="range-label">Range</span>
                      <span class="range-max">{{ report.summary.peakUtilization }}%</span>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="report-actions">
                    <cv-button 
                      @click="viewReport(report)" 
                      kind="ghost" 
                      size="sm"
                      class="report-action-btn"
                    >
                      <template #icon>
                        <View16 />
                      </template>
                      View Details
                    </cv-button>
                    <cv-button 
                      @click="exportReport(report)" 
                      kind="ghost" 
                      size="sm"
                      :disabled="loading.export === report._id"
                      class="report-action-btn"
                    >
                      <template #icon>
                        <Download16 />
                      </template>
                      <span v-if="loading.export === report._id">Exporting...</span>
                      <span v-else>Export</span>
                    </cv-button>
                    <cv-button 
                      v-if="isAdminUser"
                      @click="deleteReport(report)" 
                      kind="danger--ghost" 
                      size="sm"
                      :disabled="loading.delete === report._id"
                      class="report-action-btn delete-btn"
                    >
                      <template #icon>
                        <TrashCan16 />
                      </template>
                      <span v-if="loading.delete === report._id">Deleting...</span>
                      <span v-else>Delete</span>
                    </cv-button>
                  </div>
                </div>
              </div>
              
              <div v-else-if="loading.reports" class="table-loading">
                <cv-skeleton-text :paragraph="true" :line-count="5" />
              </div>
              
              <div v-else class="no-data-state">
                <div class="empty-state-content">
                  <h4 class="empty-state-title">No Reports Available for Selected Date</h4>
                  <p class="empty-state-description">
                    No reports found for {{ formatDisplayDate(selectedDateString) }}. Generate a report for this date or select a different date.
                  </p>
                </div>
              </div>
            </div>
          </cv-tile>
        </cv-column>
        
        <!-- Quick Statistics - Right Side (Smaller) -->
        <cv-column :sm="4" :md="4" :lg="4">
          <cv-tile class="quick-stats-tile">
            <div class="tile-header">
              <h3 class="tile-title">Quick Statistics</h3>
              <p class="tile-subtitle">Latest report insights</p>
            </div>
            <div class="quick-stats-content">
              <!-- Analytics Carousel Component -->
              <AnalyticsCarousel
                v-if="latestReport"
                :stats="carouselStats"
                :interval="3000"
                :auto-rotate="true"
                @stat-changed="onStatChanged"
              />
              
              <!-- No Data State for Statistics -->
              <div v-else class="no-data-state">
                <div class="empty-state-content">
                  <h4 class="empty-state-title">No Statistics Available</h4>
                  <p class="empty-state-description">Statistics will appear here once you generate your first report.</p>
                </div>
              </div>
              
              <!-- Download Button - Always Present -->
              <div class="quick-stats-download">
                <cv-button 
                  @click="exportLatestReport" 
                  kind="primary" 
                  size="lg"
                  :disabled="loading.exportLatest"
                  class="control-button-consistent download-button-centered"
                  style="width: 100% !important; display: block !important; min-width: 100% !important;"
                >
                  <template #icon>
                    <Download16 />
                  </template>
                  <span v-if="loading.exportLatest">Downloading...</span>
                  <span v-else>Download Latest Report</span>
                </cv-button>
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- Report Details Modal -->
      <cv-modal
        :visible="showReportModal"
        kind="default"
        size="lg"
        :auto-hide-off="true"
        @modal-hide-request="closeReportModal"
        @primary-click="closeReportModal"
      >
        <template v-slot:label>Utilization Report</template>
        <template v-slot:title>
          Report for {{ selectedReport ? formatDate(selectedReport.reportStartDate) : '' }}
        </template>
        <template v-slot:content>
          <div v-if="selectedReport" class="report-details">
            <!-- Summary Section -->
            <div class="report-section">
              <h4 class="section-title">Summary Statistics</h4>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Total Cubicles</span>
                  <span class="summary-value">{{ selectedReport.summary.totalCubicles }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Average Utilization</span>
                  <span class="summary-value">{{ selectedReport.summary.avgUtilization }}%</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Peak Utilization</span>
                  <span class="summary-value">{{ selectedReport.summary.peakUtilization }}%</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Total Reservations</span>
                  <span class="summary-value">{{ selectedReport.summary.totalReservations }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Unique Users</span>
                  <span class="summary-value">{{ selectedReport.summary.uniqueUsers }}</span>
                </div>
              </div>
            </div>
            
            <!-- Daily Breakdown -->
            <div class="report-section">
              <h4 class="section-title">Daily Breakdown</h4>
              <div class="daily-chart-container">
                <cv-progress-bar 
                  v-for="day in selectedReport.daily" 
                  :key="day.date"
                  :value="day.utilizationPercent" 
                  :label="`${day.dayOfWeek}: ${day.utilizationPercent}%`"
                  :kind="getUtilizationKind(day.utilizationPercent)"
                  size="md"
                  class="daily-progress"
                />
              </div>
            </div>
            
            <!-- Section Analysis -->
            <div class="report-section" v-if="selectedReport.sections.length > 0">
              <h4 class="section-title">Section Analysis</h4>
              <div class="sections-grid">
                <div 
                  v-for="section in selectedReport.sections" 
                  :key="section.section"
                  class="section-card"
                >
                  <h5 class="section-name">Section {{ section.section }}</h5>
                  <div class="section-stats">
                    <span class="section-stat">{{ section.totalCubicles }} cubicles</span>
                    <span class="section-stat">{{ section.avgUtilization }}% avg</span>
                    <span class="section-stat">{{ section.totalReservations }} reservations</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Top Users -->
            <div class="report-section" v-if="selectedReport.users.length > 0">
              <h4 class="section-title">Top Users (by reservations)</h4>
              <div class="users-list">
                <div 
                  v-for="user in selectedReport.users.slice(0, 5)" 
                  :key="user.email"
                  class="user-item"
                >
                  <span class="user-email">{{ user.email }}</span>
                  <span class="user-stats">
                    {{ user.totalReservations }} reservations, 
                    {{ user.daysActive }} days active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <template v-slot:primary-button>Close</template>
      </cv-modal>
      
      <!-- Search Day Modal -->
      <cv-modal
        :visible="showSearchDayModal"
        kind="default"
        size="md"
        :auto-hide-off="true"
        @modal-hide-request="closeSearchDayModal"
        @primary-click="handleSearchDayModalAction"
        @secondary-click="closeSearchDayModal"
      >
        <template v-slot:label>
          Search Reports
        </template>
        <template v-slot:title>
          Search Reports for Specific Date
        </template>
        <template v-slot:content>
          <div class="search-date-form">
            <p class="form-description">
              Select a date to view all available reports for that day.
            </p>
            
            <cv-date-picker
              v-model="searchDayDate"
              kind="single"
              :date-format="dateFormat"
              placeholder="Select date (YYYY-MM-DD)"
              @change="onModalDateChange"
            >
              <cv-date-picker-input
                label="Select Date"
                placeholder="YYYY-MM-DD"
              />
            </cv-date-picker>
          </div>
        </template>
        <template v-slot:primary-button>
          <span v-if="customDayStart">Generate Report</span>
          <span v-else>Select Date</span>
        </template>
        <template v-slot:secondary-button>Cancel</template>
      </cv-modal>
      
      <!-- Error/Success Messages -->
      <cv-toast-notification
        v-if="notification.show"
        :kind="notification.kind"
        :title="notification.title"
        :subtitle="notification.subtitle"
        :close-aria-label="'Close notification'"
        @close="notification.show = false"
        class="utilization-toast"
      />
    </cv-grid>
  </div>
</template>

<script>
import axios from 'axios';
import useAuth from '../composables/useAuth';
import { useDateStore } from '../composables/useDateStore';
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import Download16 from '@carbon/icons-vue/lib/download/16';
import View16 from '@carbon/icons-vue/lib/view/16';
import TrashCan16 from '@carbon/icons-vue/lib/trash-can/16';
import PageHeader from '../components/PageHeader.vue';
import AnalyticsCarousel from '../components/AnalyticsCarousel.vue';
import { isAdminUid } from '../utils/envUtils';
import './styles/UtilizationViewStyles.css';

export default {
  name: 'UtilizationView',
  components: {
    Download16,
    View16,
    TrashCan16,
    PageHeader,
    AnalyticsCarousel
  },
  setup() {
    const { currentUser, isAdmin, token, authError, clearError, refreshToken } = useAuth();
    const route = useRoute();
    const {
      selectedDate,
      selectedDateInput,
      selectedDateString,
      setSelectedDate,
      initializeFromRoute
    } = useDateStore();

    const isAdminUser = computed(() => {
      if (!currentUser.value) return false;
      
      // First check Firebase custom claims (preferred method)
      if (isAdmin.value) return true;
      
      // Fallback to environment variable UIDs using centralized utility
      return isAdminUid(currentUser.value.uid);
    });

    return { 
      isAdminUser, 
      currentUser, 
      token,
      route,
      selectedDate,
      selectedDateInput,
      selectedDateString,
      setSelectedDate,
      initializeFromRoute,
      // Auth error management
      authError,
      clearError,
      refreshToken
    };
  },
  data() {
    return {
      reports: [],
      selectedReport: null,
      latestReport: null,
      showReportModal: false,
      showCustomDayModal: false,
      currentPage: 1,
      pageSize: 10,
      pagination: {
        totalReports: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      },
      loading: {
        reports: false,
        generateCurrent: false,
        generateCustom: false,
        refresh: false,
        export: null,
        delete: null,
        exportLatest: false
      },
      customDayStart: '',
      dateFormat: 'Y-m-d',
      notification: {
        show: false,
        kind: 'success',
        title: '',
        subtitle: ''
      },
      // Loading timeout configuration
      loadingTimeouts: {
        reports: 30000,     // 30 seconds for report fetching
        generate: 60000,    // 60 seconds for report generation
        export: 45000,      // 45 seconds for export operations
        delete: 15000       // 15 seconds for delete operations
      },
      // Active timeout references for cleanup
      activeTimeouts: new Map()
    };
  },
  computed: {
    // Filter reports by current selected date
    filteredReports() {
      const currentDate = this.selectedDateString; // From global dateStore
      if (!currentDate) return this.reports; // If no date selected, show all reports
      
      return this.reports.filter(report => {
        try {
          // Check if report exists and has either reportDate or reportStartDate
          if (!report) {
            return false;
          }
          
          // Try reportDate first, then reportStartDate as fallback
          const dateToCheck = report.reportDate || report.reportStartDate;
          if (!dateToCheck) {
            return false;
          }
          
          // Create date object and validate it
          const reportDateObj = new Date(dateToCheck);
          if (isNaN(reportDateObj.getTime())) {
            console.warn('Invalid report date found:', dateToCheck);
            return false;
          }
          
          // Parse the report date and compare with current selected date
          const reportDate = reportDateObj.toISOString().split('T')[0];
          return reportDate === currentDate;
        } catch (error) {
          console.error('Error parsing report date:', error, report);
          return false;
        }
      });
    },
    // Update pagination info based on filtered reports
    filteredPagination() {
      try {
        const totalReports = this.filteredReports ? this.filteredReports.length : 0;
        const totalPages = Math.ceil(totalReports / this.pageSize) || 1;
        return {
          totalReports,
          totalPages,
          hasNext: this.currentPage < totalPages,
          hasPrev: this.currentPage > 1
        };
      } catch (error) {
        console.error('Error calculating filtered pagination:', error);
        return {
          totalReports: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        };
      }
    },
    carouselStats() {
      if (!this.latestReport) return [];
      return [
        {
          label: 'Average Utilization',
          value: `${this.latestReport.summary.avgUtilization}%`,
          indicatorClass: 'utilization-avg'
        },
        {
          label: 'Peak Utilization',
          value: `${this.latestReport.summary.peakUtilization}%`,
          indicatorClass: 'utilization-peak'
        },
        {
          label: 'Total Reservations',
          value: this.latestReport.summary.totalReservations,
          indicatorClass: 'reservations'
        },
        {
          label: 'Unique Users',
          value: this.latestReport.summary.uniqueUsers,
          indicatorClass: 'users'
        }
      ];
    }
  },
  async mounted() {
    // Initialize date from route parameter if available (similar to StatisticsView)
    if (this.route.params.date && typeof this.route.params.date === 'string') {
      await this.initializeFromRoute(this.route.params.date);
    }

    await this.fetchReports();
  },
  watch: {
    // Watch for route parameter changes and update global store
    async '$route.params.date'(newDate) {
      if (newDate && typeof newDate === 'string') {
        await this.setSelectedDate(newDate);
        // Refetch reports after date change
        await this.fetchReports();
      }
    },
    // Watch for selected date changes and refetch reports
    selectedDateString(newDate, oldDate) {
      if (newDate !== oldDate) {
        this.setLatestReportForSelectedDate();
      }
    }
  },
  beforeUnmount() {
    // Clean up all active timeouts to prevent memory leaks
    this.activeTimeouts.forEach((timeoutId, operationKey) => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();
  },
  methods: {
    /**
     * Handle Analytics Carousel Stat Change
     * 
     * Handles stat change events from the AnalyticsCarousel component.
     * 
     * @method onStatChanged
     * @param {number} index - Index of the newly displayed stat
     * @returns {void}
     * 
     * @description
     * Called when the analytics carousel rotates to a new statistic.
     * Currently used for debugging and could be extended for analytics tracking.
     * 
     * @example
     * // Template usage in AnalyticsCarousel:
     * // @stat-changed="onStatChanged"
     */
    onStatChanged(index) {
      // Handle stat change event from AnalyticsCarousel if needed
    },
    /**
     * Centralized Error Handler
     * 
     * Processes API errors and displays appropriate user notifications with
     * standardized error handling patterns.
     * 
     * @method handleApiError
     * @param {Error} error - The error object from the API call
     * @param {string} operation - Description of the operation that failed
     * @param {Object} options - Additional options for error handling
     * @param {boolean} options.showGenericError - Whether to show generic error for unknown errors
     * @param {string} options.genericMessage - Custom generic error message
     * @returns {void}
     * 
     * @description
     * Centralizes error handling logic for all API operations. Provides consistent
     * error messages and logging for different HTTP status codes and error types.
     * 
     * @example
     * try {
     *   await axios.get('/api/reports');
     * } catch (error) {
     *   this.handleApiError(error, 'fetching reports');
     * }
     */
    handleApiError(error, operation, options = {}) {
      const {
        showGenericError = true,
        genericMessage = `Failed to ${operation}`
      } = options;
      
      console.error(`UtilizationView - Error ${operation}:`, error);
      console.error('UtilizationView - Error response:', error.response);
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
          case 401:
            this.showNotification('error', 'Authentication Required', 
              'Please log in to continue.');
            break;
          case 403:
            this.showNotification('error', 'Access Denied', 
              'You do not have permission to perform this action.');
            break;
          case 404:
            this.showNotification('error', 'Not Found', 
              'The requested resource was not found.');
            break;
          case 400:
            const message = data?.error || 'Invalid request';
            this.showNotification('error', 'Invalid Request', message);
            break;
          case 429:
            const rateLimitMessage = data?.error || 
              'Too many requests. Please wait a few minutes before trying again.';
            this.showNotification('error', 'Rate Limit Exceeded', rateLimitMessage);
            break;
          case 500:
          default:
            if (showGenericError) {
              const serverMessage = data?.error || genericMessage;
              this.showNotification('error', 'Server Error', serverMessage);
            }
            break;
        }
      } else if (error.request) {
        // Network error
        this.showNotification('error', 'Network Error', 
          'Unable to connect to the server. Please check your connection.');
      } else {
        // Other error
        if (showGenericError) {
          this.showNotification('error', 'Error', genericMessage);
        }
      }
    },

    /**
     * Set Loading Timeout
     * 
     * Sets a timeout for loading operations to prevent infinite loading states
     * and provides user feedback for long-running operations.
     * 
     * @method setLoadingTimeout
     * @param {string} operationKey - Key identifying the loading operation
     * @param {number} timeout - Timeout duration in milliseconds
     * @param {Function} callback - Function to call when timeout expires
     * @returns {void}
     * 
     * @description
     * Manages loading timeouts to ensure good user experience by preventing
     * infinite loading states. Automatically cleans up timeouts and provides
     * user feedback when operations take too long.
     * 
     * @example
     * this.setLoadingTimeout('reports', 30000, () => {
     *   this.loading.reports = false;
     *   this.showNotification('warning', 'Timeout', 'Operation took too long');
     * });
     */
    setLoadingTimeout(operationKey, timeout, callback) {
      // Clear any existing timeout for this operation
      this.clearLoadingTimeout(operationKey);
      
      const timeoutId = setTimeout(() => {
        console.warn(`UtilizationView - Operation timeout: ${operationKey}`);
        callback();
        this.activeTimeouts.delete(operationKey);
      }, timeout);
      
      this.activeTimeouts.set(operationKey, timeoutId);
    },

    /**
     * Clear Loading Timeout
     * 
     * Clears a specific loading timeout to prevent it from executing.
     * 
     * @method clearLoadingTimeout
     * @param {string} operationKey - Key identifying the loading operation
     * @returns {void}
     * 
     * @description
     * Cancels a previously set loading timeout when an operation completes
     * successfully before the timeout expires.
     * 
     * @example
     * // Clear timeout when operation completes
     * this.clearLoadingTimeout('reports');
     */
    clearLoadingTimeout(operationKey) {
      const timeoutId = this.activeTimeouts.get(operationKey);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.activeTimeouts.delete(operationKey);
      }
    },
    /**
     * Fetch Utilization Reports
     * 
     * Retrieves paginated utilization reports from the backend API with proper
     * error handling and loading state management.
     * 
     * @method fetchReports
     * @async
     * @returns {Promise<void>}
     * 
     * @description
     * This method fetches utilization reports from the API with pagination support.
     * It handles various error states gracefully and updates the component's
     * reports list and pagination information. Also sets the latest report for
     * the selected date.
     * 
     * @throws {Error} API errors (401 Unauthorized, 404 Not Found, 500 Server Error)
     * 
     * @example
     * // Fetch reports on component mount
     * await this.fetchReports();
     * 
     * @see setLatestReportForSelectedDate
     */
    async fetchReports() {
      this.loading.reports = true;
      
      // Set loading timeout
      this.setLoadingTimeout('reports', this.loadingTimeouts.reports, () => {
        this.loading.reports = false;
        this.showNotification('warning', 'Slow Loading', 
          'Reports are taking longer than expected to load. Please try refreshing.');
      });
      
      try {
        const idToken = this.token;
        
        // Build query parameters - fetch all reports for the list
        const params = {
          page: this.currentPage,
          limit: this.pageSize
        };
        
        const response = await axios.get('/api/utilization-reports', {
          headers: { Authorization: `Bearer ${idToken}` },
          params
        });
        
        this.reports = response.data.data?.reports || [];
        this.pagination = response.data.data?.pagination || {
          totalReports: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        };
        
        
        // Set latest report for quick stats - find report for selected date
        this.setLatestReportForSelectedDate();
        
        // Clear timeout on success
        this.clearLoadingTimeout('reports');
      } catch (error) {
        this.clearLoadingTimeout('reports');
        
        // Handle 404 as empty state (not an error)
        if (error.response && error.response.status === 404) {
          this.reports = [];
          this.latestReport = null;
          this.pagination = {
            totalReports: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          };
        } else {
          // Use centralized error handler for all other errors
          this.handleApiError(error, 'fetching utilization reports');
        }
      } finally {
        this.loading.reports = false;
      }
    },
    
    /**
     * Set Latest Report for Selected Date
     * 
     * Finds and sets a report matching the currently selected date for display
     * in the quick statistics section. Uses improved date comparison to avoid
     * timezone-related issues.
     * 
     * @method setLatestReportForSelectedDate
     * @returns {void}
     * 
     * @description
     * This function searches through the available reports to find one that matches
     * the currently selected date. It handles various date formats and ensures
     * accurate matching without timezone conversion issues.
     * 
     * @example
     * // Called when selectedDateString changes
     * this.setLatestReportForSelectedDate();
     * // Sets this.latestReport to matching report or null
     */
    setLatestReportForSelectedDate() {
      
      if (!this.selectedDateString || this.reports.length === 0) {
        this.latestReport = null;
        return;
      }
      
      // Find a report that matches the selected date using improved date comparison
      const selectedDateStr = this.selectedDateString;
      const matchingReport = this.reports.find(report => {
        const reportDate = report.reportStartDate;
        if (!reportDate) return false;
        
        // Improved date comparison - handle both string and Date formats
        let reportDateStr;
        if (typeof reportDate === 'string') {
          reportDateStr = reportDate.includes('T') ? reportDate.split('T')[0] : reportDate;
        } else if (reportDate instanceof Date) {
          reportDateStr = reportDate.toISOString().split('T')[0];
        } else {
          return false;
        }
        
        return reportDateStr === selectedDateStr;
      });
      
      if (matchingReport) {
        this.latestReport = matchingReport;
      } else {
        this.latestReport = null;
      }
    },
    
    /**
     * Generate Current Day Report
     * 
     * Generates a utilization report for the currently selected date with
     * comprehensive error handling and user feedback.
     * 
     * @method generateCurrentDayReport
     * @async
     * @returns {Promise<void>}
     * 
     * @description
     * Creates a new utilization report for the date currently selected in the
     * global date store. This method is restricted to admin users and provides
     * detailed error messages for various failure scenarios.
     * 
     * @throws {Error} API errors (401 Unauthorized, 400 Bad Request, 500 Server Error)
     * 
     * @example
     * // Generate report for selected date
     * await this.generateCurrentDayReport();
     * 
     * @see generateCustomDayFromModal
     * @see fetchReports
     */
    async generateCurrentDayReport() {
      this.loading.generateCurrent = true;
      
      // Set loading timeout for generation
      this.setLoadingTimeout('generateCurrent', this.loadingTimeouts.generate, () => {
        this.loading.generateCurrent = false;
        this.showNotification('warning', 'Generation Timeout', 
          'Report generation is taking longer than expected. Please try again.');
      });
      
      try {
        const idToken = this.token;
        
        // Use the raw date input with robust fallback system
        let dateToUse = this.selectedDateInput;
        
        
        // Fallback chain to ensure we always have a valid date
        if (!dateToUse || dateToUse === '') {
          dateToUse = this.selectedDateString;
        }
        
        if (!dateToUse || dateToUse === '') {
          if (this.selectedDate) {
            // Convert Date object to YYYY-MM-DD string
            const year = this.selectedDate.getFullYear();
            const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(this.selectedDate.getDate()).padStart(2, '0');
            dateToUse = `${year}-${month}-${day}`;
          }
        }
        
        if (!dateToUse || dateToUse === '') {
          if (this.route.params.date && typeof this.route.params.date === 'string') {
            dateToUse = this.route.params.date;
          }
        }
        
        // Final fallback to today's date
        if (!dateToUse || dateToUse === '') {
          const today = new Date();
          dateToUse = today.toISOString().split('T')[0];
        }
        
        // Validate date format before sending
        if (!dateToUse || typeof dateToUse !== 'string') {
          throw new Error('No date selected or invalid date format');
        }
        
        // Ensure date is in YYYY-MM-DD format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateToUse)) {
          throw new Error(`Invalid date format: ${dateToUse}. Expected YYYY-MM-DD format.`);
        }
        
        console.log('Generating report for date:', dateToUse);
        
        // Generate the report
        const requestConfig = {
          headers: { Authorization: `Bearer ${idToken}` },
          params: { reportDate: dateToUse }
        };
        
        const response = await axios.post('/api/utilization-reports/generate', {}, requestConfig);
        
        this.showNotification('success', 'Success', `Report generated successfully for ${dateToUse}`);
        
        // Clear timeout on success
        this.clearLoadingTimeout('generateCurrent');
        
        await this.fetchReports();
      } catch (error) {
        this.clearLoadingTimeout('generateCurrent');
        
        // Handle validation errors specifically
        if (error.message && error.message.includes('Invalid date format')) {
          this.showNotification('error', 'Invalid Date', error.message);
          return;
        }
        
        this.handleApiError(error, 'generating report for selected date', {
          showGenericError: true,
          genericMessage: 'Failed to generate report for selected date'
        });
      } finally {
        this.loading.generateCurrent = false;
      }
    },
    
    
    /**
     * Open Custom Day Modal
     * 
     * Opens the custom date selection modal and resets the date input for
     * a fresh user experience.
     * 
     * @method openCustomDayModal
     * @returns {void}
     * 
     * @description
     * Displays the modal dialog for custom date selection. Resets the date
     * input to ensure users must explicitly select a date.
     * 
     * @example
     * // Open modal when user clicks custom date button
     * this.openCustomDayModal();
     */
    openCustomDayModal() {
      this.showCustomDayModal = true;
      // Initialize empty to force user to select a date for generation
      this.customDayStart = '';
    },
    
    /**
     * Close Custom Day Modal
     * 
     * Closes the custom date selection modal and cleans up the date input state.
     * 
     * @method closeCustomDayModal
     * @returns {void}
     * 
     * @description
     * Hides the custom day modal and resets the date selection state to
     * prevent stale data from affecting future modal interactions.
     * 
     * @example
     * // Close modal on cancel or after successful generation
     * this.closeCustomDayModal();
     */
    closeCustomDayModal() {
      this.showCustomDayModal = false;
      this.customDayStart = '';
    },
    
    /**
     * Generate Custom Day Report from Modal
     * 
     * Generates a utilization report for the date selected in the custom day modal
     * with validation and comprehensive error handling.
     * 
     * @method generateCustomDayFromModal
     * @async
     * @returns {Promise<void>}
     * 
     * @description
     * Processes the custom date selection from the modal and generates a report
     * for that specific date. Includes validation to ensure a date was selected
     * and handles all API error scenarios with user-friendly messages.
     * 
     * @throws {Error} API errors (401 Unauthorized, 400 Bad Request, 500 Server Error)
     * 
     * @example
     * // Called when user confirms date selection in modal
     * await this.generateCustomDayFromModal();
     * 
     * @see generateCurrentDayReport
     * @see closeCustomDayModal
     */
    async generateCustomDayFromModal() {
      if (!this.customDayStart) {
        this.showNotification('error', 'Missing Date', 'Please select a date');
        return;
      }
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(this.customDayStart)) {
        this.showNotification('error', 'Invalid Date Format', 'Please select a valid date');
        return;
      }
      
      this.loading.generateCustom = true;
      
      // Set loading timeout
      this.setLoadingTimeout('generateCustom', this.loadingTimeouts.generate, () => {
        this.loading.generateCustom = false;
        this.showNotification('warning', 'Generation Timeout', 
          'Custom report generation is taking longer than expected. Please try again.');
      });
      
      try {
        const idToken = this.token;
        
        // Use the raw date input directly (no complex date parsing)
        const dateToUse = this.customDayStart;
        
        const requestConfig = {
          headers: { Authorization: `Bearer ${idToken}` },
          params: { reportDate: dateToUse }
        };
        
        await axios.post('/api/utilization-reports/generate', {}, requestConfig);
        
        this.showNotification('success', 'Success', 'Custom day report generated successfully');
        this.closeCustomDayModal();
        
        // Clear timeout on success
        this.clearLoadingTimeout('generateCustom');
        
        await this.fetchReports();
      } catch (error) {
        this.clearLoadingTimeout('generateCustom');
        this.handleApiError(error, 'generating custom day report', {
          showGenericError: true,
          genericMessage: 'Failed to generate custom day report'
        });
      } finally {
        this.loading.generateCustom = false;
      }
    },
    
    async refreshReports() {
      this.loading.refresh = true;
      await this.fetchReports();
      this.loading.refresh = false;
      this.showNotification('success', 'Refreshed', 'Reports list has been refreshed');
    },
    
    async viewReport(row) {
      try {
        const idToken = this.token;
        const response = await axios.get(`/api/utilization-reports/${row._id}`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        this.selectedReport = response.data.data;
        this.showReportModal = true;
      } catch (error) {
        console.error('Error fetching report details:', error);
        this.showNotification('error', 'Error', 'Failed to load report details');
      }
    },
    
    async exportReport(row) {
      this.loading.export = row._id;
      try {
        const idToken = this.token;
        const response = await axios.get(`/api/utilization-reports/${row._id}/export`, {
          headers: { Authorization: `Bearer ${idToken}` },
          responseType: 'blob'
        });
        
        // Create download link
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `utilization-report-${row.reportDate}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.showNotification('success', 'Exported', 'Report exported successfully');
      } catch (error) {
        console.error('Error exporting report:', error);
        this.showNotification('error', 'Error', 'Failed to export report');
      } finally {
        this.loading.export = null;
      }
    },
    
    async exportLatestReport() {
      if (!this.latestReport) {
        this.showNotification('error', 'No Report Available', 'No reports found to export');
        return;
      }
      
      this.loading.exportLatest = true;
      try {
        const idToken = this.token;
        const response = await axios.get(`/api/utilization-reports/${this.latestReport._id}/export`, {
          headers: { Authorization: `Bearer ${idToken}` },
          responseType: 'blob'
        });
        
        // Create download link
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Format filename with report date
        const reportDate = new Date(this.latestReport.reportStartDate).toISOString().split('T')[0];
        link.download = `current-day-report-${reportDate}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.showNotification('success', 'Downloaded', 'Current day report downloaded successfully');
      } catch (error) {
        console.error('Error downloading current report:', error);
        if (error.response && error.response.status === 401) {
          this.showNotification('error', 'Authentication Required', 'Please log in to download reports');
        } else if (error.response && error.response.status === 429) {
          const message = error.response?.data?.error || 'Too many download requests. Please wait a few minutes before trying again.';
          this.showNotification('error', 'Rate Limit Exceeded', message);
        } else {
          this.showNotification('error', 'Download Failed', 'Failed to download current day report');
        }
      } finally {
        this.loading.exportLatest = false;
      }
    },
    
    async deleteReport(row) {
      if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
        return;
      }
      
      this.loading.delete = row._id;
      try {
        const idToken = this.token;
        await axios.delete(`/api/utilization-reports/${row._id}`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        this.showNotification('success', 'Deleted', 'Report deleted successfully');
        await this.fetchReports();
      } catch (error) {
        console.error('Error deleting report:', error);
        this.showNotification('error', 'Error', 'Failed to delete report');
      } finally {
        this.loading.delete = null;
      }
    },
    
    closeReportModal() {
      this.showReportModal = false;
      this.selectedReport = null;
    },
    
    handlePaginationChange(event) {
      this.currentPage = event.page;
      this.pageSize = event.length;
      this.fetchReports();
    },
    
    handleSort(event) {
      // Implement sorting if needed
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      // Handle YYYY-MM-DD format to avoid timezone issues
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString();
      }
      return new Date(dateString).toLocaleDateString();
    },
    
    formatDateTime(dateString) {
      return new Date(dateString).toLocaleString();
    },
    
    getUtilizationKind(percent) {
      if (percent >= 80) return 'success';
      if (percent >= 60) return 'warning';
      return 'error';
    },
    
    getUtilizationClass(percent) {
      if (percent >= 80) return 'high-utilization';
      if (percent >= 60) return 'medium-utilization';
      if (percent >= 30) return 'low-utilization';
      return 'very-low-utilization';
    },
    
    formatDayPeriod(startDate, endDate) {
      // Simple date formatting - use the date as-is from the database
      const start = new Date(startDate);
      return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    formatDisplayDate(dateString) {
      if (!dateString) return '';
      try {
        // Simple parsing - add T00:00:00 to ensure proper local date interpretation
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      } catch (e) {
        return dateString;
      }
    },
    
    showNotification(kind, title, subtitle) {
      this.notification = {
        show: true,
        kind,
        title,
        subtitle
      };
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.notification.show = false;
      }, 5000);
    },
    
    /**
     * Handle Custom Day Modal Action
     * 
     * Processes the primary action (Generate Report) button click in the custom
     * day selection modal. Validates date selection and triggers report generation.
     * 
     * @method handleCustomDayModalAction
     * @returns {void}
     * 
     * @description
     * This method is called when the user clicks the primary button in the custom
     * day modal. It validates that a date has been selected and either generates
     * the report or shows an error message.
     * 
     * @example
     * // Template usage:
     * // @primary-click="handleCustomDayModalAction"
     * 
     * @see generateCustomDayFromModal
     */
    handleCustomDayModalAction() {
      if (this.customDayStart) {
        // Generate report for the selected date
        this.generateCustomDayFromModal();
      } else {
        // If no date selected, show error
        this.showNotification('error', 'Missing Date', 'Please select a date');
      }
    },
    
    /**
     * Handle Modal Date Change
     * 
     * Handles date picker value changes in the custom day modal. This method
     * ensures proper reactivity for the modal button states without forcing
     * unnecessary re-renders.
     * 
     * @method onModalDateChange
     * @param {string} newDate - The newly selected date value
     * @returns {void}
     * 
     * @description
     * Called when the date picker value changes. This method is more efficient
     * than the previous $forceUpdate() approach as it relies on Vue's natural
     * reactivity system.
     * 
     * @example
     * // Template usage:
     * // @change="onModalDateChange"
     */
    onModalDateChange(newDate) {
      // The reactivity is handled automatically by Vue
      // No need for manual updates
    },
    
    formatReportDate(report) {
      // Extract the date from reportDate without timezone conversion
      const reportDate = report.reportStartDate;
      if (reportDate) {
        // If it's a Date object or ISO string, extract just the date part
        const dateStr = reportDate.toString();
        if (dateStr.includes('T')) {
          // ISO string - get the date part before 'T'
          return dateStr.split('T')[0];
        }
        // Otherwise, return as-is (should already be a date string)
        return dateStr;
      }
      return 'Unknown Date';
    },

    // Event handlers for PageHeader component
    onDateChanged(date) {
      // Update global date store - this will trigger reactive updates
      this.setSelectedDate(date);
      
      // Update route parameter to keep URL in sync
      if (this.$route.params.date !== date) {
        this.$router.replace({
          name: 'utilization-with-date',
          params: { date }
        });
      }
    },
  }
};
</script>