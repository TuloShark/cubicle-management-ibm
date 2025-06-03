<template>
  <div class="utilization-container">
    <div class="page-header">
      <h1 class="page-title">Utilization Reports</h1>
      <p class="page-subtitle">Weekly cubicle usage analytics and historical trends</p>
    </div>
    
    <!-- Main Reports Dashboard -->
    <cv-grid class="utilization-grid">
      <!-- Reports Controls Row -->
      <cv-row class="controls-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile class="controls-tile">
            <div class="tile-header">
              <h3 class="tile-title">Report Controls</h3>
              <p class="tile-subtitle">Generate and manage utilization reports</p>
            </div>
            <div class="controls-content">
              <div class="controls-layout">
                <!-- Left side - Action buttons -->
                <div class="controls-left">
                  <div class="control-item" v-if="isAdminUser">
                    <cv-button 
                      @click="generateCurrentWeekReport" 
                      kind="primary" 
                      size="md"
                      :disabled="loading.generateCurrent"
                      class="control-button"
                    >
                      <span v-if="loading.generateCurrent">Generating...</span>
                      <span v-else>Generate Current Week Report</span>
                    </cv-button>
                  </div>
                  
                  <div class="control-item" v-if="isAdminUser">
                    <cv-button 
                      @click="generateCustomWeekReport" 
                      kind="secondary" 
                      size="md"
                      :disabled="loading.generateCustom || !customWeekStart"
                      class="control-button"
                    >
                      <span v-if="loading.generateCustom">Generating...</span>
                      <span v-else>Generate Custom Week</span>
                    </cv-button>
                  </div>
                  
                  <div class="control-item">
                    <cv-button 
                      @click="refreshReports" 
                      kind="tertiary" 
                      size="md"
                      :disabled="loading.refresh"
                      class="control-button"
                    >
                      <span v-if="loading.refresh">Refreshing...</span>
                      <span v-else>Refresh Reports</span>
                    </cv-button>
                  </div>
                  
                  <div class="control-item" v-if="!isAdminUser">
                    <p class="admin-notice">Report generation is restricted to administrators.</p>
                  </div>
                </div>
                
                <!-- Right side - Date picker -->
                <div class="controls-right" v-if="isAdminUser">
                  <div class="control-item">
                    <cv-date-picker
                      v-model="customWeekStart"
                      kind="single"
                      :date-format="dateFormat"
                      placeholder="Select week start date"
                      :light="false"
                      class="week-picker-right"
                    >
                      <cv-date-picker-input
                        label="Week Start Date"
                        placeholder="mm/dd/yyyy"
                        :invalid="datePickerInvalid"
                        invalid-message="Please select a valid Monday"
                      />
                    </cv-date-picker>
                  </div>
                </div>
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- Quick Stats Row -->
      <cv-row class="stats-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile class="quick-stats-tile">
            <div class="tile-header">
              <h3 class="tile-title">Quick Statistics</h3>
              <p class="tile-subtitle">Latest report insights</p>
            </div>
            <div class="quick-stats-content" v-if="latestReport">
              <div class="stat-item">
                <span class="stat-label">Average Utilization</span>
                <span class="stat-value">{{ latestReport.summary.avgUtilization }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Peak Utilization</span>
                <span class="stat-value">{{ latestReport.summary.peakUtilization }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Total Reservations</span>
                <span class="stat-value">{{ latestReport.summary.totalReservations }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Unique Users</span>
                <span class="stat-value">{{ latestReport.summary.uniqueUsers }}</span>
              </div>
              
              <!-- Quick Export Button -->
              <div class="quick-export-section">
                <cv-button 
                  @click="exportLatestReport" 
                  kind="primary" 
                  size="sm"
                  :disabled="loading.exportLatest"
                  class="quick-export-btn"
                >
                  <template #icon>
                    <Download16 />
                  </template>
                  <span v-if="loading.exportLatest">Downloading...</span>
                  <span v-else>Download Excel Report</span>
                </cv-button>
              </div>
            </div>
            <div v-else class="no-data">
              <p>No reports available yet.</p>
              <p v-if="isAdminUser">Generate your first report using the controls above.</p>
              <p v-else>Please contact an administrator to generate reports.</p>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- Reports List Row -->
      <cv-row class="reports-row">
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile class="reports-tile">
            <div class="tile-header">
              <h3 class="tile-title">Available Reports</h3>
              <p class="tile-subtitle">Historical utilization reports with export options</p>
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
            
            <!-- Reports Table -->
            <div class="reports-table-container">
              <cv-data-table 
                v-if="reports.length > 0"
                :columns="tableColumns"
                :data="tableData"
                :pagination="{ numberOfItems: pagination.totalReports }"
                @sort="handleSort"
              >
                <template v-slot:cell-actions="{ row }">
                  <div class="action-buttons">
                    <cv-button 
                      @click="viewReport(row)" 
                      kind="ghost" 
                      size="sm"
                      class="action-btn"
                    >
                      View
                    </cv-button>
                    <cv-button 
                      @click="exportReport(row)" 
                      kind="tertiary" 
                      size="sm"
                      :disabled="loading.export === row._id"
                      class="action-btn"
                    >
                      <span v-if="loading.export === row._id">Exporting...</span>
                      <span v-else>Export</span>
                    </cv-button>
                    <cv-button 
                      v-if="isAdminUser"
                      @click="deleteReport(row)" 
                      kind="danger--ghost" 
                      size="sm"
                      :disabled="loading.delete === row._id"
                      class="action-btn"
                    >
                      <span v-if="loading.delete === row._id">Deleting...</span>
                      <span v-else>Delete</span>
                    </cv-button>
                  </div>
                </template>
              </cv-data-table>
              
              <div v-else-if="loading.reports" class="table-loading">
                <cv-skeleton-text :paragraph="true" :line-count="5" />
              </div>
              
              <div v-else class="no-reports">
                <p>No utilization reports found. Generate your first report using the controls above.</p>
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
import { computed } from 'vue';

export default {
  name: 'UtilizationView',
  setup() {
    const { currentUser, isAdmin } = useAuth();
    const isAdminUser = computed(() => {
      if (!currentUser.value) return false;
      
      // First check Firebase custom claims (preferred method)
      if (isAdmin.value) return true;
      
      // Fallback to environment variable UIDs
      const adminUids = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(u => u.trim());
      return adminUids.includes(currentUser.value.uid);
    });
    return { isAdminUser, currentUser };
  },
  data() {
    return {
      reports: [],
      selectedReport: null,
      latestReport: null,
      showReportModal: false,
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
      customWeekStart: '',
      dateFormat: 'Y-m-d',
      datePickerInvalid: false,
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
    await this.fetchReports();
  },
  methods: {
    async fetchReports() {
      this.loading.reports = true;
      try {
        const idToken = localStorage.getItem('auth_token');
        const response = await axios.get('/api/utilization-reports', {
          headers: { Authorization: `Bearer ${idToken}` },
          params: {
            page: this.currentPage,
            limit: this.pageSize
          }
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
    
    async generateCurrentWeekReport() {
      console.log('Generate current week report clicked');
      console.log('Current user:', this.currentUser);
      console.log('Is admin user:', this.isAdminUser);
      
      this.loading.generateCurrent = true;
      try {
        const idToken = localStorage.getItem('auth_token');
        console.log('Token exists:', !!idToken);
        console.log('Token preview:', idToken ? idToken.substring(0, 50) + '...' : 'null');
        
        const response = await axios.post('/api/utilization-reports/generate-current', {}, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        console.log('Response:', response);
        this.showNotification('success', 'Success', 'Current week report generated successfully');
        await this.fetchReports();
      } catch (error) {
        console.error('Error generating current week report:', error);
        console.error('Error response:', error.response);
        const message = error.response?.data?.error || 'Failed to generate current week report';
        this.showNotification('error', 'Error', message);
      } finally {
        this.loading.generateCurrent = false;
      }
    },
    
    async generateCustomWeekReport() {
      if (!this.customWeekStart) {
        this.showNotification('error', 'Missing Date', 'Please select a week start date');
        return;
      }
      
      // Parse the date and validate that it's a Monday
      const date = new Date(this.customWeekStart);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        this.datePickerInvalid = true;
        this.showNotification('error', 'Invalid Date', 'Please select a valid date');
        return;
      }
      
      // Check if it's a Monday (getDay() returns 1 for Monday)
      if (date.getDay() !== 1) {
        this.datePickerInvalid = true;
        this.showNotification('error', 'Invalid Date', 'Please select a Monday as the week start date');
        return;
      }
      
      this.datePickerInvalid = false;
      this.loading.generateCustom = true;
      
      try {
        const idToken = localStorage.getItem('auth_token');
        
        // Format the date as ISO string for the API
        const formattedDate = date.toISOString().split('T')[0];
        
        await axios.post('/api/utilization-reports/generate', {}, {
          headers: { Authorization: `Bearer ${idToken}` },
          params: { weekStart: formattedDate }
        });
        
        this.showNotification('success', 'Success', 'Custom week report generated successfully');
        this.customWeekStart = '';
        await this.fetchReports();
      } catch (error) {
        console.error('Error generating custom week report:', error);
        if (error.response && error.response.status === 401) {
          this.showNotification('error', 'Authentication Required', 'You must be an admin to generate reports.');
        } else if (error.response && error.response.status === 400) {
          const message = error.response?.data?.error || 'Report already exists for this week';
          this.showNotification('error', 'Unable to Generate', message);
        } else {
          const message = error.response?.data?.error || 'Failed to generate custom week report';
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
        link.download = `current-week-report-${weekStart}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.showNotification('success', 'Downloaded', 'Current week report downloaded successfully');
      } catch (error) {
        console.error('Error downloading current report:', error);
        if (error.response && error.response.status === 401) {
          this.showNotification('error', 'Authentication Required', 'Please log in to download reports');
        } else {
          this.showNotification('error', 'Download Failed', 'Failed to download current week report');
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
    }
  }
};
</script>

<style scoped>
/* IBM Carbon Design System inspired styling */
.utilization-container {
  padding: 0;
  margin-top: 64px;
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

.utilization-grid {
  padding: 1.5rem;
  width: 100%;
  max-width: none;
  margin: 0;
}

.controls-row,
.stats-row,
.reports-row {
  margin-bottom: 1rem;
}

/* Tile Styling */
.controls-tile,
.quick-stats-tile,
.reports-tile {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 1.5rem;
  height: 100%;
  border-radius: 4px;
  transition: box-shadow 0.15s ease;
}

.controls-tile:hover,
.quick-stats-tile:hover,
.reports-tile:hover {
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
}

/* Ensure date picker matches button styling */
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.quick-export-section {
  grid-column: 1 / -1;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: center;
}

.quick-export-btn {
  min-width: 200px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  background-color: #f4f4f4;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.stat-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6f6f6f;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #161616;
}

/* Reports Table */
.pagination-controls {
  margin-bottom: 1rem;
}

.reports-table-container {
  min-height: 400px;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  min-width: 80px;
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
  font-style: italic;
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
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .utilization-grid {
    padding: 1rem;
  }
  
  .quick-stats-content {
    grid-template-columns: 1fr;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .sections-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .control-button,
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

/* Carbon component overrides */
:deep(.bx--tile) {
  border-radius: 4px;
}

:deep(.bx--data-table-container) {
  background-color: #ffffff;
}

:deep(.bx--modal-container) {
  max-height: 80vh;
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

/* Admin notice styling */
.admin-notice {
  font-size: 0.875rem;
  color: #6f6f6f;
  font-style: italic;
  margin: 0;
  padding: 0.75rem;
  background-color: #f4f4f4;
  border-radius: 4px;
  border-left: 3px solid #0f62fe;
}
</style>
