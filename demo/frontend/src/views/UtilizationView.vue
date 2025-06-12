<template>
  <div class="utilization-container">
    <div class="page-header">
      <h1 class="page-title">Utilization Reports</h1>
      <div class="page-subtitle-with-date">
        <p class="page-subtitle">Daily cubicle usage analytics and historical trends</p>
        <div class="current-date-display">
          <span class="date-label">Reports for:</span>
          <span class="date-value">{{ formatDisplayDate(selectedDateInput) }}</span>
        </div>
      </div>
    </div>
    
    <!-- Main Reports Dashboard -->
    <cv-grid class="utilization-grid">
      <!-- Reports Controls and Quick Stats Row - Side by Side -->
      <cv-row class="top-row">
        <!-- Report Controls - Left Half -->
        <cv-column :sm="4" :md="8" :lg="8">
          <cv-tile class="controls-tile">
            <div class="tile-header">
              <h3 class="tile-title">Report Controls</h3>
              <p class="tile-subtitle">Generate and manage utilization reports</p>
            </div>
            <div class="controls-content">
              <div class="horizontal-controls">
                <div class="control-item" v-if="isAdminUser">
                  <cv-button 
                    @click="generateCurrentDayReport" 
                    kind="primary" 
                    size="lg"
                    :disabled="loading.generateCurrent"
                    class="control-button-consistent"
                  >
                    <span v-if="loading.generateCurrent">Generating...</span>
                    <span v-else>Generate Report for Selected Date</span>
                  </cv-button>
                </div>
                
                <div class="control-item" v-if="isAdminUser">
                  <cv-button 
                    @click="openCustomDayModal" 
                    kind="secondary" 
                    size="lg"
                    :disabled="loading.generateCustom"
                    class="control-button-consistent"
                  >
                    <span v-if="loading.generateCustom">Processing...</span>
                    <span v-else>Generate Custom Day Report</span>
                  </cv-button>
                </div>
                
                <div class="control-item">
                  <cv-button 
                    @click="refreshReports" 
                    kind="tertiary" 
                    size="lg"
                    :disabled="loading.refresh"
                    class="control-button-consistent"
                  >
                    <span v-if="loading.refresh">Refreshing...</span>
                    <span v-else>Refresh Reports</span>
                  </cv-button>
                </div>
              </div>
            </div>
          </cv-tile>
        </cv-column>
        
        <!-- Quick Stats - Right Half -->
        <cv-column :sm="4" :md="4" :lg="4">
          <cv-tile class="quick-stats-tile">
            <div class="tile-header">
              <h3 class="tile-title">Quick Statistics</h3>
              <p class="tile-subtitle">Latest report insights</p>
            </div>
            <div class="quick-stats-content">
              <!-- Statistics Carousel Section -->
              <div v-if="latestReport" class="stats-carousel">
                <div class="carousel-container">
                  <transition name="slide" mode="out-in">
                    <div 
                      :key="currentStatIndex" 
                      class="stat-card-single"
                    >
                      <div :class="['stat-indicator', currentStat.indicatorClass]"></div>
                      <div class="stat-details">
                        <span class="stat-label">{{ currentStat.label }}</span>
                        <span class="stat-value">{{ currentStat.value }}</span>
                      </div>
                    </div>
                  </transition>
                </div>
                <!-- Carousel indicators completely hidden -->
              </div>
              
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
      
      <!-- Reports List Row -->
      <cv-row class="reports-row">
        <cv-column :sm="4" :md="16" :lg="16">
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
            <div class="pagination-controls" v-if="pagination.totalPages > 1">
              <cv-pagination 
                v-model="currentPage"
                :number-of-items="pagination.totalReports"
                :page-size="pageSize"
                :page-sizes="[5, 10, 20]"
                @change="handlePaginationChange"
              />
            </div>
            
            <!-- Reports Cards -->
            <div class="reports-container">
              <div v-if="reports.length > 0" class="reports-grid">
                <div 
                  v-for="report in reports" 
                  :key="report._id"
                  class="report-card"
                  :class="{ 'latest-report': report === latestReport }"
                >
                  <!-- Report Header -->
                  <div class="report-header">
                    <div class="report-period">
                      <h4 class="week-label">{{ formatReportDate(report) }}</h4>
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
                  <h4 class="empty-state-title">No Reports Available</h4>
                  <p class="empty-state-description">
                    Generated reports will appear here for viewing and downloading.
                  </p>
                </div>
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
          Week of {{ selectedReport ? formatDate(selectedReport.weekStartDate) : '' }}
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
      
      <!-- Custom Week Modal -->
      <cv-modal
        :visible="showCustomDayModal"
        kind="default"
        size="md"
        :auto-hide-off="true"
        @modal-hide-request="closeCustomDayModal"
        @primary-click="handleCustomDayModalAction"
        @secondary-click="closeCustomDayModal"
      >
        <template v-slot:label>
          Generate Custom Report
        </template>
        <template v-slot:title>
          Select Date for Report Generation
        </template>
        <template v-slot:content>
          <div class="custom-week-form">
            <p class="form-description">
              Select any date to generate a utilization report for that day.
            </p>
            
            <cv-date-picker
              v-model="customDayStart"
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
        class="notification"
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

export default {
  name: 'UtilizationView',
  components: {
    Download16,
    View16,
    TrashCan16
  },
  setup() {
    const { currentUser, isAdmin } = useAuth();
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
      
      // Fallback to environment variable UIDs
      const adminUids = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(u => u.trim());
      return adminUids.includes(currentUser.value.uid);
    });

    return { 
      isAdminUser, 
      currentUser, 
      route,
      selectedDate,
      selectedDateInput,
      selectedDateString,
      setSelectedDate,
      initializeFromRoute
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
      currentStatIndex: 0,
      carouselInterval: null,
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
      tableColumns: [
        {
          key: 'weekStartDate',
          header: 'Week Start',
          sortable: true
        },
        {
          key: 'weekEndDate', 
          header: 'Week End',
          sortable: true
        },
        {
          key: 'avgUtilization',
          header: 'Avg Utilization',
          sortable: true
        },
        {
          key: 'peakUtilization',
          header: 'Peak Utilization',
          sortable: true
        },
        {
          key: 'totalReservations',
          header: 'Total Reservations',
          sortable: true
        },
        {
          key: 'uniqueUsers',
          header: 'Unique Users',
          sortable: true
        },
        {
          key: 'generatedAt',
          header: 'Generated',
          sortable: true
        },
        {
          key: 'actions',
          header: 'Actions',
          sortable: false
        }
      ]
    };
  },
  computed: {
    statsData() {
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
    },
    currentStat() {
      return this.statsData[this.currentStatIndex] || {};
    },
    tableData() {
      return this.reports.map(report => ({
        _id: report._id,
        weekStartDate: this.formatDate(report.weekStartDate),
        weekEndDate: this.formatDate(report.weekEndDate),
        avgUtilization: `${report.summary.avgUtilization}%`,
        peakUtilization: `${report.summary.peakUtilization}%`,
        totalReservations: report.summary.totalReservations,
        uniqueUsers: report.summary.uniqueUsers,
        generatedAt: this.formatDateTime(report.generatedAt)
      }));
    }
  },
  async mounted() {
    // Initialize date from route parameter if available (similar to StatisticsView)
    if (this.route.params.date && typeof this.route.params.date === 'string') {
      console.log('UtilizationView - Initializing from route date:', this.route.params.date);
      this.initializeFromRoute(this.route.params.date);
    } else {
      console.log('UtilizationView - Using current global date:', this.selectedDateString);
    }

    await this.fetchReports();
    this.startCarousel();
  },
  beforeUnmount() {
    this.stopCarousel();
  },
  watch: {
    // Watch for route parameter changes and update global store
    '$route.params.date'(newDate) {
      if (newDate && typeof newDate === 'string') {
        console.log('UtilizationView - Route date changed:', newDate);
        this.setSelectedDate(newDate);
      }
    }
  },
  methods: {
    startCarousel() {
      this.stopCarousel(); // Clear any existing interval
      this.carouselInterval = setInterval(() => {
        this.nextStat();
      }, 3000); // Change every 3 seconds
    },
    stopCarousel() {
      if (this.carouselInterval) {
        clearInterval(this.carouselInterval);
        this.carouselInterval = null;
      }
    },
    nextStat() {
      if (this.statsData.length > 0) {
        this.currentStatIndex = (this.currentStatIndex + 1) % this.statsData.length;
      }
    },
    setCurrentStat(index) {
      this.currentStatIndex = index;
      this.startCarousel(); // Restart the auto-advance timer
    },
    async fetchReports() {
      this.loading.reports = true;
      try {
        const idToken = localStorage.getItem('auth_token');
        
        // Build query parameters - no date filtering, show all reports
        const params = {
          page: this.currentPage,
          limit: this.pageSize
        };
        
        const response = await axios.get('/api/utilization-reports', {
          headers: { Authorization: `Bearer ${idToken}` },
          params
        });
        
        this.reports = response.data.reports || [];
        this.pagination = response.data.pagination || {
          totalReports: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        };
        
        // Set latest report for quick stats
        if (this.reports.length > 0) {
          this.latestReport = this.reports[0];
        } else {
          this.latestReport = null;
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        if (error.response && error.response.status === 401) {
          this.showNotification('error', 'Authentication Required', 'Please log in to view utilization reports.');
        } else if (error.response && error.response.status === 404) {
          // Handle case where no reports exist - this is not an error, just empty state
          this.reports = [];
          this.latestReport = null;
          this.pagination = {
            totalReports: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          };
        } else {
          // Only show error notification for actual errors, not empty states
          const message = error.response?.data?.error || 'Failed to fetch utilization reports';
          this.showNotification('error', 'Error Loading Reports', message);
        }
      } finally {
        this.loading.reports = false;
      }
    },
    
    async generateCurrentDayReport() {
      this.loading.generateCurrent = true;
      try {
        const idToken = localStorage.getItem('auth_token');
        
        // Use the raw date input directly (same as StatisticsView)
        const dateToUse = this.selectedDateInput;
        console.log('Generating report for date:', dateToUse);
        
        const response = await axios.post('/api/utilization-reports/generate', {}, {
          headers: { Authorization: `Bearer ${idToken}` },
          params: { weekStart: dateToUse }
        });
        
        this.showNotification('success', 'Success', `Report generated successfully for ${dateToUse}`);
        await this.fetchReports();
      } catch (error) {
        console.error('Error generating report for selected date:', error);
        console.error('Error response:', error.response);
        if (error.response && error.response.status === 401) {
          this.showNotification('error', 'Authentication Required', 'You must be an admin to generate reports.');
        } else if (error.response && error.response.status === 400) {
          const message = error.response?.data?.error || 'Report already exists for this date';
          this.showNotification('error', 'Unable to Generate', message);
        } else {
          const message = error.response?.data?.error || 'Failed to generate report for selected date';
          this.showNotification('error', 'Error', message);
        }
      } finally {
        this.loading.generateCurrent = false;
      }
    },
    
    
    openCustomDayModal() {
      this.showCustomDayModal = true;
      // Initialize empty to force user to select a date for generation
      this.customDayStart = '';
    },
    
    closeCustomDayModal() {
      this.showCustomDayModal = false;
      this.customDayStart = '';
    },
    
    async generateCustomDayFromModal() {
      if (!this.customDayStart) {
        this.showNotification('error', 'Missing Date', 'Please select a date');
        return;
      }
      
      this.loading.generateCustom = true;
      
      try {
        const idToken = localStorage.getItem('auth_token');
        
        // Use the raw date input directly (no complex date parsing)
        const dateToUse = this.customDayStart;
        
        await axios.post('/api/utilization-reports/generate', {}, {
          headers: { Authorization: `Bearer ${idToken}` },
          params: { weekStart: dateToUse }
        });
        
        this.showNotification('success', 'Success', 'Custom day report generated successfully');
        this.closeCustomDayModal();
        await this.fetchReports();
      } catch (error) {
        console.error('Error generating custom day report:', error);
        if (error.response && error.response.status === 401) {
          this.showNotification('error', 'Authentication Required', 'You must be an admin to generate reports.');
        } else if (error.response && error.response.status === 400) {
          const message = error.response?.data?.error || 'Report already exists for this week';
          this.showNotification('error', 'Unable to Generate', message);
        } else {
          const message = error.response?.data?.error || 'Failed to generate custom day report';
          this.showNotification('error', 'Error', message);
        }
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
        const idToken = localStorage.getItem('auth_token');
        const response = await axios.get(`/api/utilization-reports/${row._id}`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        this.selectedReport = response.data;
        this.showReportModal = true;
      } catch (error) {
        console.error('Error fetching report details:', error);
        this.showNotification('error', 'Error', 'Failed to load report details');
      }
    },
    
    async exportReport(row) {
      this.loading.export = row._id;
      try {
        const idToken = localStorage.getItem('auth_token');
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
        link.download = `utilization-report-${row.weekStartDate}.xlsx`;
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
        const idToken = localStorage.getItem('auth_token');
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
        
        // Format filename with week dates
        const weekStart = new Date(this.latestReport.weekStartDate).toISOString().split('T')[0];
        link.download = `current-day-report-${weekStart}.xlsx`;
        
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
        const idToken = localStorage.getItem('auth_token');
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
      console.log('Sort event:', event);
    },
    
    formatDate(dateString) {
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
    
    // New methods for the updated modal functionality
    handleCustomDayModalAction() {
      if (this.customDayStart) {
        // Generate report for the selected date
        this.generateCustomDayFromModal();
      } else {
        // If no date selected, show error
        this.showNotification('error', 'Missing Date', 'Please select a date');
      }
    },
    
    onModalDateChange() {
      // This method is called when the date picker value changes
      // It helps trigger reactivity for the button text updates
      this.$forceUpdate();
    }
  }
};
</script>

<style scoped>
/* IBM Carbon Design System - Clean and Consistent */
.utilization-container {
  padding: 0;
  margin-top: 48px;
  background: #f4f4f4;
  flex: 1; /* Use flex instead of min-height calculation */
  font-family: 'IBM Plex Sans', sans-serif;
}

/* Carbon Design System Overrides - Sharp Edges and Clean Cuts */
:deep(.bx--grid) {
  max-width: 100%;
  margin: 0;
  padding: 0;
}

:deep(.bx--row) {
  margin: 0;
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
  box-shadow: none !important;
}

:deep(.bx--btn) {
  border-radius: 0 !important;
  font-weight: 400 !important;
  text-transform: none !important;
  letter-spacing: 0.16px !important;
  transition: all 0.15s ease !important;
  box-shadow: none !important;
  font-family: 'IBM Plex Sans', sans-serif !important;
  min-height: 48px !important;
  padding: 0.875rem 1rem !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

:deep(.bx--btn--primary) {
  background: #0f62fe !important;
  border-color: #0f62fe !important;
  color: #ffffff !important;
}

:deep(.bx--btn--primary:hover) {
  background: #0353e9 !important;
  border-color: #0353e9 !important;
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
  border-color: #4c4c4c !important;
  transform: none !important;
  box-shadow: none !important;
}

:deep(.bx--btn--tertiary) {
  background: transparent !important;
  border-color: #0f62fe !important;
  color: #0f62fe !important;
}

:deep(.bx--btn--tertiary:hover) {
  background: #0f62fe !important;
  border-color: #0f62fe !important;
  color: #ffffff !important;
  transform: none !important;
  box-shadow: none !important;
}

:deep(.bx--btn--ghost) {
  background: transparent !important;
  border-color: transparent !important;
  color: #0f62fe !important;
  padding: 0.875rem 1rem !important;
}

:deep(.bx--btn--ghost:hover) {
  background: #e0efff !important;
  border-color: transparent !important;
  color: #0353e9 !important;
  transform: none !important;
  box-shadow: none !important;
}

:deep(.bx--btn--danger--ghost) {
  background: transparent !important;
  border-color: transparent !important;
  color: #da1e28 !important;
}

:deep(.bx--btn--danger--ghost:hover) {
  background: #fff1f1 !important;
  border-color: transparent !important;
  color: #a2191f !important;
  transform: none !important;
  box-shadow: none !important;
}

:deep(.bx--btn__icon) {
  margin-left: 0.5rem !important;
  margin-right: 0 !important;
  flex-shrink: 0 !important;
}

:deep(.bx--modal) {
  border-radius: 0 !important;
}

:deep(.bx--pagination) {
  border-radius: 0 !important;
}

:deep(.bx--date-picker-input) {
  border-radius: 0 !important;
  min-height: 48px !important;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Page Header - IBM Carbon Design */
.page-header {
  background: #161616;
  color: #ffffff;
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
  font-family: 'IBM Plex Sans', sans-serif;
}

.page-subtitle-with-date {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-subtitle {
  font-size: 1rem;
  opacity: 0.75;
  margin: 0;
  font-weight: 400;
  font-family: 'IBM Plex Sans', sans-serif;
}

.current-date-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'IBM Plex Sans', sans-serif;
}

.date-label {
  font-size: 0.875rem;
  opacity: 0.7;
  font-weight: 400;
}

.date-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #78a9ff;
  background: rgba(120, 169, 255, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  border: 1px solid rgba(120, 169, 255, 0.3);
}

/* Grid Layout */
.utilization-grid {
  max-width: 1584px;
  margin: 0 auto;
  padding: 1rem;
}

.top-row {
  margin-bottom: 1rem;
}

.reports-row {
  margin-bottom: 1rem;
}

/* Tiles - Sharp Edges and Clean Cuts */
.controls-tile,
.quick-stats-tile,
.reports-tile {
  background: transparent !important;
  border: none !important;
  border-radius: 0;
  padding: 1.5rem;
  height: 100%;
  transition: all 0.15s ease;
  box-shadow: none;
  position: relative;
  overflow: hidden;
  margin: 1.5rem;
}

.tile-header {
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 1rem;
  position: relative;
}

.tile-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, #0f62fe, #0043ce);
  border-radius: 1px;
}

.tile-title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.tile-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #161616;
  margin: 0;
  line-height: 1.4;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}



.tile-subtitle {
  font-size: 0.875rem;
  color: #6f6f6f;
  margin: 0;
  font-weight: 400;
  line-height: 1.4;
}

/* Controls Content */
.controls-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Controls Layout - Two Column */
.controls-layout {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  width: 100%;
}

.controls-left {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.controls-right {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 250px;
  max-width: 300px;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.date-picker-group {
  display: flex;
  align-items: end;
  gap: 1rem;
}

.week-picker {
  flex: 1;
  min-width: 200px;
}

.week-picker-full {
  width: 100%;
  min-width: 200px;
}

.week-picker-right {
  width: 100%;
  min-width: 250px;
}

.control-button {
  min-width: 200px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Consistent button styling for main controls */
.control-button-consistent {
  min-width: 200px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 48px; /* Fixed height for consistency */
}

.control-button-consistent :deep(.bx--btn) {
  height: 48px !important;
  min-height: 48px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: 0 !important;
}

/* Force center alignment for Carbon button content */
.control-button :deep(.bx--btn__icon),
.control-button :deep(.cv-button__content),
.control-button-consistent :deep(.bx--btn__icon),
.control-button-consistent :deep(.cv-button__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Additional Carbon button centering */
.control-button :deep(.bx--btn),
.control-button-consistent :deep(.bx--btn) {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.control-button :deep(.bx--btn__icon),
.control-button-consistent :deep(.bx--btn__icon) {
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.report-action-btn {
  flex: 1;
  min-width: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Force center alignment for report action buttons */
.report-action-btn :deep(.bx--btn__icon),
.report-action-btn :deep(.cv-button__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Additional Carbon button centering for report actions */
.report-action-btn :deep(.bx--btn) {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.report-action-btn :deep(.bx--btn__icon) {
  margin-right: 0.5rem;
  flex-shrink: 0;
}

:deep(.week-picker-full .bx--date-picker-input__wrapper) {
  width: 100%;
  min-width: 200px;
}

:deep(.week-picker-full .bx--date-picker-input) {
  width: 100%;
}

:deep(.week-picker-right .bx--date-picker-input__wrapper) {
  width: 100%;
  min-width: 250px;
}

:deep(.week-picker-right .bx--date-picker-input) {
  width: 100%;
}

/* Ensure date picker input matches button height */
:deep(.bx--date-picker-input__wrapper) {
  min-height: 40px;
}

:deep(.bx--date-picker-input) {
  min-height: 40px;
}

:deep(.bx--label) {
  margin-bottom: 0.5rem;
}

/* Quick Stats */
.quick-stats-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-height: 300px; /* Fixed minimum height for the entire content container */
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #0f62fe;
}

.stat-icon-container {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.stat-icon-container.utilization-avg {
  background: linear-gradient(135deg, #d9f0dd, #e8f5e8);
  border: 2px solid #198038;
}

.stat-icon-container.utilization-peak {
  background: linear-gradient(135deg, #fef7cd, #fefbde);
  border: 2px solid #f1c21b;
}

.stat-icon-container.reservations {
  background: linear-gradient(135deg, #d0e2ff, #e0efff);
  border: 2px solid #0f62fe;
}

.stat-icon-container.users {
  background: linear-gradient(135deg, #f0e6ff, #f7f0ff);
  border: 2px solid #8a3ffc;
}

.stat-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.stat-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6f6f6f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #161616;
  line-height: 1.2;
}

.quick-export-section {
  margin-top: 1rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: center;
}

.export-button {
  min-width: 200px;
}

/* Empty State Styling */
.no-data-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px; /* Fixed exact height to match carousel section */
  padding: 1rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px dashed #c6c6c6;
  border-radius: 12px;
  margin: 1rem 0;
  transition: height 0.3s ease; /* Smooth height transition */
}

.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.6;
  line-height: 1;
}

.empty-state-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #161616;
  margin: 0 0 0.75rem 0;
  line-height: 1.3;
}

.empty-state-description {
  font-size: 0.875rem;
  color: #6f6f6f;
  margin: 0 0 1.5rem 0;
  line-height: 1.4;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.empty-state-action {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.generate-hint-button {
  min-width: 180px;
}

/* Reports Cards */
.reports-container {
  min-height: 400px;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  padding: 0 0.5rem;
}

.reports-grid {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  margin-top: 2rem;
  margin-bottom: 2rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0.5rem;
  scroll-behavior: smooth;
}

.reports-grid::-webkit-scrollbar {
  height: 8px;
}

.reports-grid::-webkit-scrollbar-track {
  background: #f4f4f4;
  border-radius: 4px;
}

.reports-grid::-webkit-scrollbar-thumb {
  background: #c6c6c6;
  border-radius: 4px;
}

.reports-grid::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.report-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 0; /* Sharp edges */
  padding: 1.5rem;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  flex: 0 0 400px; /* Fixed width, no grow/shrink */
  min-width: 400px;
  margin-top: 1.5rem;
}

.report-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #0f62fe;
  transform: translateY(-2px);
}

.report-card.latest-report {
  border-color: #198038;
  background: linear-gradient(135deg, #ffffff 0%, #f6f9f6 100%);
}

.report-card.latest-report::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #198038, #24a148);
}

/* Report Header */
.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.report-period {
  flex: 1;
}

.week-label {
  font-size: 1.125rem;
  font-weight: 600;
  color: #161616;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.generated-date {
  font-size: 0.8rem;
  color: #6f6f6f;
  display: block;
  margin-bottom: 0.5rem;
}

.latest-badge {
  display: inline-block;
  background: #198038;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Utilization Circle */
.utilization-indicator {
  flex-shrink: 0;
}

.utilization-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 3px solid;
  background: #ffffff;
}

.utilization-circle.high-utilization {
  border-color: #198038;
  background: linear-gradient(135deg, #d9f0dd, #ffffff);
}

.utilization-circle.medium-utilization {
  border-color: #f1c21b;
  background: linear-gradient(135deg, #fdf6d2, #ffffff);
}

.utilization-circle.low-utilization {
  border-color: #ff832b;
  background: linear-gradient(135deg, #fff0e6, #ffffff);
}

.utilization-circle.very-low-utilization {
  border-color: #da1e28;
  background: linear-gradient(135deg, #fdebed, #ffffff);
}

.utilization-percentage {
  font-size: 0.875rem;
  font-weight: 700;
  color: #161616;
}

/* Report Stats */
.report-stats {
  margin-bottom: 1.5rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.stat-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.stat-item-mini {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: #f4f4f4;
  border-radius: 6px;
  border-left: 3px solid #e0e0e0;
  transition: border-color 0.2s ease;
}

.stat-item-mini:hover {
  border-left-color: #0f62fe;
}

.mini-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6f6f6f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mini-value {
  font-size: 1rem;
  font-weight: 700;
  color: #161616;
}

.mini-value.error-count.has-errors {
  color: #da1e28;
  font-weight: 800;
}

/* Utilization Bar */
.utilization-bar-container {
  margin-bottom: 1.5rem;
}

.utilization-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.utilization-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.utilization-fill.high-utilization {
  background: linear-gradient(90deg, #198038, #24a148);
}

.utilization-fill.medium-utilization {
  background: linear-gradient(90deg, #f1c21b, #fdd13a);
}

.utilization-fill.low-utilization {
  background: linear-gradient(90deg, #ff832b, #ff9f4a);
}

.utilization-fill.very-low-utilization {
  background: linear-gradient(90deg, #da1e28, #e65761);
}

.utilization-range {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: #6f6f6f;
}

.range-label {
  font-weight: 500;
  color: #525252;
}

.range-min,
.range-max {
  font-weight: 600;
  color: #161616;
}

/* Report Actions */
.report-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.report-action-btn {
  flex: 1;
  min-width: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.report-action-btn.delete-btn {
  flex: 0 0 auto;
  min-width: 100px;
}

/* Enhanced No Reports */
.no-reports-content {
  text-align: center;
  padding: 3rem 2rem;
}

.no-reports-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}

.no-reports-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #161616;
  margin: 0 0 0.5rem 0;
}

.no-reports-content p {
  color: #6f6f6f;
  margin: 0;
}

/* Pagination Controls */
.pagination-controls {
  margin-bottom: 1rem;
}

.table-loading,
.no-reports {
  padding: 2rem;
  text-align: center;
  color: #6f6f6f;
}

/* Report Details Modal */
.report-details {
  max-height: 500px;
  overflow-y: auto;
}

.report-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #161616;
  margin: 0 0 1rem 0;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 0.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background-color: #f4f4f4;
  border-radius: 4px;
}

.summary-label {
  font-size: 0.875rem;
  color: #6f6f6f;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #161616;
}

.daily-chart-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.daily-progress {
  width: 100%;
}

.sections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.section-card {
  padding: 1rem;
  background-color: #f4f4f4;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.section-name {
  font-size: 1rem;
  font-weight: 600;
  color: #161616;
  margin: 0 0 0.5rem 0;
}

.section-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.section-stat {
  font-size: 0.875rem;
  color: #6f6f6f;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.user-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background-color: #f4f4f4;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.user-email {
  font-size: 0.875rem;
  font-weight: 600;
  color: #161616;
}

.user-stats {
  font-size: 0.75rem;
  color: #6f6f6f;
}

/* Loading States */
.no-data {
  padding: 1.5rem;
  text-align: center;
  color: #6f6f6f;
}

/* Notifications */
.notification {
  position: fixed;
  top: 80px;
  right: 1rem;
  z-index: 9999;
  max-width: 400px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .utilization-container {
    margin-top: 48px;
  }
  
  .page-header {
    padding: 1.5rem 1rem 1rem 1rem;
  }
  
  .page-subtitle-with-date {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .current-date-display {
    align-self: stretch;
    justify-content: space-between;
  }
  
  .date-value {
    font-size: 0.8125rem;
    padding: 0.25rem 0.5rem;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .utilization-grid {
    padding: 1rem;
  }
  
  .quick-stats-content {
    gap: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .stat-card {
    padding: 1rem;
    gap: 0.75rem;
  }
  
  .stat-icon-container {
    width: 40px;
    height: 40px;
  }
  
  .stat-icon {
    font-size: 1.25rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
  
  .export-button,
  .generate-hint-button {
    min-width: auto;
    width: 100%;
  }
  
  .no-data-state {
    padding: 2rem 1rem;
  }
  
  .empty-state-icon {
    font-size: 2.5rem;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .sections-grid {
    grid-template-columns: 1fr;
  }
  
  /* Card Layout Responsive */
  .reports-grid {
    gap: 1rem;
  }
  
  .report-card {
    padding: 1rem;
    flex: 0 0 300px; /* Smaller width for mobile */
    min-width: 300px;
  }
  
  .report-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .utilization-indicator {
    align-self: center;
  }
  
  .stat-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  .report-actions {
    flex-direction: column;
  }
  
  .report-action-btn {
    min-width: auto;
    width: 100%;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .control-button,
  .control-button-consistent,
  .week-picker-full,
  .week-picker-right {
    min-width: auto;
    width: 100%;
  }
  
  /* Stack controls vertically on mobile */
  .controls-layout {
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .controls-right {
    min-width: auto;
    max-width: none;
    width: 100%;
  }
}

/* Tablet Layout */
@media (min-width: 769px) and (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .stat-card {
    padding: 1.125rem;
  }
  
  .reports-grid {
    gap: 1.25rem;
  }
  
  .report-card {
    padding: 1.25rem;
    flex: 0 0 350px; /* Medium width for tablet */
    min-width: 350px;
  }
  
  .utilization-circle {
    width: 50px;
    height: 50px;
  }
  
  .utilization-percentage {
    font-size: 0.8rem;
  }
}

/* Large Desktop Layout */
@media (min-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
  
  .stat-card {
    padding: 1.5rem;
  }
  
  .stat-icon-container {
    width: 56px;
    height: 56px;
  }
  
  .stat-icon {
    font-size: 1.75rem;
  }
  
  .stat-value {
    font-size: 2rem;
  }
  
  .reports-grid {
    gap: 2rem;
  }
  
  .report-card {
    padding: 2rem;
    flex: 0 0 450px; /* Larger width for large desktop */
    min-width: 450px;
  }
  
  .utilization-circle {
    width: 70px;
    height: 70px;
  }
  
  .utilization-percentage {
    font-size: 1rem;
  }
}

/* Carbon component overrides */
:deep(.bx--tile) {
  border-radius: 0 !important; /* Sharp edges for all tiles */
}

:deep(.bx--data-table-container) {
  background-color: #ffffff;
  border-radius: 0 !important;
}

:deep(.bx--modal-container) {
  max-height: 80vh;
  border-radius: 0 !important;
}

:deep(.bx--progress-bar) {
  margin-bottom: 0.5rem;
}

:deep(.bx--date-picker) {
  margin-bottom: 0;
}

:deep(.bx--skeleton-text) {
  margin-bottom: 0.5rem;
}

/* Stat Indicators - Clean Geometric Shapes */
.stat-indicator {
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

.stat-indicator.utilization-avg {
  background: linear-gradient(135deg, #d9f0dd, #e8f5e8);
  border-color: #198038;
}

.stat-indicator.utilization-avg::before {
  content: '';
  width: 20px;
  height: 20px;
  background: #198038;
  border-radius: 4px;
  transform: rotate(45deg);
}

.stat-indicator.utilization-peak {
  background: linear-gradient(135deg, #fef7cd, #fefbde);
  border-color: #f1c21b;
}

.stat-indicator.utilization-peak::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 16px solid #f1c21b;
}

.stat-indicator.reservations {
  background: linear-gradient(135deg, #d0e2ff, #e0efff);
  border-color: #0f62fe;
}

.stat-indicator.reservations::before {
  content: '';
  width: 20px;
  height: 20px;
  background: #0f62fe;
  border-radius: 50%;
}

.stat-indicator.users {
  background: linear-gradient(135deg, #f0e6ff, #f7f0ff);
  border-color: #8a3ffc;
}

.stat-indicator.users::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 18px solid #8a3ffc;
}

/* Carousel Styles */
.stats-carousel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1rem 0;
  height: 200px; /* Fixed exact height instead of min-height for consistency */
  justify-content: center;
  transition: height 0.3s ease; /* Smooth height transition */
}

.carousel-container {
  width: 100%;
  max-width: 400px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.stat-card-single {
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

.stat-card-single::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #0f62fe, #0043ce);
}

.stat-card-single:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  border-color: #0f62fe;
}

.stat-card-single .stat-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.stat-card-single .stat-label {
  font-size: 1rem;
  font-weight: 600;
  color: #6f6f6f;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-card-single .stat-value {
  font-size: 2.25rem;
  font-weight: 700;
  color: #161616;
  line-height: 1.1;
}

/* Carousel Indicators */
.carousel-indicators {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
}

.indicator-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #c6c6c6;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.indicator-dot:hover {
  border-color: #0f62fe;
  transform: scale(1.1);
}

.indicator-dot.active {
  border-color: #0f62fe;
  background: #0f62fe;
  transform: scale(1.2);
}

.indicator-dot.active::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  border: 2px solid #0f62fe;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.3;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
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

/* Content State Transitions */
.quick-stats-content > div {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

/* Compact Carousel Styles */
.stats-carousel-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.carousel-container-compact {
  position: relative;
  width: 100%;
  max-width: 280px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 0; /* Sharp edges */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.stat-card-single-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  width: 100%;
  height: 100%;
  text-align: center;
}

.stat-indicator-compact {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stat-details-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.stat-label-compact {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;
}

.stat-value-compact {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

/* Hide carousel indicators completely */
.carousel-indicators {
  display: none !important;
}

/* Button Wrapper to prevent layout shifts */
.button-wrapper {
  min-height: 48px;
  display: flex;
  transition: all 0.3s ease;
}

/* Horizontal Controls Layout */
.horizontal-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: center;
}

.control-item {
  flex: 1;
  min-width: 200px;
  display: flex;
  justify-content: center;
}

/* Quick Stats Download Button */
.quick-stats-download {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
  height: 80px; /* Fixed exact height to prevent displacement */
  align-items: center;
  transition: opacity 0.3s ease; /* Smooth opacity transition */
}

.download-button-centered {
  min-width: 220px;
}

/* Custom Week Modal Styles */
.custom-week-form {
  padding: 1rem 0;
}

.form-description {
  margin-bottom: 1.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
}

.form-help-text {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f3f4f6;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.form-help-text p {
  margin: 0;
  font-size: 0.8125rem;
  color: #4b5563;
  line-height: 1.4;
}

/* Top Row Layout - Side by Side */
.top-row {
  margin-bottom: 2rem;
}

.top-row .cv-column:first-child {
  padding-right: 1rem;
}

.top-row .cv-column:last-child {
  padding-left: 1rem;
}

/* Responsive Carousel */
@media (max-width: 992px) {
  /* Apply spacing fixes for tablet and mobile screens */
  .top-row .cv-column:first-child,
  .top-row .cv-column:last-child {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  
  .top-row .cv-column:first-child {
    margin-bottom: 1.5rem !important;
  }
  
  .top-row .cv-column:last-child {
    margin-bottom: 0 !important;
  }
  
  /* Also target Carbon's internal classes directly */
  .top-row :deep(.bx--col):first-child {
    margin-bottom: 1.5rem !important;
  }
  
  .top-row :deep(.bx--col):last-child {
    margin-bottom: 0 !important;
  }
  
  /* Remove tile margins on tablet/mobile to rely on column spacing */
  .top-row .controls-tile,
  .top-row .quick-stats-tile {
    margin: 0 !important;
    margin-bottom: 0 !important;
  }
}

@media (max-width: 768px) {
  .carousel-container {
    max-width: 100%;
    height: 100px;
  }
  
  .carousel-container-compact {
    max-width: 100%;
    height: 70px;
  }
  
  .stat-card-single {
    padding: 1.25rem 1.5rem;
    gap: 1rem;
  }
  
  .stat-card-single-compact {
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }
  
  .stat-card-single .stat-value {
    font-size: 1.875rem;
  }
  
  .stat-value-compact {
    font-size: 1.25rem !important;
  }
  
  .stat-card-single .stat-label {
    font-size: 0.875rem;
  }
  
  .stat-label-compact {
    font-size: 0.6875rem !important;
  }
  
  .indicator-dot {
    width: 10px;
    height: 10px;
  }
  
  .carousel-indicators {
    gap: 0.5rem;
  }
  
  .horizontal-controls {
    flex-direction: column;
    align-items: center;
  }
  
  .control-item {
    min-width: 100%;
    justify-content: center;
  }
  
  .download-button-centered {
    min-width: 100%;
  }
}

@media (min-width: 769px) and (max-width: 992px) {
  /* Handle tablet-desktop transition range */
  .top-row .cv-column:first-child,
  .top-row .cv-column:last-child {
    padding-left: 0.5rem !important;
    padding-right: 0.5rem !important;
  }
  
  .top-row .cv-column:first-child {
    margin-bottom: 1.5rem !important;
  }
  
  .top-row .cv-column:last-child {
    margin-bottom: 0 !important;
  }
  
  /* Also target Carbon's internal classes directly */
  .top-row :deep(.bx--col):first-child {
    margin-bottom: 1.5rem !important;
  }
  
  .top-row :deep(.bx--col):last-child {
    margin-bottom: 0 !important;
  }
  
  /* Remove tile margins to rely on column spacing */
  .top-row .controls-tile,
  .top-row .quick-stats-tile {
    margin: 0 !important;
    margin-bottom: 0 !important;
  }
}

@media (min-width: 993px) and (max-width: 1399px) {
  /* Handle the gap between tablet and large desktop breakpoints */
  /* This covers screens around 1050px where margins were getting lost */
  .top-row .cv-column:first-child,
  .top-row .cv-column:last-child {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  
  .top-row .cv-column:first-child {
    margin-bottom: 1.5rem !important;
  }
  
  .top-row .cv-column:last-child {
    margin-bottom: 0 !important;
  }
  
  /* Also target Carbon's internal classes directly */
  .top-row :deep(.bx--col):first-child {
    margin-bottom: 1.5rem !important;
  }
  
  .top-row :deep(.bx--col):last-child {
    margin-bottom: 0 !important;
  }
  
  /* Remove tile margins to rely on column spacing */
  .top-row .controls-tile,
  .top-row .quick-stats-tile {
    margin: 0 !important;
    margin-bottom: 0 !important;
  }
}

@media (min-width: 1400px) {
  /* Ensure proper spacing on large screens too */
  .top-row .cv-column:first-child,
  .top-row .cv-column:last-child {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  
  .top-row .cv-column:first-child {
    margin-bottom: 1.5rem !important;
  }
  
  .top-row .cv-column:last-child {
    margin-bottom: 0 !important;
  }
  
  /* Also target Carbon's internal classes directly */
  .top-row :deep(.bx--col):first-child {
    margin-bottom: 1.5rem !important;
  }
  
  .top-row :deep(.bx--col):last-child {
    margin-bottom: 0 !important;
  }
  
  /* Remove tile margins to rely on column spacing */
  .top-row .controls-tile,
  .top-row .quick-stats-tile {
    margin: 0 !important;
    margin-bottom: 0 !important;
  }

  .carousel-container {
    max-width: 500px;
    height: 140px;
  }
  
  .carousel-container-compact {
    max-width: 320px;
    height: 90px;
  }
  
  .stat-card-single {
    padding: 2rem 2.5rem;
    gap: 2rem;
  }
  
  .stat-card-single-compact {
    padding: 1.25rem 1.75rem;
    gap: 1.25rem;
  }
  
  .stat-card-single .stat-value {
    font-size: 2.5rem;
  }
  
  .stat-value-compact {
    font-size: 1.75rem !important;
  }
  
  .stat-card-single .stat-label {
    font-size: 1.125rem;
  }
  
  .stat-label-compact {
    font-size: 0.8125rem !important;
  }
}

/* Custom Week Modal Enhancements */
.custom-week-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-description {
  font-size: 0.875rem;
  color: #6f6f6f;
  margin: 0;
  line-height: 1.4;
}

.current-filter-display {
  padding: 1rem;
  background: linear-gradient(135deg, #f0f7ff 0%, #e0efff 100%);
  border: 1px solid #0f62fe;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}



.modal-actions-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.action-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-action-btn {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Horizontal Controls Layout */
</style>
