<template>
  <div class="statistics-container">
    <div class="page-header">
      <h1 class="page-title">Cubicle Statistics Overview</h1>
      <p class="page-subtitle">Real-time analytics and usage metrics</p>
    </div>
    
    <!-- Main Statistics Dashboard -->
    <cv-grid class="statistics-grid">
      <!-- General Usage Overview -->
      <cv-row class="stats-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile class="overview-tile">
            <div class="tile-header">
              <h3 class="tile-title">General Usage</h3>
              <p class="tile-subtitle">Overall cubicle utilization metrics</p>
            </div>
            <div class="stats-metrics">
              <div class="metric-item">
                <span class="metric-label">Reserved</span>
                <div class="metric-value-container">
                  <span class="metric-value">{{ generalStats.percentReserved }}%</span>
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
                  <span class="metric-value">{{ generalStats.percentAvailable }}%</span>
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
                  <span class="metric-value">{{ generalStats.percentError }}%</span>
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
      </cv-row>
      
      <!-- Usage Distribution Row -->
      <cv-row class="stats-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile class="chart-tile">
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
        <cv-column :sm="4" :md="16" :lg="16">
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
        <cv-column :sm="4" :md="16" :lg="16">
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

      <!-- User Statistics Row -->
      <cv-row class="stats-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile class="data-tile">
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
      </cv-row>
      
      <!-- Key Metrics Row -->
      <cv-row class="stats-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile class="data-tile">
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
      
      <!-- Advanced Analytics Row -->
      <cv-row class="stats-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile class="analytics-tile">
            <div class="tile-header">
              <h3 class="tile-title">Advanced Analytics</h3>
              <p class="tile-subtitle">Comprehensive usage insights and trends</p>
            </div>
            <div class="analytics-grid">
              <div class="analytics-card">
                <div class="analytics-icon">📊</div>
                <div class="analytics-content">
                  <span class="analytics-label">Total Reservations</span>
                  <span class="analytics-value">{{ advancedMetrics.totalReservations }}</span>
                </div>
              </div>
              <div class="analytics-card">
                <div class="analytics-icon">👥</div>
                <div class="analytics-content">
                  <span class="analytics-label">Active Users</span>
                  <span class="analytics-value">{{ advancedMetrics.activeUsers }}</span>
                </div>
              </div>
              <div class="analytics-card">
                <div class="analytics-icon">⚡</div>
                <div class="analytics-content">
                  <span class="analytics-label">Peak Usage</span>
                  <span class="analytics-value">{{ advancedMetrics.peakUsage }}%</span>
                </div>
              </div>
              <div class="analytics-card">
                <div class="analytics-icon">📈</div>
                <div class="analytics-content">
                  <span class="analytics-label">Avg. User Reservations</span>
                  <span class="analytics-value">{{ advancedMetrics.avgReservations }}</span>
                </div>
              </div>
              <div class="analytics-card">
                <div class="analytics-icon">🎯</div>
                <div class="analytics-content">
                  <span class="analytics-label">Utilization Rate</span>
                  <span class="analytics-value">{{ advancedMetrics.utilizationRate }}%</span>
                </div>
              </div>
              <div class="analytics-card">
                <div class="analytics-icon">⚠️</div>
                <div class="analytics-content">
                  <span class="analytics-label">Error Rate</span>
                  <span class="analytics-value">{{ advancedMetrics.errorRate }}%</span>
                </div>
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- Time-based Analysis Row -->
      <cv-row class="stats-row">
        <cv-column :sm="4" :md="16" :lg="16">
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
    });

    return { 
      generalStats, 
      userStats, 
      comparisonStats,
      sectionStats,
      chartData,
      chartOptions,
      advancedMetrics
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
  margin-bottom: 1rem;
}

/* Tile Styling */
.overview-tile,
.data-tile,
.chart-tile,
.analytics-tile {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 1.5rem;
  height: 100%;
  transition: box-shadow 0.15s ease;
}

.overview-tile:hover,
.data-tile:hover,
.chart-tile:hover,
.analytics-tile:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.tile-header {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 1rem;
}

.tile-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #161616;
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
}

.tile-subtitle {
  font-size: 0.875rem;
  color: #6f6f6f;
  margin: 0;
  font-weight: 400;
}

/* General Usage Metrics */
.stats-metrics {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.metric-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #393939;
  min-width: 80px;
}

.metric-value-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  max-width: 300px;
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

/* Analytics Grid and Cards */
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.analytics-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background-color: #f4f4f4;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: all 0.15s ease;
}

.analytics-card:hover {
  background-color: #e8e8e8;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.analytics-icon {
  font-size: 2rem;
  min-width: 48px;
  text-align: center;
  background: linear-gradient(135deg, #0f62fe, #8a3ffc);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.analytics-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.analytics-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #393939;
  margin-bottom: 0.25rem;
}

.analytics-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #161616;
  line-height: 1.2;
}

/* Enhanced Responsive Design */
@media (max-width: 1200px) {
  .analytics-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
  
  .chart-container {
    height: 250px;
  }
  
  .chart-container-large {
    height: 300px;
  }
}

@media (max-width: 768px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }
  
  .analytics-card {
    padding: 1rem;
  }
  
  .analytics-icon {
    font-size: 1.5rem;
    min-width: 36px;
  }
  
  .analytics-value {
    font-size: 1.25rem;
  }
  
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

/* Enhanced Analytics Card Variants */
.analytics-card:nth-child(1) .analytics-icon { 
  background: linear-gradient(135deg, #0f62fe, #0043ce);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.analytics-card:nth-child(2) .analytics-icon { 
  background: linear-gradient(135deg, #24a148, #198038);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.analytics-card:nth-child(3) .analytics-icon { 
  background: linear-gradient(135deg, #ff832b, #eb6200);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.analytics-card:nth-child(4) .analytics-icon { 
  background: linear-gradient(135deg, #8a3ffc, #6929c4);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.analytics-card:nth-child(5) .analytics-icon { 
  background: linear-gradient(135deg, #fa4d56, #da1e28);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

.analytics-card:nth-child(6) .analytics-icon { 
  background: linear-gradient(135deg, #42be65, #24a148);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
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
  border-radius: 4px;
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
}

.metric-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: #f4f4f4;
  border-radius: 4px;
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
}

/* Responsive Design */
@media (max-width: 768px) {
  .statistics-container {
    margin-top: 48px;
  }
  
  .page-header {
    padding: 1.5rem 1rem 1rem 1rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .statistics-grid {
    padding: 1rem;
  }
  
  .overview-tile,
  .data-tile {
    padding: 1rem;
  }
  
  .metric-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .metric-value-container {
    width: 100%;
    max-width: none;
  }
  
  .user-stat-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .user-progress {
    width: 100%;
    margin-left: 0;
    min-width: auto;
    max-width: none;
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
  border-radius: 4px;
}

:deep(.bx--skeleton-text) {
  margin-bottom: 0.5rem;
}
</style>
