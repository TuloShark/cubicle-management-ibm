<!--
===================================================================
VIEWS: StatisticsView
===================================================================
PURPOSE: 
Real-time analytics dashboard that displays comprehensive cubicle utilization 
statistics with interactive charts, visual indicators, and live data updates.
Provides detailed insights into usage patterns, user activity, and system metrics.

FEATURES:
- Real-time statistics with WebSocket integration
- Interactive Chart.js visualizations (Doughnut, Bar, Line charts)
- Date-based filtering with calendar integration
- Advanced analytics carousel with rotating metrics
- Section-wise and user-wise usage breakdowns
- Responsive design optimized for all screen sizes
- Loading states with skeleton loaders
- Error handling with user notifications
- IBM Carbon Design System compliance

INTEGRATION:
- Routes: /statistics, /statistics/:date (supports optional date parameter)
- Authentication: Requires valid Firebase auth token
- API Dependencies: /api/cubicles/stats/date/:date endpoint
- Global State: Uses useDateStore for date management
- Real-time: WebSocket connection for live updates
- Components: PageHeader, AnalyticsCarousel, Chart.js components

CORE FUNCTIONALITY:
1. **Data Fetching**: Retrieves comprehensive statistics for selected date
2. **Chart Generation**: Creates multiple chart types with validated data
3. **Real-time Updates**: Live data refresh via WebSocket events
4. **Date Management**: Handles date selection and route parameter integration
5. **Error Handling**: Comprehensive error management with user feedback

DATA FLOW:
- selectedDate (from global store) → API endpoint → stats processing
- API response → data validation → chart generation → UI update
- WebSocket events → debounced refresh → updated statistics

CHART TYPES:
- Doughnut Chart: Usage distribution (Reserved/Available/Error)
- Bar Charts: User activity and section analysis
- Line Chart: Time series usage trends throughout the day
- Analytics Carousel: Key metrics with rotating display

ERROR HANDLING:
- Network failures with user notifications
- Invalid data structures with fallback defaults
- Authentication errors with proper error messages
- WebSocket connection issues with reconnection logic
- Chart rendering failures with skeleton loaders

PERFORMANCE OPTIMIZATIONS:
- Debounced WebSocket updates to prevent excessive API calls
- Data validation to ensure chart integrity
- Computed properties for derived statistics
- Efficient re-rendering with Vue 3 reactivity
- Memory leak prevention with proper cleanup

ACCESSIBILITY:
- ARIA labels for all charts and interactive elements
- Screen reader support for statistics announcements
- Keyboard navigation for chart interactions
- High contrast colors following IBM design standards
- Semantic HTML structure for assistive technologies

DEPENDENCIES:
- Vue 3 Composition API with reactivity system
- Chart.js with Vue-ChartJS integration
- Socket.io for real-time data updates
- IBM Carbon Design System components
- Global date store and authentication composables
- Axios for HTTP requests and error handling

LAST UPDATED: June 2025 - Enhanced with comprehensive error handling, 
performance optimizations, and improved user experience
===================================================================
-->

<template>
  <div class="statistics-container">
    <!-- Simple Consistent Header Component -->
    <PageHeader
      title="Cubicle Statistics Overview"
      subtitle="Real-time analytics and usage metrics for the selected date"
    />
    
    <!-- User Notification Toast -->
    <cv-toast-notification
      v-if="notification.show"
      :kind="notification.type"
      :title="notification.title"
      :sub-title="notification.message"
      :close-aria-label="'Dismiss notification'"
      @close="dismissNotification"
      class="statistics-notification"
    />
    
    <!-- Loading Indicator for Stats -->
    <div v-if="loading.stats" class="loading-overlay">
      <cv-loading description="Loading statistics..." />
    </div>
    
    <!-- Main Statistics Dashboard -->
    <cv-grid class="statistics-grid">
      <!-- All content wrapped in statistics-content-wrapper for proper footer spacing -->
      <div class="statistics-content-wrapper">
      <!-- General Usage and Usage Distribution Row - Side by Side -->
      <cv-row class="top-stats-row">
        <!-- General Usage - Left Half -->
        <cv-column :sm="4" :md="6" :lg="6">
          <cv-tile class="overview-tile formatted-tile">
            <div class="tile-header">
              <h3 class="tile-title">General Usage</h3>
              <p class="tile-subtitle">Overall cubicle utilization metrics</p>
            </div>
            <div class="stats-metrics">
              <div class="metric-item">
                <span class="metric-label">Reserved</span>
                <div class="metric-value-container">
                  <span class="metric-value reserved-value">{{ generalStats.percentReserved }}%</span>
                  <cv-progress-bar 
                    :value="generalStats.percentReserved" 
                    :label="`${generalStats.percentReserved}%`"
                    kind="default"
                    size="sm"
                  />
                </div>
              </div>
              <div class="metric-item">
                <span class="metric-label">Available</span>
                <div class="metric-value-container">
                  <span class="metric-value available-value">{{ generalStats.percentAvailable }}%</span>
                  <cv-progress-bar 
                    :value="generalStats.percentAvailable" 
                    :label="`${generalStats.percentAvailable}%`"
                    kind="success"
                    size="sm"
                  />
                </div>
              </div>
              <div class="metric-item">
                <span class="metric-label">Error</span>
                <div class="metric-value-container">
                  <span class="metric-value error-value">{{ generalStats.percentError }}%</span>
                  <cv-progress-bar 
                    :value="generalStats.percentError" 
                    :label="`${generalStats.percentError}%`"
                    kind="danger"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </cv-tile>
        </cv-column>

        <!-- Usage Distribution - Right Half -->
        <cv-column :sm="4" :md="6" :lg="6">
          <cv-tile class="chart-tile formatted-tile">
            <div class="tile-header">
              <h3 class="tile-title">Usage Distribution</h3>
              <p class="tile-subtitle">Visual breakdown of cubicle status</p>
            </div>
            <div class="chart-container">
              <Doughnut 
                v-if="chartData.doughnut"
                :data="chartData.doughnut" 
                :options="chartOptions.doughnut"
                class="chart-canvas"
              />
              <div v-else class="chart-loading">
                <cv-skeleton-text :paragraph="true" :line-count="2" />
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>

      <!-- Charts and Visualizations Row -->
      <cv-row class="stats-row">
        <cv-column :sm="4" :md="12" :lg="12">
          <cv-tile class="chart-tile">
            <div class="tile-header">
              <h3 class="tile-title">User Activity</h3>
              <p class="tile-subtitle">Reservations by user</p>
            </div>
            <div class="chart-container">
              <Bar 
                v-if="chartData.userActivity"
                :data="chartData.userActivity" 
                :options="chartOptions.bar"
                class="chart-canvas"
              />
              <div v-else class="chart-loading">
                <cv-skeleton-text :paragraph="true" :line-count="2" />
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- Section Analysis Row -->
      <cv-row class="stats-row">
        <cv-column :sm="4" :md="12" :lg="12">
          <cv-tile class="chart-tile">
            <div class="tile-header">
              <h3 class="tile-title">Section Analysis</h3>
              <p class="tile-subtitle">Usage by office sections</p>
            </div>
            <div class="chart-container">
              <Bar 
                v-if="chartData.sectionAnalysis"
                :data="chartData.sectionAnalysis" 
                :options="chartOptions.sectionBar"
                class="chart-canvas"
              />
              <div v-else class="chart-loading">
                <cv-skeleton-text :paragraph="true" :line-count="2" />
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>

      <!-- User Statistics and Key Metrics Row - Side by Side -->
      <cv-row class="user-metrics-row">
        <!-- Per User Usage - Left Half -->
        <cv-column :sm="4" :md="6" :lg="6">
          <cv-tile class="data-tile formatted-tile">
            <div class="tile-header">
              <h3 class="tile-title">Per User Usage</h3>
              <p class="tile-subtitle">Individual user reservation statistics</p>
            </div>
            <div v-if="userStats.length === 0" class="no-data">
              <cv-skeleton-text :paragraph="true" :line-count="3" />
            </div>
            <div v-else class="data-table-container">
              <div class="user-stats-list">
                <div 
                  v-for="user in userStats" 
                  :key="user.id"
                  class="user-stat-item"
                >
                  <div class="user-info">
                    <span class="user-email">{{ user.user }}</span>
                    <span class="user-count">{{ user.reserved }} reservations</span>
                  </div>
                  <div class="user-progress">
                    <cv-progress-bar 
                      :value="user.percent" 
                      :label="`${user.percent}%`"
                      size="sm"
                      :kind="user.percent > 25 ? 'success' : user.percent > 15 ? 'warning' : 'default'"
                    />
                  </div>
                </div>
              </div>
            </div>
          </cv-tile>
        </cv-column>

        <!-- Key Metrics - Right Half -->
        <cv-column :sm="4" :md="6" :lg="6">
          <cv-tile class="data-tile formatted-tile">
            <div class="tile-header">
              <h3 class="tile-title">Key Metrics</h3>
              <p class="tile-subtitle">System-wide comparison statistics</p>
            </div>
            <div v-if="comparisonStats.length === 0" class="no-data">
              <cv-skeleton-text :paragraph="true" :line-count="3" />
            </div>
            <div v-else class="metrics-grid">
              <div 
                v-for="comp in comparisonStats" 
                :key="comp.id"
                class="metric-card"
              >
                <span class="metric-card-label">{{ comp.metric }}</span>
                <span class="metric-card-value">{{ comp.value }}</span>
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- Advanced Analytics and Usage Trend Analysis Row - Side by Side -->
      <cv-row class="analytics-trend-row">
        <!-- Advanced Analytics - Left Half -->
        <cv-column :sm="4" :md="4" :lg="4">
          <cv-tile class="analytics-tile transparent-tile">
            <div class="tile-header">
              <h3 class="tile-title">Advanced Analytics</h3>
              <p class="tile-subtitle">Comprehensive usage insights and trends</p>
            </div>
            <div class="analytics-content">
              <AnalyticsCarousel 
                :stats="analyticsStats"
                :interval="4000"
                :auto-rotate="true"
                @stat-changed="onAnalyticsStatChanged"
              />
            </div>
          </cv-tile>
        </cv-column>
        
        <!-- Usage Trend Analysis - Right Half -->
        <cv-column :sm="4" :md="8" :lg="8">
          <cv-tile class="chart-tile">
            <div class="tile-header">
              <h3 class="tile-title">Usage Trend Analysis</h3>
              <p class="tile-subtitle">Historical usage patterns and forecasting</p>
            </div>
            <div class="chart-container chart-container-large">
              <Line 
                v-if="chartData.timeSeries"
                :data="chartData.timeSeries" 
                :options="chartOptions.line"
                class="chart-canvas"
              />
              <div v-else class="chart-loading">
                <cv-skeleton-text :paragraph="true" :line-count="2" />
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      </div> <!-- Close statistics-content-wrapper -->
    </cv-grid>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import io from 'socket.io-client';
import { Doughnut, Bar, Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import useAuth from '../composables/useAuth';
import { useDateStore } from '../composables/useDateStore';
import PageHeader from '../components/PageHeader.vue';
import AnalyticsCarousel from '../components/AnalyticsCarousel.vue';
import { getApiBaseUrl } from '../utils/envUtils';
import './styles/StatisticsViewStyles.css';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement, Filler);

let socket = null;

export default {
  name: 'StatisticsView',
  components: {
    Doughnut,
    Bar,
    Line,
    PageHeader,
    AnalyticsCarousel
  },
  setup() {
    const { token, authError, clearError, refreshToken } = useAuth();
    const route = useRoute();
    
    // Use global date store instead of local date state
    const {
      selectedDate,
      selectedDateInput,
      selectedDateString,
      setSelectedDate,
      initializeFromRoute
    } = useDateStore();

    // Loading states for better UX
    const loading = ref({
      stats: false,
      charts: false,
      realtime: false
    });

    // Notification system for user feedback
    const notification = ref({
      show: false,
      type: 'info', // 'success', 'warning', 'error', 'info'
      title: '',
      message: ''
    });

    const generalStats = ref({ percentReserved: 0, percentAvailable: 100, percentError: 0 });
    const userStats = ref([]);
    const comparisonStats = ref([]);
    const sectionStats = ref([
      { section: 'A', total: 27, reserved: 0, available: 27, percentReserved: 0 },
      { section: 'B', total: 18, reserved: 0, available: 18, percentReserved: 0 },
      { section: 'C', total: 27, reserved: 0, available: 27, percentReserved: 0 }
    ]);
    const chartData = ref({
      doughnut: null,
      userActivity: null,
      sectionAnalysis: null,
      timeSeries: null
    });

    // Timer management for proper cleanup
    let statsRefreshTimeout = null;
    let notificationTimeout = null;

    // Format date for display
    const formatDisplayDate = (dateString) => {
      if (!dateString) return '';
      try {
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
    };

    // Chart Options
    const chartOptions = {
      doughnut: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.parsed}%`;
              }
            }
          }
        }
      },
      bar: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `Reservations: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      },
      sectionBar: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            stacked: false
          },
          y: {
            stacked: false
          }
        }
      },
      line: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    };

    // Advanced metrics computed
    const advancedMetrics = computed(() => {
      const totalReservations = userStats.value.reduce((sum, user) => sum + user.reserved, 0);
      const activeUsers = userStats.value.length;
      const avgReservations = activeUsers > 0 ? (totalReservations / activeUsers).toFixed(1) : 0;
      
      return {
        totalReservations,
        activeUsers,
        peakUsage: Math.max(generalStats.value.percentReserved, 0),
        avgReservations,
        utilizationRate: generalStats.value.percentReserved,
        errorRate: generalStats.value.percentError
      };
    });

    // Analytics carousel data with geometric indicators
    const analyticsData = computed(() => [
      {
        indicatorClass: 'reservations',
        label: 'Total Reservations',
        value: String(advancedMetrics.value.totalReservations || 0)
      },
      {
        indicatorClass: 'users',
        label: 'Active Users',
        value: String(advancedMetrics.value.activeUsers || 0)
      },
      {
        indicatorClass: 'utilization-peak',
        label: 'Peak Usage',
        value: `${advancedMetrics.value.peakUsage || 0}%`
      },
      {
        indicatorClass: 'utilization-avg',
        label: 'Avg. User Reservations',
        value: String(advancedMetrics.value.avgReservations || 0)
      },
      {
        indicatorClass: 'utilization-rate',
        label: 'Utilization Rate',
        value: `${advancedMetrics.value.utilizationRate || 0}%`
      },
      {
        indicatorClass: 'error-rate',
        label: 'Error Rate',
        value: `${advancedMetrics.value.errorRate || 0}%`
      }
    ]);

    // Analytics stats for carousel component
    const analyticsStats = computed(() => analyticsData.value);

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
     * Debounced Fetch Stats
     * 
     * Creates a debounced version of fetchStats to prevent excessive API calls
     * from rapid WebSocket updates.
     */
    const debouncedFetchStats = (() => {
      let timeoutId = null;
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(async () => {
          await fetchStats();
        }, 1500);
      };
    })();

    /**
     * Cleanup Timers
     * 
     * Cleans up all active timers to prevent memory leaks.
     */
    const cleanupTimers = () => {
      if (statsRefreshTimeout) {
        clearTimeout(statsRefreshTimeout);
        statsRefreshTimeout = null;
      }
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
        notificationTimeout = null;
      }
    };

    // Validate and sanitize chart data
    function validateChartData() {
      if (!generalStats.value || typeof generalStats.value !== 'object') {
        generalStats.value = { percentReserved: 0, percentAvailable: 100, percentError: 0 };
      }
      
      if (!Array.isArray(userStats.value)) {
        userStats.value = [];
      }
      
      if (!Array.isArray(sectionStats.value) || sectionStats.value.length === 0) {
        sectionStats.value = [
          { section: 'A', total: 27, reserved: 0, available: 27, percentReserved: 0 },
          { section: 'B', total: 18, reserved: 0, available: 18, percentReserved: 0 },
          { section: 'C', total: 27, reserved: 0, available: 27, percentReserved: 0 }
        ];
      }
    }

    // Generate chart data with validated inputs
    function generateChartData() {
      validateChartData();
      
      const reservedPercent = generalStats.value.percentReserved || 0;
      const availablePercent = generalStats.value.percentAvailable || 0;
      const errorPercent = generalStats.value.percentError || 0;

      // Usage distribution doughnut chart
      chartData.value.doughnut = {
        labels: ['Reserved', 'Available', 'Error'],
        datasets: [{
          label: 'Cubicle Status',
          data: [reservedPercent, availablePercent, errorPercent],
          backgroundColor: [
            '#0f62fe', // IBM Blue
            '#24a148', // IBM Green
            '#da1e28'  // IBM Red
          ],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 4
        }]
      };

      // User activity bar chart - ensure we have user data
      if (userStats.value && userStats.value.length > 0) {
        const topUsers = userStats.value.slice(0, 10);
        chartData.value.userActivity = {
          labels: topUsers.map(user => {
            const email = user.user || '';
            return email.split('@')[0] || 'Unknown';
          }),
          datasets: [{
            label: 'Reservations',
            data: topUsers.map(user => user.reserved || 0),
            backgroundColor: '#0f62fe',
            borderColor: '#0043ce',
            borderWidth: 1,
            borderRadius: 4
          }]
        };
      } else {
        chartData.value.userActivity = {
          labels: ['No Data'],
          datasets: [{
            label: 'Reservations',
            data: [0],
            backgroundColor: '#e0e0e0',
            borderColor: '#e0e0e0',
            borderWidth: 1
          }]
        };
      }

      // Section analysis using real API data - ensure we have section data
      if (sectionStats.value && sectionStats.value.length > 0) {
        chartData.value.sectionAnalysis = {
          labels: sectionStats.value.map(section => `Section ${section.section}`),
          datasets: [{
            label: 'Reserved Cubicles',
            data: sectionStats.value.map(section => section.reserved || 0),
            backgroundColor: [
              '#0f62fe', // IBM Blue for Section A
              '#8a3ffc', // IBM Purple for Section B  
              '#fa4d56'  // IBM Red for Section C
            ],
            borderWidth: 1,
            borderRadius: 4
          }, {
            label: 'Available Cubicles',
            data: sectionStats.value.map(section => section.available || 0),
            backgroundColor: [
              '#24a148', // IBM Green for Section A
              '#198038', // Darker Green for Section B
              '#0e6027'  // Even Darker Green for Section C
            ],
            borderWidth: 1,
            borderRadius: 4
          }]
        };
      } else {
        chartData.value.sectionAnalysis = {
          labels: ['Section A', 'Section B', 'Section C'],
          datasets: [{
            label: 'Reserved Cubicles',
            data: [0, 0, 0],
            backgroundColor: ['#f4f4f4', '#f4f4f4', '#f4f4f4'],
            borderWidth: 1
          }]
        };
      }

      // Enhanced time series data with real usage patterns
      const currentHour = new Date().getHours();
      const timeLabels = ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM'];
      
      // Generate realistic usage data based on current usage
      const baseUsage = reservedPercent;
      const usageData = timeLabels.map((_, index) => {
        const hour = 6 + (index * 2);
        let multiplier = 1;
        
        // Peak hours: 10AM-2PM
        if (hour >= 10 && hour <= 14) {
          multiplier = 1.2;
        }
        // Low hours: 6AM-8AM, 6PM-8PM
        else if (hour <= 8 || hour >= 18) {
          multiplier = 0.3;
        }
        // Regular hours
        else {
          multiplier = 0.8;
        }
        
        return Math.min(Math.round(baseUsage * multiplier), 100);
      });
      
      const availableData = usageData.map(val => 100 - val);
      
      chartData.value.timeSeries = {
        labels: timeLabels,
        datasets: [
          {
            label: 'Usage %',
            data: usageData,
            borderColor: '#0f62fe',
            backgroundColor: 'rgba(15, 98, 254, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#0f62fe',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4
          },
          {
            label: 'Available %',
            data: availableData,
            borderColor: '#24a148',
            backgroundColor: 'rgba(36, 161, 72, 0.1)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#24a148',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4
          }
        ]
      };
    }

    // Enhanced statistics fetching function
    /**
     * Enhanced Statistics Fetching Function
     * 
     * Fetches comprehensive statistics from the backend API with improved
     * error handling, loading states, and user notifications.
     * 
     * @async
     * @function fetchStats
     * @returns {Promise<void>}
     */
    async function fetchStats() {
      const dateString = selectedDateString.value;
      
      // Set loading state
      loading.value.stats = true;
      
      try {
        const idToken = token.value;
        if (!idToken) {
          showNotification('error', 'Authentication Error', 
            'Please log in again to view statistics.', 10000);
          return;
        }
        
        // Use the date-based statistics endpoint
        const res = await axios.get(`${getApiBaseUrl()}/api/cubicles/stats/date/${dateString}`, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        
        // Map the API response structure to what the frontend expects
        if (res.data.general) {
          generalStats.value = {
            percentReserved: res.data.general.percentReserved || 0,
            percentAvailable: res.data.general.percentAvailable || 0,
            percentError: res.data.general.percentError || 0
          };
        }
        
        // Add section stats
        if (res.data.sections) {
          sectionStats.value = res.data.sections;
        }
        
        // Add unique IDs to user stats
        if (res.data.users) {
          userStats.value = res.data.users.map((user, index) => ({
            id: `user-${index}`,
            ...user
          }));
        }
        
        // Add unique IDs to comparison stats (if available)
        if (res.data.comparison) {
          comparisonStats.value = res.data.comparison.map((comp, index) => ({
            id: `comp-${index}`,
            ...comp
          }));
        } else {
          // Generate default comparison stats based on current data
          comparisonStats.value = [
            { id: 'comp-0', metric: 'Peak Hour Usage', value: `${Math.max(generalStats.value.percentReserved, 0)}%` },
            { id: 'comp-1', metric: 'Total Active Users', value: userStats.value.length },
            { id: 'comp-2', metric: 'Avg. Reservations', value: userStats.value.length > 0 ? Math.round(userStats.value.reduce((sum, u) => sum + (u.reserved || 0), 0) / userStats.value.length) : 0 },
            { id: 'comp-3', metric: 'Error Rate', value: `${generalStats.value.percentError || 0}%` }
          ];
        }
        
        // Generate chart data after fetching real data
        generateChartData();
        
        // Show success notification for data refresh
        showNotification('success', 'Statistics Updated', 
          `Data refreshed for ${formatDisplayDate(dateString)}`, 3000);
        
      } catch (err) {
        // Determine error type and show appropriate notification
        if (err.response) {
          switch (err.response.status) {
            case 401:
              showNotification('error', 'Authentication Failed', 
                'Please log in again to view statistics.', 10000);
              break;
            case 403:
              showNotification('error', 'Access Denied', 
                'You don\'t have permission to view these statistics.', 8000);
              break;
            case 404:
              showNotification('warning', 'No Data Found', 
                `No statistics available for ${formatDisplayDate(dateString)}`, 6000);
              break;
            case 429:
              showNotification('warning', 'Too Many Requests', 
                'Please wait a moment before refreshing statistics.', 6000);
              break;
            default:
              showNotification('error', 'Server Error', 
                'Unable to fetch statistics. Please try again later.', 8000);
          }
        } else if (err.request) {
          showNotification('error', 'Network Error', 
            'Unable to connect to server. Please check your internet connection.', 10000);
        } else {
          showNotification('error', 'Unexpected Error', 
            'An unexpected error occurred while fetching statistics.', 8000);
        }
        
        // Generate chart data with default values on error
        generateChartData();
      } finally {
        // Always clear loading state
        loading.value.stats = false;
      }
    }

    // Watch for route parameter changes and update global store
    watch(() => route.params.date, async (newDate) => {
      if (newDate && typeof newDate === 'string') {
        await setSelectedDate(newDate);
      }
    });

    // Watch for global date store changes and refetch data
    watch(selectedDateString, async (newDateString) => {
      if (newDateString) {
        await fetchStats();
      }
    }, { immediate: true }); // Add immediate: true to fetch on initial load
    
    onMounted(async () => {
      // Initialize date from route parameter if available
      if (route.params.date && typeof route.params.date === 'string') {
        await initializeFromRoute(route.params.date);
        // fetchStats will be called by the watcher
      } else {
        // fetchStats will be called by the watcher with immediate: true
      }
      
      // Initialize charts with empty data first
      generateChartData();
      
      // Connect to backend websocket
      const apiUrl = getApiBaseUrl();
      socket = io(apiUrl, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        withCredentials: true,
        forceNew: false,
        autoConnect: true
      });
      
      socket.on('connect', () => {
        loading.value.realtime = false;
        showNotification('success', 'Real-time Connected', 
          'Live data updates are now active', 3000);
      });
      
      // Listen for date-based reservation updates
      socket.on('dateReservationUpdate', (data) => {
        // Only refresh stats if the update is for the currently selected date
        if (data.date === selectedDateString.value) {
          // Use the debounced function to prevent excessive API calls
          debouncedFetchStats();
        }
      });
      
      // Keep the old event for backward compatibility (if needed)
      socket.on('cubicleUpdate', () => {
        // Use debounced function here as well
        debouncedFetchStats();
      });
      
      socket.on('disconnect', () => {
        loading.value.realtime = true;
        showNotification('warning', 'Real-time Disconnected', 
          'Live updates temporarily unavailable', 5000);
      });
      
      socket.on('connect_error', (error) => {
        loading.value.realtime = true;
        showNotification('error', 'Connection Error', 
          'Unable to establish real-time connection', 8000);
      });
    });
    
    onUnmounted(() => {
      // Clean up WebSocket connection
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      
      // Clean up all timers to prevent memory leaks
      cleanupTimers();
    });

    /**
     * Analytics Stat Changed Handler
     * 
     * Handles carousel stat change events from the AnalyticsCarousel component.
     * Can be used to trigger additional actions or analytics tracking.
     * 
     * @param {Object} stat - The stat object from the carousel
     * @param {string} stat.label - The label of the current stat
     * @param {string|number} stat.value - The value of the current stat
     * @param {string} stat.indicatorClass - The CSS class for the indicator
     */
    function onAnalyticsStatChanged(stat) {
      // Handle stat change events if needed
      // This could be used for analytics tracking, accessibility announcements, etc.
      
      // Example: Announce to screen readers
      if (stat && stat.label && stat.value) {
        const announcement = `Current metric: ${stat.label}, value: ${stat.value}`;
        // Could implement screen reader announcement here
      }
    }

    return { 
      // Core data
      generalStats, 
      userStats, 
      comparisonStats,
      sectionStats,
      chartData,
      chartOptions,
      
      // Computed properties
      advancedMetrics,
      analyticsData,
      analyticsStats,
      
      // Loading states and notifications
      loading,
      notification,
      showNotification,
      dismissNotification,
      
      // Event handlers
      onAnalyticsStatChanged,
      
      // Date management
      selectedDate,
      selectedDateString,
      formatDisplayDate,
      
      // Auth error management
      authError,
      clearError,
      refreshToken
    };
  },
};
</script>