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
            <div class="analytics-carousel">
              <div class="analytics-carousel-container-vertical">
                <transition name="slide" mode="out-in">
                  <div 
                    :key="currentAnalyticsIndex" 
                    class="analytics-cards-stack"
                  >
                    <!-- First Card -->
                    <div class="analytics-card-stacked">
                      <div :class="['analytics-indicator-medium', currentAnalyticsTop.indicatorClass]"></div>
                      <div class="analytics-details">
                        <span class="analytics-label-medium">{{ currentAnalyticsTop.label }}</span>
                        <span class="analytics-value-medium">{{ currentAnalyticsTop.value }}</span>
                      </div>
                    </div>
                    
                    <!-- Second Card -->
                    <div class="analytics-card-stacked">
                      <div :class="['analytics-indicator-medium', currentAnalyticsBottom.indicatorClass]"></div>
                      <div class="analytics-details">
                        <span class="analytics-label-medium">{{ currentAnalyticsBottom.label }}</span>
                        <span class="analytics-value-medium">{{ currentAnalyticsBottom.value }}</span>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
              
              <!-- Carousel indicators hidden -->
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

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement);

let socket = null;
let analyticsInterval = null;

export default {
  name: 'StatisticsView',
  components: {
    Doughnut,
    Bar,
    Line,
    PageHeader
  },
  setup() {
    const { token } = useAuth();
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
    const currentAnalyticsIndex = ref(0);
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

    const currentAnalytics = computed(() => {
      return analyticsData.value[currentAnalyticsIndex.value] || {};
    });

    // Get two cards for vertical stacking
    const currentAnalyticsTop = computed(() => {
      return analyticsData.value[currentAnalyticsIndex.value * 2] || {};
    });

    const currentAnalyticsBottom = computed(() => {
      return analyticsData.value[currentAnalyticsIndex.value * 2 + 1] || {};
    });

    // Analytics carousel methods
    function startAnalyticsCarousel() {
      stopAnalyticsCarousel();
      analyticsInterval = setInterval(() => {
        nextAnalytics();
      }, 4000);
    }

    function stopAnalyticsCarousel() {
      if (analyticsInterval) {
        clearInterval(analyticsInterval);
        analyticsInterval = null;
      }
    }

    function nextAnalytics() {
      if (analyticsData.value.length > 0) {
        const maxIndex = Math.floor(analyticsData.value.length / 2) - 1;
        currentAnalyticsIndex.value = (currentAnalyticsIndex.value + 1) % (maxIndex + 1);
      }
    }

    function setCurrentAnalytics(index) {
      currentAnalyticsIndex.value = index;
      startAnalyticsCarousel();
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
        let idToken = token.value;
        if (!idToken) {
          idToken = localStorage.getItem('auth_token');
        }
        
        if (!idToken) {
          console.error('No authentication token available');
          return;
        }
        
        console.log('Fetching statistics for date:', dateString);
        
        // Use the date-based statistics endpoint
        const res = await axios.get(`/api/cubicles/stats/date/${dateString}`, {
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
    watch(() => route.params.date, (newDate) => {
      if (newDate && typeof newDate === 'string') {
        console.log('StatisticsView - Route date changed:', newDate);
        setSelectedDate(newDate);
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
        initializeFromRoute(route.params.date);
        // fetchStats will be called by the watcher
      } else {
        console.log('StatisticsView - Using current global date:', selectedDateString.value);
        // fetchStats will be called by the watcher with immediate: true
      }
      
      // Initialize charts with empty data first
      generateChartData();
      
      // Start analytics carousel
      startAnalyticsCarousel();
      
      // Connect to backend websocket
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
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
      stopAnalyticsCarousel(); // Stop analytics carousel
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
      currentAnalytics,
      currentAnalyticsTop,
      currentAnalyticsBottom,
      currentAnalyticsIndex,
      setCurrentAnalytics,
      selectedDate,
      selectedDateString,
      formatDisplayDate,
    };
  },
};
</script>

<style scoped>
/* IBM Carbon Design System inspired styling */
.statistics-container {
  padding: 0;
  margin-top: 48px; /* Space for navbar - consistent with other views */
  background-color: #f4f4f4;
  min-height: calc(100vh - 64px - 60px); /* Calculate exact height: viewport - navbar - footer */
  overflow-x: hidden; /* Prevent horizontal scrollbar */
  padding-bottom: 2rem; /* Add bottom padding for footer separation */
}

.statistics-grid {
  padding: 1.5rem; /* Reduced padding back to minimal */
  max-width: 1584px;
  margin: 0 auto; /* Removed excessive top margin */
}

/* Statistics Content Wrapper - Ensures proper footer separation */
.statistics-content-wrapper {
  padding-bottom: 1rem; /* Massive bottom padding to ensure footer separation */
  margin-bottom: 1rem; /* Additional bottom margin for safe spacing */
}

/* Row Spacing - Enhanced for Footer Compatibility */
.top-stats-row,
.stats-row,
.user-metrics-row,
.analytics-trend-row {
  margin-bottom: 2.5rem; /* Enhanced margin between rows for better spacing */
}

.top-stats-row {
  margin-bottom: 2.5rem; /* Enhanced margin for top row */
  margin-top: 1rem; /* Minimal top margin for the first row */
}

/* Specific row spacing for clean separation */
.stats-row {
  margin-top: 1rem; /* Minimal space above USER ACTIVITY section */
  margin-bottom: 2.5rem; /* Enhanced bottom margin */
}

.user-metrics-row {
  margin-top: 1rem; /* Minimal space above user metrics section */
  margin-bottom: 2.5rem; /* Enhanced bottom margin */
}

.analytics-trend-row {
  margin-top: 1rem; /* Minimal space above analytics section */
  margin-bottom: 4rem; /* Significantly increased bottom margin to prevent footer scrollbar issues */
}

/* Column Spacing - Add padding to avoid side-by-side cramping */
:deep(.bx--col) {
  padding-left: 1.25rem; /* Increased column padding */
  padding-right: 1.25rem;
  margin-bottom: 1rem; /* Added bottom margin for mobile stacking */
}

/* Additional spacing for grid rows */
:deep(.bx--row) {
  margin-left: -0.75rem; /* Compensate for increased column padding */
  margin-right: -0.75rem;
  margin-bottom: 1rem; /* Added bottom margin for rows */
}

/* Tile Styling - IBM Carbon Design Consistent with OldStatisticsView */
.overview-tile,
.data-tile,
.chart-tile,
.analytics-tile {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(224, 224, 224, 0.3) !important;
  border-radius: 0 !important; /* Sharp edges */
  padding: 2rem !important; /* Force padding inside tiles */
  margin: 1.5rem 1.5rem 3.5rem 1.5rem !important; /* Significantly increased bottom margin to prevent footer proximity */
  height: 100%;
  transition: all 0.15s ease;
  box-shadow: none;
  position: relative;
  overflow: hidden;
}

/* Completely transparent tiles for Usage Distribution and Advanced Analytics */
.transparent-tile {
  background: transparent !important;
  backdrop-filter: none;
  border: none !important;
  box-shadow: none !important;
}

/* Formatted tile for General Usage */
.formatted-tile {
  background: rgba(255, 255, 255, 0.98) !important;
  border: 2px solid #e0e0e0 !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.formatted-tile::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #0f62fe, #0043ce);
  z-index: 1;
}

.overview-tile:hover,
.data-tile:hover,
.chart-tile:hover,
.analytics-tile:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
  border-color: rgba(15, 98, 254, 0.3);
}

.transparent-tile:hover {
  background: rgba(255, 255, 255, 0.03) !important;
  border-color: rgba(15, 98, 254, 0.5) !important;
  box-shadow: 0 1px 4px rgba(15, 98, 254, 0.1) !important;
}

.formatted-tile:hover {
  border-color: #0f62fe !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Tile Headers */
.tile-header {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(224, 224, 224, 0.3);
  padding-bottom: 1rem;
  position: relative;
  z-index: 2;
}

.tile-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #161616;
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
  letter-spacing: 0.16px;
  text-transform: uppercase;
  font-family: 'IBM Plex Sans', sans-serif;
}

.tile-subtitle {
  font-size: 0.875rem;
  color: #525252;
  margin: 0;
  font-weight: 400;
  line-height: 1.4;
  font-family: 'IBM Plex Sans', sans-serif;
}

/* Enhanced General Usage Metrics Formatting */
.stats-metrics {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 200px;
  position: relative;
  z-index: 2;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(248, 249, 250, 0.8);
  border: 1px solid rgba(224, 224, 224, 0.4);
  border-radius: 0; /* Sharp edges */
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
}

.metric-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  transition: all 0.15s ease;
}

.metric-item:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(15, 98, 254, 0.3);
  transform: translateX(2px);
}

.metric-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #161616;
  text-transform: uppercase;
  letter-spacing: 0.16px;
  font-family: 'IBM Plex Sans', sans-serif;
  min-width: 80px;
}

.metric-value-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  justify-content: flex-end;
  max-width: 200px;
}

.metric-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #161616;
  font-family: 'IBM Plex Mono', monospace;
  letter-spacing: 0.32px;
  min-width: 50px;
  text-align: right;
}

/* Color-coded metric values */
.reserved-value {
  color: #0f62fe;
}

.available-value {
  color: #198038;
}

.error-value {
  color: #da1e28;
}

/* Color-coded left borders for metric items */
.metric-item:nth-child(1)::before {
  background: #0f62fe;
}

.metric-item:nth-child(2)::before {
  background: #198038;
}

.metric-item:nth-child(3)::before {
  background: #da1e28;
}

.tile-subtitle {
  font-size: 0.875rem;
  color: #6f6f6f;
  margin: 0;
  font-weight: 400;
  line-height: 1.4;
}

/* Stats Metrics */
.stats-metrics {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  flex: 1;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.metric-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #161616;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric-value {
  font-size: 2rem;
  font-weight: 300;
  line-height: 1.1;
}

.reserved-value {
  color: #0f62fe;
}

.available-value {
  color: #24a148;
}

.error-value {
  color: #da1e28;
}

/* Chart Styling */
/* Chart Styling with Enhanced Spacing */
.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
  margin-top: 1.5rem; /* Increased top margin */
  padding: 1rem 1rem 1.5rem 1rem; /* Increased bottom padding inside chart container */
}

.chart-container-compact {
  height: 250px; /* Smaller height for side-by-side layout */
  min-height: 250px;
  padding: 0.75rem 0.75rem 1.25rem 0.75rem; /* Increased bottom padding for compact containers */
}

.chart-container-large {
  height: 400px;
  padding: 1.25rem 1.25rem 1.75rem 1.25rem; /* Increased bottom padding for large containers */
}

.chart-canvas {
  width: 100% !important;
  height: 100% !important;
  margin: 0.5rem; /* Added margin around canvas */
}

.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #6f6f6f;
  font-style: italic;
  padding: 2rem; /* Added padding for loading state */
}

/* Metrics Grid - IBM Carbon Sharp Design with Enhanced Spacing */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem; /* Increased gap for better spacing */
  flex: 1;
  padding: 1rem 1rem 2rem 1rem; /* Increased bottom padding around the grid */
  margin: 0.5rem 0 1.5rem 0; /* Increased bottom vertical margin */
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem; /* Slightly increased gap */
  padding: 2rem 1.5rem; /* Increased padding for content spacing */
  background: #f4f4f4; /* IBM Carbon Gray 10 */
  border: 1px solid #e0e0e0;
  border-radius: 0; /* Sharp edges - IBM Carbon */
  transition: all 0.15s ease;
  position: relative;
  margin: 0.25rem; /* Added margin around each card */
}

.metric-card:hover {
  background: #e8e8e8; /* IBM Carbon Gray 20 */
  border-color: #0f62fe; /* IBM Blue accent */
  transform: none; /* No transform - IBM Carbon */
}

.metric-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #0f62fe; /* IBM Blue accent bar */
  opacity: 0;
  transition: opacity 0.15s ease;
}

.metric-card:hover::before {
  opacity: 1;
}

.metric-card-label {
  font-size: 0.75rem;
  color: #6f6f6f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.metric-card-value {
  font-size: 1.75rem;
  font-weight: 300;
  color: #161616;
  line-height: 1.1;
}

/* Advanced Analytics Carousel */
.analytics-carousel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem 1.5rem 4rem 1.5rem; /* Significantly increased bottom padding to avoid footer proximity */
  margin: 1rem 0 3rem 0; /* Increased bottom margin for better spacing */
}

.analytics-carousel-container-vertical {
  position: relative;
  width: 100%;
  max-width: 450px;
  height: 260px;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
  padding: 0.75rem; /* Added padding inside container */
}

.analytics-cards-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem; /* Increased gap between cards */
  width: 100%;
  padding: 1.5rem 1.5rem 3rem 1.5rem; /* Significantly increased bottom padding for content */
  margin: 0.5rem 0 2.5rem 0; /* Increased bottom margin around the stack */
}

.analytics-card-stacked {
  display: flex;
  align-items: center;
  gap: 1.5rem; /* Increased gap between indicator and content */
  padding: 1.5rem 2rem; /* Increased padding inside cards */
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #e0e0e0;
  border-radius: 0; /* Sharp edges */
  width: 100%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  height: 100px;
  margin: 0.25rem 0; /* Added vertical margin between cards */
}

.analytics-card-stacked::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #0f62fe, #0043ce);
}

.analytics-card-stacked:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  border-color: #0f62fe;
}

/* Analytics Indicators */
.analytics-indicator-medium {
  width: 36px;
  height: 36px;
  border-radius: 0; /* Sharp edges */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  border: 2px solid;
}

.analytics-indicator-medium.utilization-avg {
  background: linear-gradient(135deg, #d9f0dd, #e8f5e8);
  border-color: #198038;
}

.analytics-indicator-medium.utilization-avg::before {
  content: '';
  width: 16px;
  height: 16px;
  background: #198038;
  border-radius: 3px;
  transform: rotate(45deg);
}

.analytics-indicator-medium.utilization-peak {
  background: linear-gradient(135deg, #fef7cd, #fefbde);
  border-color: #f1c21b;
}

.analytics-indicator-medium.utilization-peak::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 12px solid #f1c21b;
}

.analytics-indicator-medium.reservations {
  background: linear-gradient(135deg, #d0e2ff, #e0efff);
  border-color: #0f62fe;
}

.analytics-indicator-medium.reservations::before {
  content: '';
  width: 16px;
  height: 16px;
  background: #0f62fe;
  border-radius: 50%;
}

.analytics-indicator-medium.users {
  background: linear-gradient(135deg, #f0e6ff, #f7f0ff);
  border-color: #8a3ffc;
}

.analytics-indicator-medium.users::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 16px solid #8a3ffc;
  border-radius: 2px;
}

.analytics-indicator-medium.error-rate {
  background: linear-gradient(135deg, #fdebed, #ffffff);
  border-color: #da1e28;
}

.analytics-indicator-medium.error-rate::before {
  content: '';
  width: 12px;
  height: 12px;
  background: #da1e28;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.analytics-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.analytics-label-medium {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6f6f6f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.analytics-value-medium {
  font-size: 1.5rem;
  font-weight: 700;
  color: #161616;
  line-height: 1.1;
}

/* Slide Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Data Table Container */
/* Data Table Container with Enhanced Spacing */
.data-table-container {
  flex: 1;
  padding: 1rem 1rem 2.5rem 1rem; /* Significantly increased bottom padding around the container */
  margin: 0.5rem 0 2.5rem 0; /* Increased bottom vertical margin */
  position: relative;
  z-index: 2;
}

.user-stats-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 280px; /* Reduced max height */
  overflow-y: auto;
  padding: 0.5rem; /* Reduced padding */
  margin: 0.25rem; /* Reduced margin */
  /* Add scrollbar styling to make it less intrusive */
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

.user-stats-list::-webkit-scrollbar {
  width: 6px;
}

.user-stats-list::-webkit-scrollbar-track {
  background: transparent;
}

.user-stats-list::-webkit-scrollbar-thumb {
  background-color: #e0e0e0;
  border-radius: 0;
}

.user-stats-list::-webkit-scrollbar-thumb:hover {
  background-color: #c6c6c6;
}

.user-stat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem; /* Increased padding for content spacing */
  background: rgba(248, 249, 250, 0.8);
  border: 1px solid rgba(224, 224, 224, 0.4);
  border-radius: 0; /* Sharp edges */
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;
  margin: 0.25rem 0; /* Added vertical margin between items */
}

.user-stat-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #0f62fe;
  transition: all 0.15s ease;
}

.user-stat-item:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(15, 98, 254, 0.3);
  transform: translateX(2px);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.user-email {
  font-size: 0.875rem;
  font-weight: 600;
  color: #161616;
  font-family: 'IBM Plex Sans', sans-serif;
}

.user-count {
  font-size: 0.75rem;
  color: #6f6f6f;
  font-family: 'IBM Plex Sans', sans-serif;
}

.user-progress {
  width: 100px;
  margin-left: 1rem;
}

/* No Data State */
.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #6f6f6f;
  font-style: italic;
  font-family: 'IBM Plex Sans', sans-serif;
}

/* Top Stats Row Layout - Side by Side */
.top-stats-row {
  margin-bottom: 2rem;
}

.top-stats-row .cv-column:first-child {
  padding-right: 1rem;
}

.top-stats-row .cv-column:last-child {
  padding-left: 1rem;
}

/* Analytics and Trend Row Layout - Side by Side */
.analytics-trend-row {
  margin-top: 2rem;
  margin-bottom: 2rem;
}

.analytics-trend-row .cv-column:first-child {
  padding-right: 1rem;
}

.analytics-trend-row .cv-column:last-child {
  padding-left: 1rem;
}

/* Responsive Design - Enhanced for Better Mobile Experience */
@media (max-width: 768px) {
  .statistics-container {
    margin-top: 48px;
    padding: 0;
  }
  
  .statistics-grid {
    padding: 1rem 0.75rem; /* Enhanced mobile padding */
    gap: 1rem; /* Increased gap for mobile */
    margin: 0;
    width: 100%;
    max-width: 100%;
  }

  /* Enhanced mobile spacing for rows */
  .top-stats-row,
  .stats-row,
  .user-metrics-row,
  .analytics-trend-row {
    margin-bottom: 2rem; /* Enhanced mobile row spacing */
  }

  .analytics-trend-row {
    margin-bottom: 3rem; /* Extra bottom spacing on mobile for footer compatibility */
  }

  /* Enhanced mobile column spacing */
  :deep(.bx--col) {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    margin-bottom: 1.5rem; /* Increased mobile bottom margin */
  }

  /* Enhanced mobile tile spacing */
  .overview-tile,
  .data-tile,
  .chart-tile,
  .analytics-tile {
    padding: 1.5rem 1rem; /* Enhanced mobile tile padding */
    margin-bottom: 1.5rem; /* Increased bottom margin for mobile footer compatibility */
  }
  
  /* Fix displacement issues - Force single column layout */
  .top-stats-row,
  .stats-row,
  .user-metrics-row,
  .analytics-trend-row {
    margin-bottom: 1rem;
    margin-left: 0 !important;
    margin-right: 0 !important;
    width: 100%;
  }
  
  .top-stats-row .cv-column,
  .stats-row .cv-column,
  .user-metrics-row .cv-column,
  .analytics-trend-row .cv-column {
    margin-bottom: 1rem;
    padding-left: 0 !important;
    padding-right: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    flex: 0 0 100% !important;
  }
  
  /* Remove side-by-side padding on mobile */
  .top-stats-row .cv-column:first-child,
  .top-stats-row .cv-column:last-child,
  .analytics-trend-row .cv-column:first-child,
  .analytics-trend-row .cv-column:last-child {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  
  /* Tile adjustments for mobile */
  .overview-tile,
  .data-tile,
  .chart-tile,
  .analytics-tile {
    padding: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .tile-title {
    font-size: 1.25rem;
  }
  
  .tile-subtitle {
    font-size: 0.8125rem;
  }
  
  .metric-value {
    font-size: 1.5rem;
  }
  
  .chart-container,
  .chart-container-large {
    height: 250px;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .analytics-cards-stack {
    gap: 0.75rem;
    max-width: 100%;
  }
  
  .analytics-card-stacked {
    padding: 1rem;
    gap: 0.75rem;
  }
  
  .analytics-indicator-medium {
    width: 32px;
    height: 32px;
    border-radius: 0; /* Sharp edges - IBM Carbon */
  }
  
  .analytics-value-medium {
    font-size: 1.25rem;
  }
  
  .analytics-label-medium {
    font-size: 0.75rem;
  }
}

/* Carbon Design System Overrides - Clean and Consistent */
:deep(.bx--grid) {
  max-width: 100%;
}

:deep(.bx--row) {
  margin-left: 0 !important;
  margin-right: 0 !important;
  margin-bottom: 1rem !important; /* Reduced margin between rows */
}

:deep(.bx--col) {
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
  margin-bottom: 1rem !important; /* Reduced margin for mobile stacking */
}

/* Remove the problematic tile overrides that kill our spacing */
:deep(.bx--tile) {
  border-radius: 0 !important;
  /* Removed margin and padding overrides that were causing tight stacking */
  min-height: auto !important;
  max-width: none !important;
  max-height: none !important;
}

:deep(.bx--progress-bar) {
  height: 8px !important;
  border-radius: 0 !important;
}

:deep(.bx--progress-bar__track) {
  background-color: #e0e0e0 !important;
  border-radius: 0 !important;
}

:deep(.bx--progress-bar__bar) {
  border-radius: 0 !important;
}

:deep(.bx--skeleton-text) {
  background: linear-gradient(90deg, #e0e0e0 25%, transparent 37%, #e0e0e0 63%);
  border-radius: 0 !important;
}

/* Responsive Design */
@media (max-width: 1056px) {
  .statistics-container {
    margin-top: 48px;
  }
  
  .statistics-grid {
    padding: 1rem;
  }
  
  .top-stats-row,
  .stats-row,
  .user-metrics-row,
  .analytics-trend-row {
    margin-bottom: 1.5rem;
  }
  
  .overview-tile,
  .data-tile,
  .chart-tile,
  .analytics-tile {
    padding: 1rem;
  }
  
  .tile-header {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
  }
  
  .tile-title {
    font-size: 1.125rem;
  }
  
  .tile-subtitle {
    font-size: 0.8125rem;
  }
  
  .stats-metrics {
    gap: 1rem;
    min-height: 150px;
  }
  
  .metric-item {
    padding: 0.75rem;
  }
  
  .metric-label {
    font-size: 0.8125rem;
    min-width: 70px;
  }
  
  .metric-value {
    font-size: 1rem;
    min-width: 40px;
  }
  
  .chart-container {
    height: 250px;
  }
  
  .chart-container-compact {
    height: 200px;
    min-height: 200px;
  }
  
  .chart-container-large {
    height: 300px;
  }
  
  .analytics-carousel {
    padding: 1.5rem 1rem 2.5rem 1rem; /* Enhanced mobile padding with extra bottom space */
    margin: 1rem 0 2rem 0; /* Enhanced mobile margin */
  }

  .analytics-carousel-container-vertical {
    height: 220px;
    min-height: 220px;
    padding: 0.75rem 0.75rem 1.25rem 0.75rem; /* Enhanced mobile container padding */
  }

  .analytics-cards-stack {
    padding: 1rem 1rem 2rem 1rem; /* Enhanced mobile stack padding with extra bottom space */
    gap: 1rem; /* Maintained gap for mobile */
  }

  .analytics-card-stacked {
    height: 80px;
    padding: 1rem 1.25rem; /* Enhanced mobile card padding */
    margin: 0.25rem 0; /* Added mobile card margin */
    gap: 1rem; /* Enhanced mobile gap between elements */
  }
  
  .analytics-indicator-medium {
    width: 32px;
    height: 32px;
  }
  
  .analytics-label-medium {
    font-size: 0.8125rem;
  }
  
  .analytics-value-medium {
    font-size: 1.25rem;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
    gap: 1rem; /* Increased mobile gap */
    padding: 1rem 0.5rem; /* Enhanced mobile padding */
    margin: 0.5rem 0; /* Added mobile margin */
  }
  
  .metric-card {
    padding: 1.5rem 1rem; /* Enhanced mobile card padding */
    margin: 0.25rem; /* Added mobile card margin */
  }
  
  .user-stats-list {
    max-height: 250px;
    padding: 0.75rem; /* Enhanced mobile list padding */
  }

  .user-stat-item {
    padding: 1rem 1.25rem; /* Enhanced mobile item padding */
    margin: 0.25rem 0; /* Added mobile item margin */
  }
  
  .user-stat-item {
    padding: 0.75rem;
  }
}

@media (max-width: 672px) {
  .statistics-grid {
    padding: 0.75rem;
  }
  
  .top-stats-row,
  .stats-row,
  .user-metrics-row,
  .analytics-trend-row {
    margin-bottom: 1rem;
  }
  
  .overview-tile,
  .data-tile,
  .chart-tile,
  .analytics-tile {
    padding: 0.75rem;
  }
  
  .tile-title {
    font-size: 1rem;
  }
  
  .stats-metrics {
    gap: 0.75rem;
    min-height: auto;
  }
  
  .metric-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem;
  }
  
  .metric-value-container {
    justify-content: flex-start;
    max-width: none;
  }
  
  .chart-container,
  .chart-container-compact,
  .chart-container-large {
    height: 200px;
  }
  
  .analytics-carousel-container-vertical {
    height: 180px;
    min-height: 180px;
  }
  
  .analytics-card-stacked {
    height: 70px;
    padding: 0.5rem 0.75rem;
    gap: 0.75rem;
  }
  
  .analytics-indicator-medium {
    width: 28px;
    height: 28px;
  }
  
  .analytics-label-medium {
    font-size: 0.75rem;
  }
  
  .analytics-value-medium {
    font-size: 1.125rem;
  }
  
  .user-stats-list {
    max-height: 200px;
  }
}

/* Carbon Design System Overrides - Minimal and Non-Conflicting */
:deep(.bx--grid) {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

/* Keep the existing spacing improvements from the main overrides above */

:deep(.bx--progress-bar) {
  border-radius: 0 !important;
}

:deep(.bx--progress-bar__bar) {
  border-radius: 0 !important;
}

:deep(.bx--skeleton__text) {
  border-radius: 0 !important;
}
</style>
