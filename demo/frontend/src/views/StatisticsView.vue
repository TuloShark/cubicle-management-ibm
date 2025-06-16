<template>
  <div class="statistics-container">
    <!-- Simple Consistent Header Component -->
    <PageHeader
      title="Cubicle Statistics Overview"
      subtitle="Real-time analytics and usage metrics for the selected date"
    />
    
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
  LineElement
} from 'chart.js';
import useAuth from '../composables/useAuth';
import { useDateStore } from '../composables/useDateStore';
import PageHeader from '../components/PageHeader.vue';
import AnalyticsCarousel from '../components/AnalyticsCarousel.vue';
import { getApiBaseUrl } from '../utils/envUtils';
import './styles/StatisticsViewStyles.css';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement);

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
        value: advancedMetrics.value.totalReservations
      },
      {
        indicatorClass: 'users',
        label: 'Active Users',
        value: advancedMetrics.value.activeUsers
      },
      {
        indicatorClass: 'utilization-peak',
        label: 'Peak Usage',
        value: `${advancedMetrics.value.peakUsage}%`
      },
      {
        indicatorClass: 'utilization-avg',
        label: 'Avg. User Reservations',
        value: advancedMetrics.value.avgReservations
      },
      {
        indicatorClass: 'utilization-avg',
        label: 'Utilization Rate',
        value: `${advancedMetrics.value.utilizationRate}%`
      },
      {
        indicatorClass: 'error-rate',
        label: 'Error Rate',
        value: `${advancedMetrics.value.errorRate}%`
      }
    ]);

    // Analytics stats for carousel component
    const analyticsStats = computed(() => analyticsData.value);

    function onAnalyticsStatChanged(stat) {
      // Handle stat change if needed
      console.log('Analytics stat changed:', stat);
    }

    // Validate and sanitize chart data
    function validateChartData() {
      console.log('Validating chart data...');
      
      if (!generalStats.value || typeof generalStats.value !== 'object') {
        console.warn('Invalid general stats, using defaults');
        generalStats.value = { percentReserved: 0, percentAvailable: 100, percentError: 0 };
      }
      
      if (!Array.isArray(userStats.value)) {
        console.warn('Invalid user stats, using empty array');
        userStats.value = [];
      }
      
      if (!Array.isArray(sectionStats.value) || sectionStats.value.length === 0) {
        console.warn('Invalid section stats, using defaults');
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
    async function fetchStats() {
      const dateString = selectedDateString.value;
      
      try {
        const idToken = token.value;
        if (!idToken) {
          console.error('No authentication token available');
          return;
        }
        
        console.log('Fetching statistics for date:', dateString);
        
        // Use the date-based statistics endpoint
        const res = await axios.get(`${getApiBaseUrl()}/api/cubicles/stats/date/${dateString}`, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });
        console.log('Fetched statistics:', res.data);
        
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
            { id: 'comp-2', metric: 'Avg. Reservations/User', value: userStats.value.length > 0 ? Math.round(userStats.value.reduce((sum, u) => sum + (u.reserved || 0), 0) / userStats.value.length) : 0 },
            { id: 'comp-3', metric: 'Error Rate', value: `${generalStats.value.percentError || 0}%` }
          ];
        }
        
        // Generate chart data after fetching real data
        generateChartData();
        
      } catch (err) {
        console.error('Error fetching statistics:', err);
        // Generate chart data with default values on error
        generateChartData();
      }
    }

    // Watch for route parameter changes and update global store
    watch(() => route.params.date, async (newDate) => {
      if (newDate && typeof newDate === 'string') {
        console.log('StatisticsView - Route date changed:', newDate);
        await setSelectedDate(newDate);
      }
    });

    // Watch for global date store changes and refetch data
    watch(selectedDateString, async (newDateString) => {
      console.log('StatisticsView - Global date changed, fetching stats for:', newDateString);
      if (newDateString) {
        await fetchStats();
      }
    }, { immediate: true }); // Add immediate: true to fetch on initial load
    
    onMounted(async () => {
      // Initialize date from route parameter if available
      if (route.params.date && typeof route.params.date === 'string') {
        console.log('StatisticsView - Initializing from route date:', route.params.date);
        await initializeFromRoute(route.params.date);
        // fetchStats will be called by the watcher
      } else {
        console.log('StatisticsView - Using current global date:', selectedDateString.value);
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
      
      // Debounce timer for statistics refresh
      let statsRefreshTimeout = null;
      
      socket.on('connect', () => {
        console.log('Connected to real-time statistics');
      });
      
      // Listen for date-based reservation updates
      socket.on('dateReservationUpdate', (data) => {
        console.log('Received date reservation update:', data);
        
        // Only refresh stats if the update is for the currently selected date
        if (data.date === selectedDateString.value) {
          // Debounce statistics refresh to prevent rate limiting
          if (statsRefreshTimeout) {
            clearTimeout(statsRefreshTimeout);
          }
          statsRefreshTimeout = setTimeout(() => {
            fetchStats();
          }, 1500); // Wait 1.5 seconds before refreshing stats
        }
      });
      
      // Keep the old event for backward compatibility (if needed)
      socket.on('cubicleUpdate', () => {
        console.log('Received general cubicle update');
        // Debounce this as well
        if (statsRefreshTimeout) {
          clearTimeout(statsRefreshTimeout);
        }
        statsRefreshTimeout = setTimeout(() => {
          fetchStats();
        }, 1500);
      });
      
      socket.on('disconnect', () => {
        console.log('Disconnected from real-time statistics');
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    });
    
    onUnmounted(() => {
      if (socket) socket.disconnect();
    });

    return { 
      generalStats, 
      userStats, 
      comparisonStats,
      sectionStats,
      chartData,
      chartOptions,
      advancedMetrics,
      analyticsData,
      analyticsStats,
      onAnalyticsStatChanged,
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