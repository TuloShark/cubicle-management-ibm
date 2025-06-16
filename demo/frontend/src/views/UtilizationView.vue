<template>
  <div class="utilization-container">
    <!-- Simple Consistent Header Component -->
    <PageHeader
      title="Utilization Reports"
      subtitle="Daily cubicle usage analytics and historical trends"
    />
    
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
      
      <!-- Custom Date Modal -->
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
          <div class="custom-date-form">
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
      tableColumns: [
        {
          key: 'reportDate',
          header: 'Report Date',
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
    },
    tableData() {
      return this.reports.map(report => ({
        _id: report._id,
        reportDate: this.formatDate(report.reportStartDate),
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
      await this.initializeFromRoute(this.route.params.date);
    } else {
      console.log('UtilizationView - Using current global date:', this.selectedDateString);
    }

    await this.fetchReports();
  },
  watch: {
    // Watch for route parameter changes and update global store
    async '$route.params.date'(newDate) {
      if (newDate && typeof newDate === 'string') {
        console.log('UtilizationView - Route date changed:', newDate);
        await this.setSelectedDate(newDate);
      }
    },
    // Watch for selected date changes and refetch reports
    selectedDateString(newDate, oldDate) {
      if (newDate !== oldDate) {
        console.log('UtilizationView - Selected date changed from', oldDate, 'to', newDate);
        this.setLatestReportForSelectedDate();
      }
    }
  },
  methods: {
    onStatChanged(index) {
      // Handle stat change event from AnalyticsCarousel if needed
      console.log('UtilizationView - Stat changed to index:', index);
    },
    async fetchReports() {
      console.log('UtilizationView - fetchReports started');
      this.loading.reports = true;
      try {
        const idToken = this.token;
        
        // Build query parameters - fetch all reports for the list
        const params = {
          page: this.currentPage,
          limit: this.pageSize
        };
        
        console.log('UtilizationView - Making API call with params:', params);
        const response = await axios.get('/api/utilization-reports', {
          headers: { Authorization: `Bearer ${idToken}` },
          params
        });
        
        console.log('UtilizationView - API response:', response.data);
        this.reports = response.data.data?.reports || [];
        this.pagination = response.data.data?.pagination || {
          totalReports: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        };
        
        console.log('UtilizationView - Set reports:', this.reports.length, 'reports');
        
        // Set latest report for quick stats - find report for selected date
        this.setLatestReportForSelectedDate();
      } catch (error) {
        console.error('UtilizationView - Error fetching reports:', error);
        console.error('UtilizationView - Error response:', error.response);
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
        console.log('UtilizationView - fetchReports finished, loading.reports = false');
        this.loading.reports = false;
      }
    },
    
    setLatestReportForSelectedDate() {
      console.log('UtilizationView - Setting latest report for selected date:', this.selectedDateString);
      
      if (!this.selectedDateString || this.reports.length === 0) {
        this.latestReport = null;
        console.log('UtilizationView - No selected date or no reports, clearing latestReport');
        return;
      }
      
      // Find a report that matches the selected date
      // Reports have reportDate field that should match our selected date
      const selectedDateStr = this.selectedDateString;
      const matchingReport = this.reports.find(report => {
        const reportDate = report.reportStartDate;
        if (reportDate) {
          const dateStr = new Date(reportDate).toISOString().split('T')[0];
          return dateStr === selectedDateStr;
        }
        return false;
      });
      
      if (matchingReport) {
        this.latestReport = matchingReport;
        console.log('UtilizationView - Found matching report for date:', selectedDateStr);
      } else {
        this.latestReport = null;
        console.log('UtilizationView - No report found for selected date:', selectedDateStr);
      }
    },
    
    async generateCurrentDayReport() {
      this.loading.generateCurrent = true;
      try {
        const idToken = this.token;
        
        // Use the raw date input directly (same as StatisticsView)
        const dateToUse = this.selectedDateInput;
        console.log('Generating report for date:', dateToUse);
        
        const response = await axios.post('/api/utilization-reports/generate', {}, {
          headers: { Authorization: `Bearer ${idToken}` },
          params: { weekStart: dateToUse }
        });
        
        this.showNotification('success', 'Success', `Report generated successfully for ${dateToUse}`);
        console.log('Report generation successful, fetching reports...');
        await this.fetchReports();
        console.log('Reports fetched. Current reports count:', this.reports.length);
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
        const idToken = this.token;
        
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
          const message = error.response?.data?.error || 'Report already exists for this date';
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
      console.log('Sort event:', event);
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
      console.log('UtilizationView - Date changed from PageHeader:', date);
      // Update global date store - this will trigger reactive updates
      this.setSelectedDate(date);
      
      // Update route parameter to keep URL in sync
      if (this.$route.params.date !== date) {
        this.$router.replace({
          name: 'utilization',
          params: { date }
        });
      }
    },
  }
};
</script>