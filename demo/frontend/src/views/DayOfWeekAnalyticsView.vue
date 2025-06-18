<!--
===================================================================
VIEWS: DayOfWeekAnalyticsView
===================================================================
PURPOSE: 
Specialized analytics dashboard for day-of-week cubicle usage analysis.
Provides comprehensive insights into usage patterns for specific days
across different time periods with advanced statistical visualizations.

FEATURES:
- Day-of-week specific analytics with date filtering
- Comparative analysis between different days
- Statistical trend analysis and pattern recognition
- Interactive Chart.js visualizations
- Month/Year f  // Check if selected date is in the occurrences, if not, add it
  if (!comparisonData.value.selectedDateIsInOccurrences) {
    const selectedDateLabel = `${formatDateForDisplay(comparisonData.value.selectedDate)} (Today)`;
    dates.push(selectedDateLabel);
    reservationCounts.push(comparisonData.value.todayStats.totalReservations);
  } with date picker integration
- Section-wise and user-wise breakdowns
- Export capabilities for reports
- Real-time data refresh
- IBM Carbon Design System compliance

INTEGRATION:
- Routes: /analytics/day-of-week, /analytics/day-of-week/:day/:month/:year
- Authentication: Requires valid Firebase auth token
- API Dependencies: /api/analytics/day-of-week/* endpoints
- Global State: Uses useDateStore for date management
- Components: PageHeader, Chart.js components

CORE FUNCTIONALITY:
1. **Day Selection**: Choose specific days of the week for analysis
2. **Date Filtering**: Select month and year for focused analysis
3. **Comparative Analysis**: Compare multiple days side-by-side
4. **Trend Analysis**: View usage patterns over time
5. **Statistical Insights**: Advanced metrics and calculations

DATA FLOW:
- selectedDay + selectedMonth/Year → API endpoints → analytics processing
- API responses → data validation → chart generation → UI update
- User interactions → parameter updates → data refresh

CHART TYPES:
- Bar Charts: Day-specific usage distribution
- Line Charts: Trend analysis over time periods
- Doughnut Charts: Section and user distribution
- Comparison Charts: Multi-day comparative analysis

LAST UPDATED: December 2024
===================================================================
-->

<template>
  <div class="day-of-week-analytics-container">
    <!-- Consistent Page Header -->
    <PageHeader
      title="Day-of-Week Analytics Dashboard"
      subtitle="Comprehensive analysis of cubicle usage patterns by specific days of the week"
    />
    
    <!-- User Notification Toast -->
    <cv-toast-notification
      v-if="error"
      kind="error"
      :title="'Analytics Error'"
      :sub-title="error"
      :close-aria-label="'Dismiss notification'"
      @close="clearError"
      class="analytics-notification"
    />
    
    <!-- Loading Indicator -->
    <div v-if="isLoading" class="loading-overlay">
      <cv-loading description="Loading day-of-week analytics..." />
    </div>

    
    <!-- Main Analytics Dashboard -->
    <cv-grid class="analytics-grid">
      <div class="analytics-content-wrapper">
        
        <!-- Controls Section -->
        <cv-row class="controls-row">
          <cv-column :sm="4" :md="12" :lg="12">
            <cv-tile class="controls-tile formatted-tile">
              <div class="tile-header">
                <h3 class="tile-title">Analytics Controls</h3>
                <p class="tile-subtitle">Configure day-of-week analysis parameters</p>
              </div>
              
              <cv-grid class="controls-grid">
                <!-- Day Selection Row -->
                <cv-row class="day-selection-row">
                  <cv-column :sm="4" :md="12" :lg="12">
                    <div class="dropdown-wrapper dropdown-fixed-height">
                      <label class="bx--label">Day of Week</label>
                      <div class="dropdown-container">
                        <cv-dropdown 
                          :value="selectedDay"
                          @change="(val) => { selectedDay = val; handleDayChange(); }"
                          :key="'day-dropdown-' + selectedDay"
                          :label="selectedDay || 'Select Day of Week'"
                          title-attribute="selectedDay"
                          class="day-selector"
                        >
                          <cv-dropdown-item value="Monday">Monday</cv-dropdown-item>
                          <cv-dropdown-item value="Tuesday">Tuesday</cv-dropdown-item>
                          <cv-dropdown-item value="Wednesday">Wednesday</cv-dropdown-item>
                          <cv-dropdown-item value="Thursday">Thursday</cv-dropdown-item>
                          <cv-dropdown-item value="Friday">Friday</cv-dropdown-item>
                          <cv-dropdown-item value="Saturday">Saturday</cv-dropdown-item>
                          <cv-dropdown-item value="Sunday">Sunday</cv-dropdown-item>
                        </cv-dropdown>
                      </div>
                      <!-- This hidden placeholder maintains consistent layout -->
                      <div class="dropdown-menu-placeholder"></div>
                    </div>
                  </cv-column>
                </cv-row>
                
                <!-- Action Buttons Row -->
                <cv-row class="action-buttons-row">
                  <cv-column :sm="4" :md="6" :lg="6" class="action-button-column">
                    <cv-button
                      kind="secondary"
                      @click="compareDaysWithToday"
                      :disabled="isLoading || !selectedDay"
                      class="compare-button full-width-button"
                      style="width: 100% !important; display: block !important; min-width: 100% !important;"
                    >
                      {{ isLoading ? 'Loading...' : 'Compare Days' }}
                    </cv-button>
                  </cv-column>
                  
                  <cv-column :sm="4" :md="6" :lg="6" class="action-button-column">
                    <cv-button
                      kind="secondary"
                      @click="resetAnalytics"
                      class="reset-button full-width-button blue-button"
                      style="width: 100% !important; display: block !important; min-width: 100% !important;"
                    >
                      Reset View
                    </cv-button>
                  </cv-column>
                </cv-row>
              </cv-grid>
            </cv-tile>
          </cv-column>
        </cv-row>
        
        <!-- Summary Cards Row with transition -->
        <transition name="fade" mode="out-in">
          <cv-row v-if="comparisonData" :key="transitionKey" class="summary-row" :class="{ 'placeholder-content': comparisonData.isPlaceholder }">
            <cv-column :sm="4" :md="12" :lg="12" class="placeholder-instruction-column full-width-mobile" 
                      v-if="comparisonData.isPlaceholder || needsRefresh">
              <transition name="fade" mode="out-in">
                <div :key="needsRefresh ? 'refresh' : 'placeholder'"
                     :class="['placeholder-instruction', {'refresh-instruction': needsRefresh}]">
                  <p v-if="comparisonData.isPlaceholder">
                    Select a day of the week and click the <strong>"Compare Days"</strong> button to load analytics data
                  </p>
                  <p v-else-if="needsRefresh">
                    Click the <strong>"Compare Days"</strong> button to update the analytics data
                  </p>
                </div>
              </transition>
            </cv-column>
          
          <template v-if="!comparisonData.isPlaceholder">
            <cv-column :sm="4" :md="3" :lg="3" class="full-width-mobile summary-column">
              <cv-tile class="summary-tile formatted-tile chart-transition">
                <div class="tile-header">
                  <h4 class="tile-title">Selected Date</h4>
                </div>
                <div class="summary-content">
                  <span class="summary-value primary-value">{{ comparisonData.todayStats?.totalReservations || 0 }}</span>
                  <span class="summary-label">reserved cubicles</span>
                </div>
              </cv-tile>
            </cv-column>
            
            <cv-column :sm="4" :md="3" :lg="3" class="full-width-mobile summary-column">
              <cv-tile class="summary-tile formatted-tile chart-transition">
                <div class="tile-header">
                  <h4 class="tile-title">Current Utilization</h4>
                </div>
                <div class="summary-content">
                  <span class="summary-value success-value">{{ formatUtilizationPercentage(comparisonData.todayStats?.utilizationRate) }}</span>
                  <span class="summary-label">of available cubicles</span>
                </div>
              </cv-tile>
            </cv-column>
            
            <cv-column :sm="4" :md="3" :lg="3" class="full-width-mobile summary-column">
              <cv-tile class="summary-tile formatted-tile chart-transition">
                <div class="tile-header">
                  <h4 class="tile-title">Avg Utilization</h4>
                </div>
                <div class="summary-content">
                  <span class="summary-value secondary-value">{{ formatAverageUtilization(comparisonData.overallMetrics?.averageReservations) }}</span>
                  <span class="summary-label">on {{ selectedDay }}s</span>
                </div>
              </cv-tile>
            </cv-column>
            
            <cv-column :sm="4" :md="3" :lg="3" class="full-width-mobile summary-column">
              <cv-tile class="summary-tile formatted-tile chart-transition">
                <div class="tile-header">
                  <h4 class="tile-title">Performance</h4>
                </div>
                <div class="summary-content">                <span class="summary-value" :class="getPerformanceClass(comparisonData.overallMetrics?.todayVsAverage)">
                  {{ formatPerformanceVsAverage(comparisonData.overallMetrics?.todayVsAverage) }}
                </span>
                <span class="summary-label">vs other {{ selectedDay }}s</span>
                </div>
              </cv-tile>
            </cv-column>
          </template>
          
          <template v-else>
            <!-- In placeholder mode, show metrics cards with dash values -->
            <cv-column :sm="4" :md="3" :lg="3" class="full-width-mobile summary-column">
              <cv-tile class="summary-tile formatted-tile placeholder-tile chart-transition">
                <div class="tile-header">
                  <h4 class="tile-title">Selected Date</h4>
                </div>
                <div class="summary-content">
                  <span class="summary-value primary-value">--</span>
                  <span class="summary-label">reserved cubicles</span>
                </div>
              </cv-tile>
            </cv-column>
            
            <cv-column :sm="4" :md="3" :lg="3" class="full-width-mobile summary-column">
              <cv-tile class="summary-tile formatted-tile placeholder-tile chart-transition">
                <div class="tile-header">
                  <h4 class="tile-title">Current Utilization</h4>
                </div>
                <div class="summary-content">
                  <span class="summary-value success-value">--%</span>
                  <span class="summary-label">of available cubicles</span>
                </div>
              </cv-tile>
            </cv-column>
            
            <cv-column :sm="4" :md="3" :lg="3" class="full-width-mobile summary-column">
              <cv-tile class="summary-tile formatted-tile placeholder-tile chart-transition">
                <div class="tile-header">
                  <h4 class="tile-title">Avg Utilization</h4>
                </div>
                <div class="summary-content">
                  <span class="summary-value secondary-value">--%</span>
                  <span class="summary-label">on {{ selectedDay }}s</span>
                </div>
              </cv-tile>
            </cv-column>
            
            <cv-column :sm="4" :md="3" :lg="3" class="full-width-mobile summary-column">
              <cv-tile class="summary-tile formatted-tile placeholder-tile chart-transition">
                <div class="tile-header">
                  <h4 class="tile-title">Performance</h4>
                </div>
                <div class="summary-content">
                  <span class="summary-value neutral-value">--%</span>
                  <span class="summary-label">vs other {{ selectedDay }}s</span>
                </div>
              </cv-tile>
            </cv-column>
          </template>
        </cv-row>
        </transition>          <!-- Charts Section with transition -->
        <transition name="fade" mode="out-in">
          <cv-row v-if="comparisonData" :key="transitionKey" class="charts-row">
            <!-- Usage Chart -->
          <cv-column :sm="4" :md="6" :lg="6" class="full-width-mobile">
            <cv-tile class="chart-tile">
              <div class="tile-header">
                <h3 class="tile-title">Day-of-Week Comparison</h3>
                <p class="tile-subtitle" ref="chartSubtitle">
                  All {{ selectedDay }}s in 90-day range
                </p>
              </div>
              <div class="chart-container chart-transition" :class="{ 'placeholder-content': comparisonData?.isPlaceholder }">
                <Bar 
                  v-if="chartData.usage"
                  :data="chartData.usage" 
                  :options="chartOptions.usage"
                  class="chart-canvas"
                />
                <div v-else class="chart-loading">
                  <cv-skeleton-text :paragraph="true" :line-count="2" />
                </div>
              </div>
            </cv-tile>
          </cv-column>
          
          <!-- Section Analysis -->
          <cv-column :sm="4" :md="6" :lg="6" class="full-width-mobile">
            <cv-tile class="chart-tile">
              <div class="tile-header">
                <h3 class="tile-title">Section Analysis</h3>
                <p class="tile-subtitle">Usage breakdown by office sections</p>
              </div>
              <div class="chart-container chart-transition" :class="{ 'placeholder-content': comparisonData?.isPlaceholder }">
                <Doughnut 
                  v-if="chartData.section"
                  :data="chartData.section" 
                  :options="chartOptions.section"
                  class="chart-canvas"
                />
                <div v-else class="chart-loading">
                  <cv-skeleton-text :paragraph="true" :line-count="2" />
                </div>
              </div>
            </cv-tile>
          </cv-column>
        </cv-row>
        </transition>
        
      </div>
    </cv-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import PageHeader from '../components/PageHeader.vue';
import useAuth from '../composables/useAuth';
import { useDateStore } from '../composables/useDateStore';
import './styles/DayOfWeekAnalyticsViewStyles.css';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement, Filler);

// ================================================================================
// REACTIVE DATA & REFS
// ================================================================================

const route = useRoute();
const router = useRouter();
const { currentUser } = useAuth();
const { selectedDate, selectedDateString, formatDateToString } = useDateStore();

// Chart references
const usageChart = ref<HTMLCanvasElement | null>(null);
const sectionChart = ref<HTMLCanvasElement | null>(null);
const hourlyChart = ref<HTMLCanvasElement | null>(null);
const comparisonChart = ref<HTMLCanvasElement | null>(null);
const userChart = ref<HTMLCanvasElement | null>(null);

// Chart data and options
const chartData = ref<any>({
  usage: null,
  section: null,
  hourly: null,
  comparison: null,
  user: null
});

const chartOptions = ref<any>({
  usage: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Usage Distribution'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Reservations'
        }
      }
    }
  },
  section: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Section Distribution'
      }
    }
  },
  hourly: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Hourly Usage Pattern'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Reservations'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Hour of Day'
        }
      }
    },
  },
  comparison: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Day Comparison'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  },
  user: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Top 10 Active Users'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Reservations'
        }
      }
    }
  }
});

// State
const isLoading = ref(false);
const error = ref<string | null>(null);
const analyticsData = ref<any>(null);
const comparisonData = ref<any>(null);
const transitionKey = ref(0); // Used to trigger transitions
const needsRefresh = ref(false); // Flag to indicate when data needs to be refreshed

// Controls - Simplified to only day selection
const selectedDay = ref('Monday');

// Date range (90 days from today)
const today = new Date();
const maxDate = new Date();
maxDate.setDate(today.getDate() + 90);

// ================================================================================
// COMPUTED PROPERTIES
// ================================================================================

// ================================================================================
// LIFECYCLE HOOKS
// ================================================================================

// Set default day based on current date and load initial data
onMounted(async () => {
  if (!currentUser.value?.uid) return;
  
  try {
    // Default to the current day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayOfWeek = new Date().getDay();
    selectedDay.value = dayNames[currentDayOfWeek];
    
    // Initialize placeholder data instead of loading real data
    initializePlaceholders();
  } catch (err: any) {
    console.error('Error during initialization:', err);
    error.value = err.message || 'Failed to initialize analytics dashboard';
  }
});

// Watch for changes in selectedDateString from the global date store
// We don't automatically refresh data when date changes, only when the user clicks Compare Days
watch(selectedDateString, () => {
  // Only update labels if we're in placeholder mode
  // If real data is loaded, we need user to click Compare Days to update
  if (comparisonData.value?.isPlaceholder && selectedDay.value) {
    updatePlaceholderLabels();
  } else {
    // If we have real data loaded, set the needsRefresh flag
    if (chartOptions.value && !comparisonData.value?.isPlaceholder) {
      needsRefresh.value = true;
    }
  }
}, { immediate: false });

// ================================================================================
// UTILITY FUNCTIONS

/**
 * Get the most recent occurrence of a specific day of the week
 * This will return today if today is the selected day, otherwise the most recent past occurrence
 */


// ================================================================================
// METHODS
// ================================================================================

/**
 * Compare current date with all occurrences of selected day in 90-day range
 */
async function compareDaysWithToday() {
  if (!currentUser.value?.uid || !selectedDay.value) return;

  // Increment transition key to trigger animations
  transitionKey.value++;
  
  // Reset the refresh flag since we're loading fresh data
  needsRefresh.value = false;
  
  isLoading.value = true;
  error.value = null;

  try {
    const token = await currentUser.value.getIdToken();
    
    // Use the selectedDate from the date store - this is the date the user has selected
    const currentDateString = selectedDateString.value;
    
    // Get all occurrences of the selected day within 90 days
    const dayOccurrences = getAllDayOccurrences(selectedDay.value);
    
    // Fetch current selected date's data
    const currentDateResponse = await fetch(
      `/api/cubicles/date/${currentDateString}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const currentDateData = currentDateResponse.ok ? await currentDateResponse.json() : { cubicles: [] };
    
    // Fetch data for all day occurrences
    const dayOccurrencePromises = dayOccurrences.map(async (dateStr) => {
      const response = await fetch(
        `/api/cubicles/date/${dateStr}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const responseData = response.ok ? await response.json() : { cubicles: [] };
      const data = responseData.cubicles || [];
      return {
        date: dateStr,
        reservations: data,
        stats: calculateDayStats(data)
      };
    });
    const dayOccurrenceData = await Promise.all(dayOccurrencePromises);
    
    // Calculate metrics using the current selected date data
    const currentDateStats = calculateDayStats(currentDateData.cubicles || []);
    const overallMetrics = calculateOverallMetrics(currentDateStats, dayOccurrenceData);

    comparisonData.value = {
      todayStats: currentDateStats,
      dayOccurrences: dayOccurrenceData,
      overallMetrics,
      selectedDay: selectedDay.value,
      selectedDate: currentDateString, // Add selected date for reference
      selectedDateIsInOccurrences: dayOccurrences.includes(currentDateString),
      isPlaceholder: false // This is real data, not a placeholder
    };
    
    // Wait for DOM update then create charts
    await nextTick();
    createComparisonCharts();
    
  } catch (err: any) {
    console.error('Error loading comparison data:', err);
    error.value = err.message || 'Failed to load comparison data';
  } finally {
    isLoading.value = false;
  }
}

/**
 * Get all occurrences of a specific day within the 90-day range
 */
function getAllDayOccurrences(dayName: string): string[] {
  const dayMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  
  const targetDay = dayMap[dayName as keyof typeof dayMap];
  const occurrences: string[] = [];
  
  // Start from today and go forward 90 days
  const startDate = new Date(today);
  
  for (let i = 0; i <= 90; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    if (currentDate.getDay() === targetDay) {
      occurrences.push(formatDateToString(currentDate));
    }
  }
  
  return occurrences;
}

function calculateDayStats(cubicles: any[]) {
  
  // Filter only reserved cubicles
  const reservedCubicles = cubicles.filter(cubicle => {
    const isReserved = cubicle.status === 'reserved' || cubicle.isReserved === true || cubicle.dateStatus === 'reserved';
    return isReserved;
  });
  
  // Get total cubicles count (used or not)
  const totalCubiclesCount = cubicles.length || 54; // Default to 54 if no cubicles data available
  
  const totalReservations = reservedCubicles.length;
  const uniqueUsers = new Set(reservedCubicles.map(r => r.reservedBy?.uid || r.user?.uid || r.reservedByUser?.uid).filter(uid => uid)).size;
  
  // Calculate section distribution
  const sectionDistribution = { A: 0, B: 0, C: 0 };
  reservedCubicles.forEach(cubicle => {
    const section = cubicle.section || cubicle.id?.charAt(0) || 'A';
    if (sectionDistribution[section as keyof typeof sectionDistribution] !== undefined) {
      sectionDistribution[section as keyof typeof sectionDistribution]++;
    }
  });
  
  // Calculate hourly distribution (if time data available)
  const hourlyDistribution = new Array(24).fill(0);
  reservedCubicles.forEach(cubicle => {
    if (cubicle.timeSlot) {
      const hour = parseInt(cubicle.timeSlot.split(':')[0]);
      if (!isNaN(hour) && hour >= 0 && hour < 24) {
        hourlyDistribution[hour]++;
      }
    }
  });
  
  const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
  
  return {
    totalReservations,
    uniqueUsers,
    peakHour: `${peakHour}:00`,
    hourlyDistribution,
    sectionDistribution,
    utilizationRate: totalReservations / totalCubiclesCount // Calculate based on actual total
  };
}

/**
 * Calculate overall metrics comparing today with day occurrences
 */
function calculateOverallMetrics(todayStats: any, dayOccurrences: any[]) {
  const averageReservations = dayOccurrences.reduce((sum, day) => sum + day.stats.totalReservations, 0) / dayOccurrences.length;
  
  // Handle edge case where average is 0
  let todayVsAverage = 0;
  if (averageReservations > 0) {
    todayVsAverage = todayStats.totalReservations / averageReservations;
  } else if (todayStats.totalReservations > 0) {
    // If today has reservations but average is 0, it's infinitely better
    todayVsAverage = Number.MAX_SAFE_INTEGER;
  }
  
  return {
    averageReservations,
    todayVsAverage,
    totalOccurrences: dayOccurrences.length,
    bestDay: dayOccurrences.reduce((best, current) => 
      current.stats.totalReservations > best.stats.totalReservations ? current : best
    ),
    worstDay: dayOccurrences.reduce((worst, current) => 
      current.stats.totalReservations < worst.stats.totalReservations ? current : worst
    )
  };
}

// ================================================================================
// UTILITY FUNCTIONS
// ================================================================================

/**
 * Format a date string for display in a consistent, timezone-agnostic way
 * @param dateString Date string in format YYYY-MM-DD
 * @returns Formatted date as M/D
 */
function formatDateForDisplay(dateString: string): string {
  // Parse the date string manually to avoid timezone issues
  if (!dateString || typeof dateString !== 'string') return 'Invalid Date';
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Validate the parts (month should be 1-12, day should be 1-31)
  if (isNaN(year) || isNaN(month) || isNaN(day) || 
      month < 1 || month > 12 || day < 1 || day > 31) {
    return 'Invalid Date';
  }
  
  // Return as M/D format
  return `${month}/${day}`;
}

/**
 * Format utilization rate as a percentage
 * @param rate Utilization rate as a decimal (e.g., 0.75 for 75%)
 * @returns Formatted percentage string (e.g., "75%")
 */
function formatUtilizationPercentage(rate: number | undefined): string {
  if (rate === undefined || isNaN(rate)) return '0%';
  
  // Round to nearest percent and ensure it's between 0% and 100%
  const percentage = Math.min(Math.max(Math.round(rate * 100), 0), 100);
  return `${percentage}%`;
}

/**
 * Get CSS class for performance display based on performance value
 * @param ratio Ratio of today's performance compared to the average 
 * @returns CSS class name: 'success-value', 'warning-value', or 'danger-value'
 */
function getPerformanceClass(ratio: number | undefined): string {
  if (ratio === undefined || isNaN(ratio)) return 'neutral-value';
  
  // Handle edge cases
  if (ratio === Number.MAX_SAFE_INTEGER) return 'success-value';
  
  // Performance is better than average
  if (ratio > 1.05) return 'success-value';
  
  // Performance is worse than average
  if (ratio < 0.95) return 'danger-value';
  
  // Performance is about the same as average (within 5%)
  return 'warning-value';
}

/**
 * Initialize placeholder data for the analytics dashboard
 * Shows empty charts and placeholder metrics when first entering the view
 */
function initializePlaceholders() {
  // Create placeholder comparison data
  comparisonData.value = {
    todayStats: {
      totalReservations: 0,
      utilizationRate: 0,
      uniqueUsers: 0,
      sectionDistribution: { A: 0, B: 0, C: 0 }
    },
    dayOccurrences: [],
    overallMetrics: {
      averageReservations: 0,
      todayVsAverage: 1, // Neutral performance
      totalOccurrences: 0
    },
    selectedDay: selectedDay.value,
    selectedDate: selectedDateString.value,
    selectedDateIsInOccurrences: false,
    isPlaceholder: true // Flag to indicate this is placeholder data
  };

  // Create placeholder chart data
  createPlaceholderCharts();
}

/**
 * Update placeholder chart labels when selected date changes
 */
function updatePlaceholderLabels() {
  if (!comparisonData.value || !comparisonData.value.isPlaceholder) return;
  
  const formattedSelectedDate = formatDateForDisplay(selectedDateString.value);
  
  // Update chart titles with the new selected date
  if (chartOptions.value) {
    chartOptions.value.usage.plugins.title.text = `Selected Date vs All ${selectedDay.value}s (90-day range)`;
    chartOptions.value.section.plugins.title.text = `Section Distribution for Selected Date (${formattedSelectedDate})`;
  }
  
  // Update the selected date and day in comparison data
  if (comparisonData.value) {
    comparisonData.value.selectedDate = selectedDateString.value;
    comparisonData.value.selectedDay = selectedDay.value;
  }
  
  // Re-create placeholder charts with updated day
  createPlaceholderCharts();
}

/**
 * Update placeholder labels without triggering transitions
 * This is a modified version of updatePlaceholderLabels that doesn't cause layout shifts
 */
function updatePlaceholderLabelsQuiet() {
  if (!comparisonData.value || !comparisonData.value.isPlaceholder) return;
  
  const formattedSelectedDate = formatDateForDisplay(selectedDateString.value);
  
  // Update chart titles with the new selected date without triggering transitions
  if (chartOptions.value) {
    chartOptions.value.usage.plugins.title.text = `Selected Date vs All ${selectedDay.value}s (90-day range)`;
    chartOptions.value.section.plugins.title.text = `Section Distribution for Selected Date (${formattedSelectedDate})`;
  }
  
  // Update the selected date and day in comparison data
  if (comparisonData.value) {
    comparisonData.value.selectedDate = selectedDateString.value;
    comparisonData.value.selectedDay = selectedDay.value;
  }
  
  // Update placeholder charts without recreating them which would cause transitions
  if (chartData.value.usage && chartData.value.usage.datasets && chartData.value.usage.datasets.length > 0) {
    chartData.value.usage.datasets[0].label = `${selectedDay.value} Reservations (Sample)`;
  }
}

/**
 * Create placeholder charts with empty or minimal data
 */
function createPlaceholderCharts() {
  // Create more visually appealing placeholder data (slight variations for better visuals)
  const placeholderDays = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  
  // Usage chart with placeholder data
  chartData.value.usage = {
    labels: placeholderDays,
    datasets: [{
      label: `${selectedDay.value} Reservations (Sample)`,
      data: [0, 0, 0, 0],
      backgroundColor: 'rgba(15, 98, 254, 0.3)', // Lighter IBM Blue for placeholders
      borderColor: '#0f62fe',
      borderWidth: 1,
      borderRadius: 4,
      borderDash: [5, 5], // Dashed border for placeholders
    }]
  };
  
  // Section chart with placeholder data
  chartData.value.section = {
    labels: ['Section A', 'Section B', 'Section C'],
    datasets: [{
      label: 'Reservations by Section (Sample)',
      data: [0, 0, 0],
      backgroundColor: [
        'rgba(15, 98, 254, 0.3)',   // Lighter IBM Blue
        'rgba(66, 190, 101, 0.3)',   // Lighter IBM Green
        'rgba(255, 131, 43, 0.3)'   // Lighter IBM Orange
      ],
      borderColor: [
        '#0f62fe',
        '#42be65',
        '#ff832b'
      ],
      borderWidth: 1,
      borderDash: [5, 5], // Dashed borders for placeholders
    }]
  };
  
  // Update chart titles
  const formattedSelectedDate = formatDateForDisplay(selectedDateString.value);
  chartOptions.value.usage.plugins.title.text = `${selectedDay.value} Reservations (90-day range)`;
  chartOptions.value.section.plugins.title.text = `Section Distribution for ${formattedSelectedDate}`;
  
  // Add placeholder annotation to chart options
  chartOptions.value.usage.plugins.subtitle = {
    display: true,
    text: 'Click "Compare Days" button to load real data',
    font: {
      size: 14,
      style: 'italic'
    },
    padding: {
      top: 10
    }
  };
  
  chartOptions.value.section.plugins.subtitle = {
    display: true,
    text: 'Click "Compare Days" button to load real data',
    font: {
      size: 14,
      style: 'italic'
    },
    padding: {
      top: 10
    }
  };
}

/**
 * Format average utilization as a percentage
 * @param avgReservations Average number of reservations
 * @returns Formatted percentage string based on total cubicles (54)
 */
function formatAverageUtilization(avgReservations: number | undefined): string {
  if (avgReservations === undefined || isNaN(avgReservations)) return '0%';
  
  // Calculate percentage based on total cubicles (54)
  const totalCubicles = 54;
  const percentage = Math.min(Math.max(Math.round((avgReservations / totalCubicles) * 100), 0), 100);
  return `${percentage}%`;
}

/**
 * Format performance ratio as a percentage difference from average
 * @param ratio Ratio of today's reservations to average reservations
 * @returns Formatted string showing performance vs average (e.g., "+25%" or "-10%")
 */
function formatPerformanceVsAverage(ratio: number | undefined): string {
  if (ratio === undefined || isNaN(ratio)) return '0%';
  
  // Handle edge cases
  if (ratio === Number.MAX_SAFE_INTEGER) return '+∞%';
  if (ratio === 0) return '-100%';
  
  // Calculate percentage difference
  const percentageDiff = Math.round((ratio - 1) * 100);
  
  // Format with sign
  return percentageDiff >= 0 ? `+${percentageDiff}%` : `${percentageDiff}%`;
}

/**
 * Clear any error messages
 */
function clearError(): void {
  error.value = null;
}

/**
 * Handle day change in dropdown
 * Modified to prevent layout shifts when changing dropdown value
 */
function handleDayChange(): void {
  if (selectedDay.value) {
    console.log('Day changed to:', selectedDay.value);
    
    // Don't increment transition key here to avoid layout shifts
    // Only update the data without triggering transitions
    
    // Just update the placeholder labels, don't load real data
    if (comparisonData.value?.isPlaceholder) {
      // Update the selected day in the placeholder data
      comparisonData.value.selectedDay = selectedDay.value;
      // Call updatePlaceholderLabels without triggering full rerender
      updatePlaceholderLabelsQuiet();
    }
    // If we have real data, set the refresh flag
    else if (comparisonData.value && !comparisonData.value.isPlaceholder) {
      needsRefresh.value = true;
    }
    
    // Update attributes directly but avoid layout-shifting operations
    nextTick(() => {
      const dropdown = document.querySelector('.day-selector');
      if (dropdown) {
        dropdown.setAttribute('data-selected-day', selectedDay.value);
      }
    });
  }
}

/**
 * Reset the analytics view with smooth transitions
 */
function resetAnalytics(): void {
  // Increment transition key to trigger animations
  transitionKey.value++;
  
  // Reset the refresh flag
  needsRefresh.value = false;
  
  // First fade out the current view
  analyticsData.value = null;
  
  // Reset the day dropdown to the current day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayOfWeek = new Date().getDay();
  
  // Force the dropdown to reset to the current day
  selectedDay.value = dayNames[currentDayOfWeek];
  
  // Force UI update with a slight delay
  setTimeout(() => {
    // Trigger the change event handler to update UI elements
    handleDayChange();
    
    // Initialize placeholders with the updated day
    initializePlaceholders();
  }, 50);
}

/**
 * Create comparison charts for today vs selected day occurrences
 */
function createComparisonCharts() {
  if (!comparisonData.value) return;
  
  // Create usage comparison chart with consistent date formatting
  const dates = comparisonData.value.dayOccurrences.map((day: any) => {
    return formatDateForDisplay(day.date);
  });
  
  const reservationCounts = comparisonData.value.dayOccurrences.map((day: any) => day.stats.totalReservations);
  
  // No need to add the selected date separately, as we're only showing days of the selected type
  
  // Just use all occurrences of the selected day
  const occurrenceData = [...reservationCounts];
  
  // Simplify chart to only show one dataset for all days
  chartData.value.usage = {
    labels: dates,
    datasets: [{
      label: `${selectedDay.value} Reservations`,
      data: occurrenceData,
      backgroundColor: 'rgba(15, 98, 254, 0.7)', // IBM Blue
      borderColor: '#0f62fe',
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false,
    }]
  };
  
  // Create section analysis chart - always use the selected date's data (todayStats)
  const sectionData = comparisonData.value.todayStats.sectionDistribution;
  const formattedSelectedDate = formatDateForDisplay(selectedDateString.value);
  
  chartData.value.section = {
    labels: ['Section A', 'Section B', 'Section C'],
    datasets: [{
      label: 'Reservations by Section',
      data: [sectionData.A || 0, sectionData.B || 0, sectionData.C || 0],
      backgroundColor: [
        'rgba(15, 98, 254, 0.8)',   // IBM Blue
        'rgba(66, 190, 101, 0.8)',  // IBM Green
        'rgba(255, 131, 43, 0.8)'   // IBM Orange
      ],
      borderColor: [
        '#0f62fe',
        '#42be65',
        '#ff832b'
      ],
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
    }]
  };
  
  // Update chart titles with clear, accurate descriptions
  chartOptions.value.usage.plugins.title.text = `${selectedDay.value} Reservations (90-day range)`;
  chartOptions.value.section.plugins.title.text = `Section Distribution for ${formattedSelectedDate}`;

  // Ensure the subtitle placeholder text is removed when showing real data
  if (chartOptions.value.usage.plugins.subtitle) {
    chartOptions.value.usage.plugins.subtitle.display = false;
  }
  if (chartOptions.value.section.plugins.subtitle) {
    chartOptions.value.section.plugins.subtitle.display = false;
  }
}
</script>