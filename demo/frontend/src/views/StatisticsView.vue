<template>
  <div class="statistics-container">
    <div class="page-header">
      <h1 class="page-title">Cubicle Statistics Overview</h1>
      <p class="page-subtitle">Real-time analytics and usage metrics</p>
    </div>
    
    <!-- Main Statistics Dashboard -->
    <cv-grid class="statistics-grid">
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
                    kind="error"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </cv-tile>
        </cv-column>
        
        <!-- Usage Distribution - Right Half -->
        <cv-column :sm="4" :md="6" :lg="6">
          <cv-tile class="chart-tile transparent-tile">
            <div class="tile-header">
              <h3 class="tile-title">Usage Distribution</h3>
              <p class="tile-subtitle">Visual breakdown of cubicle status</p>
            </div>
            <div class="chart-container chart-container-compact">
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
                :options="chartOptions.horizontalBar"
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
                <cv-skeleton-text :paragraph="true" :line-count="3" />
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
    </cv-grid>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Doughnut, Bar, Line } from 'vue-chartjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default {
  name: 'StatisticsView',
  components: {
    Doughnut,
    Bar,
    Line
  },
  setup() {
    const generalStats = ref({ percentReserved: 0, percentAvailable: 0, percentError: 0 });
    const userStats = ref([]);
    const comparisonStats = ref([]);
    const sectionStats = ref([]); // Add section stats
    const currentAnalyticsIndex = ref(0);
    const analyticsInterval = ref(null);
    const chartData = ref({
      doughnut: null,
      userActivity: null,
      sectionAnalysis: null,
      timeSeries: null
    });

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
      horizontalBar: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.x}`;
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
      stopAnalyticsCarousel(); // Clear any existing interval
      analyticsInterval.value = setInterval(() => {
        nextAnalytics();
      }, 4000); // Change every 4 seconds
    }

    function stopAnalyticsCarousel() {
      if (analyticsInterval.value) {
        clearInterval(analyticsInterval.value);
        analyticsInterval.value = null;
      }
    }

    function nextAnalytics() {
      if (analyticsData.value.length > 0) {
        // Show 2 cards at a time, so we need to cycle through pairs
        const maxIndex = Math.floor(analyticsData.value.length / 2) - 1;
        currentAnalyticsIndex.value = (currentAnalyticsIndex.value + 1) % (maxIndex + 1);
      }
    }

    function setCurrentAnalytics(index) {
      currentAnalyticsIndex.value = index;
      startAnalyticsCarousel(); // Restart the auto-advance timer
    }

    // Generate chart data
    function generateChartData() {
      // Doughnut chart for usage distribution
      chartData.value.doughnut = {
        labels: ['Reserved', 'Available', 'Error'],
        datasets: [{
          data: [
            generalStats.value.percentReserved,
            generalStats.value.percentAvailable,
            generalStats.value.percentError
          ],
          backgroundColor: [
            '#0f62fe', // IBM Blue
            '#24a148', // IBM Green
            '#da1e28'  // IBM Red
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      };

      // User activity bar chart
      if (userStats.value.length > 0) {
        chartData.value.userActivity = {
          labels: userStats.value.map(user => user.user.split('@')[0]), // Extract username
          datasets: [{
            label: 'Reservations',
            data: userStats.value.map(user => user.reserved),
            backgroundColor: '#0f62fe',
            borderColor: '#0043ce',
            borderWidth: 1
          }]
        };
      }

      // Section analysis using real API data
      if (sectionStats.value.length > 0) {
        chartData.value.sectionAnalysis = {
          labels: sectionStats.value.map(section => `Section ${section.section}`),
          datasets: [{
            label: 'Reserved Cubicles',
            data: sectionStats.value.map(section => section.reserved),
            backgroundColor: [
              '#0f62fe', // IBM Blue for Section A
              '#8a3ffc', // IBM Purple for Section B  
              '#fa4d56'  // IBM Red for Section C
            ],
            borderWidth: 1
          }, {
            label: 'Available Cubicles', 
            data: sectionStats.value.map(section => section.available),
            backgroundColor: [
              '#42be65', // IBM Green for Section A
              '#24a148', // IBM Dark Green for Section B
              '#198038'  // IBM Darker Green for Section C
            ],
            borderWidth: 1
          }]
        };
      }

      // Time series data (simulated historical usage)
      const timeLabels = ['6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM'];
      const usageData = [15, 35, 65, 80, 75, 55, 25];
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
            fill: true
          },
          {
            label: 'Available %',
            data: availableData,
            borderColor: '#24a148',
            backgroundColor: 'rgba(36, 161, 72, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      };
    }

    let socket;
    
    async function fetchStats() {
      try {
        console.log('Fetching statistics...');
        const res = await axios.get('/api/cubicle-stats');
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
        
        // Add unique IDs to comparison stats
        if (res.data.comparisons) {
          comparisonStats.value = res.data.comparisons.map((comp, index) => ({
            id: `comp-${index}`,
            ...comp
          }));
        }
        
        // Generate chart data after fetching stats
        generateChartData();
      } catch (err) {
        console.error('Error fetching statistics:', err);
      }
    }
    
    onMounted(() => {
      fetchStats();
      startAnalyticsCarousel(); // Start analytics carousel
      
      // Connect to backend websocket
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      socket = io(apiUrl);
      
      socket.on('connect', () => {
        console.log('Connected to real-time statistics');
      });
      
      socket.on('statisticsUpdate', (stats) => {
        console.log('Received statistics update:', stats);
        
        // Map the API response structure to what the frontend expects
        if (stats.general) {
          generalStats.value = {
            percentReserved: stats.general.percentReserved || 0,
            percentAvailable: stats.general.percentAvailable || 0,
            percentError: stats.general.percentError || 0
          };
        }
        
        if (stats.sections) sectionStats.value = stats.sections;
        
        if (stats.users) {
          userStats.value = stats.users.map((user, index) => ({
            id: `user-${index}`,
            ...user
          }));
        }
        
        if (stats.comparisons) {
          comparisonStats.value = stats.comparisons.map((comp, index) => ({
            id: `comp-${index}`,
            ...comp
          }));
        }
        
        // Regenerate charts when data updates
        generateChartData();
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
      setCurrentAnalytics
    };
  },
};
</script>

<style scoped>
/* IBM Carbon Design System inspired styling */
.statistics-container {
  padding: 0;
  margin-top: 64px; /* Space for navbar - same as homepage grid */
  background-color: #f4f4f4;
  min-height: calc(100vh - 64px);
}

.page-header {
  background-color: #ffffff;
  padding: 2rem 2rem 1.5rem 2rem;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 0;
}

.page-title {
  font-size: 2rem;
  font-weight: 400;
  color: #161616;
  margin: 0 0 0.5rem 0;
  line-height: 1.25;
}

.page-subtitle {
  font-size: 1rem;
  color: #525252;
  margin: 0;
  font-weight: 400;
}

.statistics-grid {
  padding: 1.5rem;
  max-width: 1584px;
  margin: 0 auto;
}

.stats-row {
  margin-bottom: 2rem;
}

/* Tile Styling - IBM Carbon Design Consistent */
.overview-tile,
.data-tile,
.chart-tile,
.analytics-tile {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(224, 224, 224, 0.3);
  border-radius: 0; /* Sharp edges */
  padding: 1.5rem;
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

.metric-value {
  font-size: 1rem;
  font-weight: 600;
  color: #161616;
  min-width: 40px;
}

/* Chart Styling */
.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
  margin-top: 1rem;
}

.chart-container-compact {
  height: 250px; /* Smaller height for side-by-side layout */
  min-height: 250px;
}

.chart-container-large {
  height: 400px;
}

.chart-canvas {
  width: 100% !important;
  height: 100% !important;
}

.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #6f6f6f;
  font-style: italic;
}

/* Analytics Carousel Styles */
.analytics-carousel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 0;
}

.analytics-carousel-container {
  position: relative;
  width: 100%;
  max-width: 450px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 0; /* Sharp edges */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
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
}

.analytics-cards-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
}

.analytics-card-stacked {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #e0e0e0;
  border-radius: 0; /* Sharp edges */
  width: 100%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  height: 100px;
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

.analytics-card-single {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #e0e0e0;
  border-radius: 0; /* Sharp edges */
  width: 100%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.analytics-card-single::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #0f62fe, #0043ce);
}

.analytics-card-single:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  border-color: #0f62fe;
}

.analytics-indicator-large {
  width: 48px;
  height: 48px;
  border-radius: 0; /* Sharp edges */
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  border: 2px solid;
}

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

.analytics-indicator-large.utilization-avg {
  background: linear-gradient(135deg, #d9f0dd, #e8f5e8);
  border-color: #198038;
}

.analytics-indicator-large.utilization-avg::before {
  content: '';
  width: 20px;
  height: 20px;
  background: #198038;
  border-radius: 4px;
  transform: rotate(45deg);
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

.analytics-indicator-large.utilization-peak {
  background: linear-gradient(135deg, #fef7cd, #fefbde);
  border-color: #f1c21b;
}

.analytics-indicator-large.utilization-peak::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 16px solid #f1c21b;
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

.analytics-indicator-large.reservations {
  background: linear-gradient(135deg, #d0e2ff, #e0efff);
  border-color: #0f62fe;
}

.analytics-indicator-large.reservations::before {
  content: '';
  width: 20px;
  height: 20px;
  background: #0f62fe;
  border-radius: 50%;
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

.analytics-indicator-large.users {
  background: linear-gradient(135deg, #f0e6ff, #f7f0ff);
  border-color: #8a3ffc;
}

.analytics-indicator-large.users::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: 20px solid #8a3ffc;
  border-radius: 2px;
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

.analytics-indicator-large.error-rate {
  background: linear-gradient(135deg, #fdebed, #ffffff);
  border-color: #da1e28;
}

.analytics-indicator-large.error-rate::before {
  content: '';
  width: 16px;
  height: 16px;
  background: #da1e28;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
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

.analytics-label-large {
  font-size: 1rem;
  font-weight: 600;
  color: #6f6f6f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.analytics-value-large {
  font-size: 2.25rem;
  font-weight: 700;
  color: #161616;
  line-height: 1.1;
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

/* Analytics and Usage Trend Side-by-Side Layout */
.stats-row .cv-column:first-child {
  padding-right: 0.5rem;
}

.stats-row .cv-column:last-child {
  padding-left: 0.5rem;
}

/* Enhanced Responsive Design for Analytics Carousel */
@media (max-width: 768px) {
  .analytics-carousel-container {
    max-width: 100%;
    height: 100px;
  }
  
  .analytics-card-single {
    padding: 1.25rem 1.5rem;
    gap: 1rem;
  }
  
  .analytics-indicator-large {
    width: 40px;
    height: 40px;
  }
  
  .stats-row .cv-column:first-child,
  .stats-row .cv-column:last-child {
    padding-left: 0;
    padding-right: 0;
    margin-bottom: 1rem;
  }
  
  .analytics-value-large {
    font-size: 1.875rem;
  }
  
  .analytics-label-large {
    font-size: 0.875rem;
  }
}

@media (min-width: 1400px) {
  .analytics-carousel-container {
    max-width: 500px;
    height: 140px;
  }
  
  .analytics-card-single {
    padding: 2rem 2.5rem;
    gap: 2rem;
  }
  
  .analytics-indicator-large {
    width: 56px;
    height: 56px;
  }
  
  .analytics-value-large {
    font-size: 2.5rem;
  }
  
  .analytics-label-large {
    font-size: 1.125rem;
  }
}

/* Enhanced Responsive Design */
@media (max-width: 1200px) {
  .chart-container {
    height: 250px;
  }
  
  .chart-container-large {
    height: 300px;
  }
}

@media (max-width: 768px) {
  .chart-container,
  .chart-container-large {
    height: 200px;
  }
}

/* Chart Tile Specific Styling */
.chart-tile .tile-header {
  margin-bottom: 1rem;
}

/* Loading Animation */
.chart-loading {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* User Statistics List */
.data-table-container {
  max-height: 400px;
  overflow-y: auto;
}

.user-stats-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.user-stat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background-color: #f4f4f4;
  border-radius: 0; /* Sharp edges */
  border: 1px solid #e0e0e0;
  transition: background-color 0.15s ease;
}

.user-stat-item:hover {
  background-color: #e8e8e8;
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.user-email {
  font-size: 0.875rem;
  font-weight: 600;
  color: #161616;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-count {
  font-size: 0.75rem;
  color: #6f6f6f;
  margin-top: 0.125rem;
}

.user-progress {
  min-width: 120px;
  max-width: 120px;
  margin-left: 1rem;
}

/* Key Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  min-height: 120px;
}

.metric-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #f4f4f4;
  border-radius: 0; /* Sharp edges */
  border: 1px solid #e0e0e0;
  transition: background-color 0.15s ease;
}

.metric-card:hover {
  background-color: #e8e8e8;
}

.metric-card-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #393939;
}

.metric-card-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #161616;
}

/* Loading States */
.no-data {
  padding: 1.5rem;
  text-align: center;
  color: #6f6f6f;
  font-style: italic;
  min-height: 120px;
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
    overflow-x: hidden; /* Prevent horizontal scroll */
  }
  
  .page-header {
    padding: 1.5rem 1rem;
    text-align: center;
  }
  
  .page-title {
    font-size: 1.75rem;
    margin-bottom: 0.5rem;
  }
  
  .page-subtitle {
    font-size: 0.875rem;
  }
  
  .statistics-grid {
    padding: 0.75rem;
    gap: 0.75rem;
    margin: 0;
    width: 100%;
    max-width: 100%;
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
    font-size: 1.125rem;
  }
  
  .tile-subtitle {
    font-size: 0.8125rem;
  }
  
  /* Stack columns properly on mobile */
  .top-stats-row .cv-column,
  .user-metrics-row .cv-column,
  .analytics-trend-row .cv-column {
    padding-left: 0;
    padding-right: 0;
    margin-bottom: 0.75rem;
  }
  
  /* Enhanced metric items for mobile */
  .stats-metrics {
    gap: 1rem;
    min-height: auto;
  }
  
  .metric-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 0.75rem;
    text-align: center;
  }
  
  .metric-label {
    min-width: auto;
    font-size: 0.8125rem;
  }
  
  .metric-value-container {
    width: 100%;
    max-width: none;
    justify-content: center;
    gap: 0.75rem;
  }
  
  .metric-value {
    font-size: 1.25rem;
    text-align: center;
    min-width: auto;
  }
  
  /* Chart containers for mobile */
  .chart-container {
    height: 250px;
    padding: 0.5rem;
  }
  
  .chart-container-compact {
    height: 200px;
  }
  
  .chart-container-large {
    height: 300px;
  }
  
  /* User stats mobile optimization */
  .user-stat-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 0.75rem;
  }
  
  .user-info {
    text-align: center;
  }
  
  .user-progress {
    width: 100%;
    margin-left: 0;
    min-width: auto;
    max-width: none;
  }
  
  /* Analytics carousel mobile */
  .analytics-carousel-container-vertical {
    gap: 0.75rem;
  }
  
  .analytics-card-stacked {
    height: auto;
    min-height: 80px;
    padding: 0.75rem 1rem;
  }
  
  .analytics-indicator-medium {
    width: 28px;
    height: 28px;
  }
  
  .analytics-label-medium {
    font-size: 0.8125rem;
  }
  
  .analytics-value-medium {
    font-size: 1rem;
  }
}

/* Small mobile devices */
@media (max-width: 480px) {
  .page-header {
    padding: 1rem 0.75rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .statistics-grid {
    padding: 0.5rem;
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
  
  .chart-container {
    height: 200px;
    padding: 0.25rem;
  }
  
  .chart-container-compact {
    height: 150px;
  }
  
  .chart-container-large {
    height: 250px;
  }
  
  .metric-item {
    padding: 0.5rem;
  }
  
  .metric-value {
    font-size: 1.125rem;
  }
  
  /* Ensure proper spacing between sections */
  .stats-row,
  .user-metrics-row,
  .analytics-trend-row {
    margin-bottom: 0.75rem;
  }
}

/* Carbon component overrides */
:deep(.bx--progress-bar) {
  min-width: 100px;
}

:deep(.bx--progress-bar__label) {
  font-size: 0.75rem;
  font-weight: 600;
}

:deep(.bx--tile) {
  border-radius: 0 !important; /* Sharp edges for all tiles */
}

:deep(.bx--skeleton-text) {
  margin-bottom: 0.5rem;
}
</style>
