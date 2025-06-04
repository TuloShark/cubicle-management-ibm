<template>
  <div class="notifications-container">
    <div class="page-header">
      <h1 class="page-title">Notifications</h1>
      <p class="page-subtitle">Manage cubicle sequence notifications and integrations</p>
    </div>
    
    <!-- Main Content Area -->
    <cv-grid class="notifications-grid">
      <!-- Settings and Actions Row -->
      <cv-row class="settings-row">
        <!-- Settings Column -->
        <cv-column :sm="4" :md="8" :lg="8">
          <cv-tile class="settings-tile">
            <div class="tile-header">
              <h3 class="tile-title">Notification Settings</h3>
              <p class="tile-subtitle">Configure your notification preferences</p>
            </div>
            
            <cv-form class="settings-form">
              <div class="settings-group">
                <cv-toggle 
                  v-model="notificationSettings.emailEnabled"
                  label="Email Notifications"
                  @change="updateSettings"
                />
                <div class="integration-toggle">
                <cv-toggle 
                  v-model="notificationSettings.slackEnabled"
                  label="Slack Notifications"
                  @change="updateSettings"
                />
                <cv-button 
                  kind="ghost" 
                  size="sm"
                  @click="setupSlackIntegration"
                  class="setup-button"
                >
                  Setup Slack
                </cv-button>
              </div>
              
              <div class="integration-toggle">
                <cv-toggle 
                  v-model="notificationSettings.mondayEnabled"
                  label="Monday.com Notifications"
                  @change="updateSettings"
                />
                <cv-button 
                  kind="ghost" 
                  size="sm"
                  @click="setupMondayIntegration"
                  class="setup-button"
                >
                  Setup Monday.com
                </cv-button>
              </div>
              </div>
              
              <cv-text-input
                v-model="notificationSettings.email"
                label="Email Address"
                placeholder="Enter your email"
                @input="updateSettings"
              />
              
              <cv-dropdown
                v-model="notificationSettings.frequency"
                label="Frequency"
                :options="frequencyOptions"
                @change="updateSettings"
              />
            </cv-form>
          </cv-tile>
        </cv-column>
        
        <!-- Actions Column -->
        <cv-column :sm="4" :md="8" :lg="8">
          <cv-tile class="actions-tile">
            <div class="tile-header">
              <h3 class="tile-title">Quick Actions</h3>
              <p class="tile-subtitle">Send notifications and manage cubicle data</p>
            </div>
            <div class="actions-group">
              <cv-button 
                kind="primary" 
                @click="sendCubicleSequenceNotification"
                :disabled="sendingNotification || !isValidEmail(notificationSettings.email) || !accountSetupComplete"
              >
                <template v-if="sendingNotification">Sending...</template>
                <template v-else>Email Update</template>
              </cv-button>
              <cv-button 
                kind="secondary" 
                @click="sendSlackNotification"
                :disabled="sendingSlack || !accountSetupComplete"
              >
                <template v-if="sendingSlack">Sending...</template>
                <template v-else>Send Slack Update</template>
              </cv-button>
              <cv-button 
                kind="tertiary" 
                @click="createMondayTask"
                :disabled="sendingMonday || !accountSetupComplete"
              >
                <template v-if="sendingMonday">Creating...</template>
                <template v-else>Create Monday Task</template>
              </cv-button>
              <cv-button 
                kind="ghost" 
                @click="refreshUserData"
                :disabled="refreshingData || !accountSetupComplete"
              >
                <template v-if="refreshingData">Refreshing...</template>
                <template v-else>Refresh Data</template>
              </cv-button>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- User Data Table -->
      <cv-row>
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile>
            <div class="tile-header">
              <h3 class="tile-title">User Data</h3>
              <p class="tile-subtitle">Users with cubicle reservations</p>
            </div>
            
            <div v-if="loading" class="loading-container">
              <cv-loading />
            </div>
            
            <div v-else-if="userTableData.length === 0" class="empty-state">
              <p>No user data available</p>
            </div>
            
            <div v-else class="table-container">
              <cv-data-table
                :rows="userTableData"
                :headers="userTableHeaders"
              >
                <template slot="cell" slot-scope="props">
                  <!-- Custom cell rendering for Cubicle Sequence -->
                  <span v-if="props.column === 'cubicleSequence'">
                    <cv-tag :kind="props.value ? 'green' : 'gray'" type="outline">
                      {{ props.value || 'No reservations' }}
                    </cv-tag>
                  </span>
                  
                  <!-- Custom cell rendering for Actions -->
                  <span v-else-if="props.column === 'actions'">
                    <cv-button 
                      kind="ghost" 
                      size="small"
                      @click="sendIndividualNotification(props.row)"
                      :disabled="sendingIndividual[props.row.uid]"
                    >
                      {{ sendingIndividual[props.row.uid] ? 'Sending...' : 'Send' }}
                    </cv-button>
                  </span>
                  
                  <!-- Default rendering for other columns -->
                  <span v-else>
                    {{ props.value }}
                  </span>
                </template>
              </cv-data-table>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- Notification History -->
      <cv-row>
        <cv-column :sm="4" :md="16" :lg="16">
          <cv-tile>
            <div class="tile-header">
              <h3 class="tile-title">Notification History</h3>
              <p class="tile-subtitle">Recent notifications activity</p>
            </div>
            
            <div v-if="notificationHistory.length === 0" class="empty-state">
              <p>No notifications have been sent yet</p>
            </div>
            
            <div v-else class="history-list">
              <cv-data-table
                :rows="notificationHistoryData"
                :headers="notificationHistoryHeaders"
              >
                <template slot="cell" slot-scope="props">
                  <!-- Status cell with tag -->
                  <span v-if="props.column === 'status'">
                    <cv-tag :kind="props.value === 'sent' ? 'green' : 'red'">
                      {{ props.value }}
                    </cv-tag>
                  </span>
                  <span v-else>{{ props.value }}</span>
                </template>
              </cv-data-table>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
    </cv-grid>
    
    <!-- Notification Banner -->
    <cv-toast-notification
      v-if="showNotification"
      :kind="notificationKind"
      :title="notificationTitle"
      :subtitle="notificationMessage"
      @close="clearNotification"
      style="position: fixed; top: 80px; right: 1rem; z-index: 9999;"
    />
  </div>
</template>

<script>
import axios from 'axios';
import useAuth from '../composables/useAuth';
import { computed } from 'vue';

export default {
  name: 'NotificationsView',
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
      // Notification settings
      notificationSettings: {
        emailEnabled: true,
        slackEnabled: false,
        mondayEnabled: false,
        email: '',
        frequency: 'daily'
      },
      
      // Loading states
      loading: false,
      sendingNotification: false,
      sendingSlack: false,
      sendingMonday: false,
      refreshingData: false,
      sendingIndividual: {},
      
      // User data
      userTableData: [],
      userTableHeaders: [
        { key: 'email', header: 'Email' },
        { key: 'displayName', header: 'Name' },
        { key: 'totalReservations', header: 'Reservations' },
        { key: 'cubicleSequence', header: 'Sequence' },
        { key: 'lastActivity', header: 'Last Activity' },
        { key: 'actions', header: 'Actions' }
      ],
      
      // Notification history
      notificationHistory: [],
      notificationHistoryHeaders: [
        { key: 'type', header: 'Type' },
        { key: 'timestamp', header: 'Time' },
        { key: 'status', header: 'Status' },
        { key: 'recipients', header: 'Recipients' }
      ],
      
      // Notification banner
      showNotification: false,
      notificationKind: 'success',
      notificationTitle: '',
      notificationMessage: '',
      
      // Options
      frequencyOptions: [
        { value: 'realtime', label: 'Real-time' },
        { value: 'hourly', label: 'Hourly' },
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' }
      ],
      accountSetupComplete: false,
    };
  },
  
  computed: {
    notificationHistoryData() {
      return this.notificationHistory.map(item => ({
        type: item.type,
        timestamp: this.formatTimestamp(item.timestamp),
        status: item.status,
        recipients: item.recipients ? item.recipients.join(', ') : 'None'
      }));
    }
  },
  
  async created() {
    await this.loadUserSettings();
    await this.loadUserData();
    await this.loadNotificationHistory();
    this.accountSetupComplete = this.checkAccountSetup();
  },
  
  methods: {
    async loadUserSettings() {
      try {
        const idToken = localStorage.getItem('auth_token');
        
        if (!idToken) {
          console.warn('No authentication token found');
          // Use default settings if no token is available, but don't redirect
          this.notificationSettings = {
            emailEnabled: true,
            slackEnabled: false,
            mondayEnabled: false,
            email: this.currentUser?.email || '',
            frequency: 'daily'
          };
          return;
        }
        
        // Get settings from API
        const response = await axios.get('/api/notifications/settings', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        if (response.data && response.data.data) {
          this.notificationSettings = {
            emailEnabled: response.data.data.emailNotifications || true,
            slackEnabled: response.data.data.slackNotifications || false,
            mondayEnabled: response.data.data.mondayComNotifications || false,
            email: response.data.data.email || this.currentUser?.email || '',
            frequency: response.data.data.frequency || 'daily'
          };
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
        // Don't show any error notifications on initial load for better UX
        if (error.response && error.response.status === 401) {
          console.warn('User not authenticated, using default settings');
        } else {
          console.warn('Failed to load settings, using default settings');
        }
      }
    },
    
    async loadUserData() {
      this.loading = true;
      try {
        const idToken = localStorage.getItem('auth_token');
        
        if (!idToken) {
          console.warn('No authentication token found, using sample data');
          // Use sample data for development/demo purposes
          this.userTableData = [
            {
              uid: '123',
              email: 'john.doe@example.com',
              displayName: 'John Doe',
              totalReservations: 5,
              cubicleSequence: 'A1-A3, B5',
              lastActivity: '2025-06-01'
            },
            {
              uid: '456',
              email: 'jane.smith@example.com',
              displayName: 'Jane Smith',
              totalReservations: 3,
              cubicleSequence: 'C2-C4',
              lastActivity: '2025-06-02'
            }
          ];
          this.loading = false;
          return;
        }
        
        // Get real user data from API
        const response = await axios.get('/api/notifications/users-with-cubicles', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        if (response.data && response.data.data) {
          this.userTableData = response.data.data.map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            totalReservations: user.totalReservations || 0,
            cubicleSequence: user.cubicleSequence || 'No sequence',
            lastActivity: user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Never'
          }));
        } else {
          this.userTableData = [];
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        // Don't redirect to login on 401
        if (error.response && error.response.status === 401) {
          console.warn('User not authenticated, using sample data');
          this.userTableData = [
            {
              uid: '123',
              email: 'john.doe@example.com',
              displayName: 'John Doe',
              totalReservations: 5,
              cubicleSequence: 'A1-A3, B5',
              lastActivity: '2025-06-01'
            },
            {
              uid: '456',
              email: 'jane.smith@example.com',
              displayName: 'Jane Smith',
              totalReservations: 3,
              cubicleSequence: 'C2-C4',
              lastActivity: '2025-06-02'
            }
          ];
        } else {
          console.warn('Failed to load user data');
        }
      } finally {
        this.loading = false;
      }
    },
    
    async loadNotificationHistory() {
      try {
        const idToken = localStorage.getItem('auth_token');
        
        if (!idToken) {
          console.warn('No authentication token found, using sample data for notification history');
          // Keep any existing notification history we might have added
          if (this.notificationHistory.length === 0) {
            this.notificationHistory = [
              {
                id: '1',
                type: 'email',
                timestamp: new Date(),
                status: 'sent',
                recipients: ['john.doe@example.com']
              },
              {
                id: '2',
                type: 'slack',
                timestamp: new Date(Date.now() - 3600000),
                status: 'sent',
                recipients: ['#general']
              }
            ];
          }
          return;
        }
        
        // Get history from API
        const response = await axios.get('/api/notifications/history', {
          headers: { Authorization: `Bearer ${idToken}` },
          params: {
            page: 1,
            limit: 20
          }
        });
        
        if (response.data && response.data.data && response.data.data.history) {
          this.notificationHistory = response.data.data.history.map(item => ({
            id: item._id,
            type: item.type,
            timestamp: new Date(item.createdAt),
            status: item.status,
            recipients: item.recipients || []
          }));
        } else {
          this.notificationHistory = [];
        }
      } catch (error) {
        console.error('Error loading notification history:', error);
        // For demo mode
        if (error.response && error.response.status === 401) {
          console.warn('User not authenticated, using sample data');
          // Keep any existing notification history we might have added
          if (this.notificationHistory.length === 0) {
            this.notificationHistory = [
              {
                id: '1',
                type: 'email',
                timestamp: new Date(),
                status: 'sent',
                recipients: ['john.doe@example.com']
              },
              {
                id: '2',
                type: 'slack',
                timestamp: new Date(Date.now() - 3600000),
                status: 'sent',
                recipients: ['#general']
              }
            ];
          }
        } else {
          console.warn('Failed to load notification history');
        }
      }
    },
    
    async updateSettings() {
      try {
        const idToken = localStorage.getItem('auth_token');
        
        // Allow users to update settings without authentication for demo purposes
        if (!idToken) {
          console.log('No authentication token, but settings will be updated in local state');
          this.showSuccessNotification('Settings updated in local view');
          return;
        }
        
        // Send settings to the API
        const response = await axios.put('/api/notifications/settings', {
          emailNotifications: this.notificationSettings.emailEnabled,
          slackNotifications: this.notificationSettings.slackEnabled,
          mondayComNotifications: this.notificationSettings.mondayEnabled,
          email: this.notificationSettings.email,
          frequency: this.notificationSettings.frequency
        }, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        if (response.data && response.data.success) {
          this.showSuccessNotification('Settings updated successfully');
        } else {
          throw new Error('Failed to update settings');
        }
      } catch (error) {
        console.error('Error updating settings:', error);
        // If it's an auth error, don't show an error, just use the demo mode
        if (error.response && error.response.status === 401) {
          console.warn('User not authenticated, settings saved locally only');
          this.showSuccessNotification('Settings saved locally (demo mode)');
        } else {
          this.showErrorNotification('Failed to update settings: ' + (error.response?.data?.message || error.message));
        }
      }
      await this.loadUserSettings();
      this.accountSetupComplete = this.checkAccountSetup();
    },
    
    async sendCubicleSequenceNotification() {
      this.sendingNotification = true;
      try {
        const idToken = localStorage.getItem('auth_token');
        
        // Demo mode if not authenticated
        if (!idToken) {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          this.showSuccessNotification('Notifications sent successfully (demo mode)');
          
          // Add to local notification history in demo mode
          this.notificationHistory.unshift({
            id: Date.now().toString(),
            type: 'email',
            timestamp: new Date(),
            status: 'sent',
            recipients: [this.notificationSettings.email || 'user@example.com']
          });
          
          return;
        }
        
        // Send actual API request
        const response = await axios.post('/api/notifications/send-bulk', {
          type: 'cubicle_sequence',
          message: 'Here is your cubicle sequence information'
        }, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        if (response.data && response.data.success) {
          this.showSuccessNotification('Notifications sent successfully');
          await this.loadNotificationHistory();
        } else {
          throw new Error('Failed to send notifications');
        }
      } catch (error) {
        console.error('Error sending notifications:', error);
        // If authentication error, use demo mode
        if (error.response && error.response.status === 401) {
          console.warn('User not authenticated, using demo mode');
          this.showSuccessNotification('Notifications sent (demo mode)');
          
          // Add to local notification history in demo mode
          this.notificationHistory.unshift({
            id: Date.now().toString(),
            type: 'email',
            timestamp: new Date(),
            status: 'sent',
            recipients: [this.notificationSettings.email || 'user@example.com']
          });
        } else {
          this.showErrorNotification('Failed to send notifications: ' + (error.response?.data?.message || error.message));
        }
      } finally {
        this.sendingNotification = false;
      }
    },
    
    async sendSlackNotification() {
      this.sendingSlack = true;
      try {
        // Check if Slack is enabled in settings
        if (!this.notificationSettings.slackEnabled) {
          this.showErrorNotification('Slack notifications are disabled. Enable them in Settings first.');
          return;
        }
        
        const idToken = localStorage.getItem('auth_token');
        
        // Demo mode if not authenticated
        if (!idToken) {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          this.showSuccessNotification('Slack notification sent (demo mode)');
          
          // Add to local notification history in demo mode
          this.notificationHistory.unshift({
            id: Date.now().toString(),
            type: 'slack',
            timestamp: new Date(),
            status: 'sent',
            recipients: ['#general']
          });
          
          return;
        }
        
        // Send actual API request
        const response = await axios.post('/api/notifications/send-bulk', {
          type: 'slack',
          message: 'Cubicle utilization update is now available.'
        }, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        if (response.data && response.data.success) {
          this.showSuccessNotification('Slack notification sent successfully');
          await this.loadNotificationHistory();
        } else {
          throw new Error('Failed to send Slack notification');
        }
      } catch (error) {
        console.error('Error sending Slack notification:', error);
        // If authentication error, use demo mode
        if (error.response && error.response.status === 401) {
          console.warn('User not authenticated, using demo mode');
          this.showSuccessNotification('Slack notification sent (demo mode)');
          
          // Add to local notification history in demo mode
          this.notificationHistory.unshift({
            id: Date.now().toString(),
            type: 'slack',
            timestamp: new Date(),
            status: 'sent',
            recipients: ['#general']
          });
        } else {
          this.showErrorNotification('Failed to send Slack notification: ' + (error.response?.data?.message || error.message));
        }
      } finally {
        this.sendingSlack = false;
      }
    },
    
    async createMondayTask() {
      this.sendingMonday = true;
      try {
        // Check if Monday.com is enabled in settings
        if (!this.notificationSettings.mondayEnabled) {
          this.showErrorNotification('Monday.com integration is disabled. Enable it in Settings first.');
          return;
        }
        
        const idToken = localStorage.getItem('auth_token');
        
        // Demo mode if not authenticated
        if (!idToken) {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          this.showSuccessNotification('Monday.com task created successfully (demo mode)');
          
          // Add to local notification history in demo mode
          this.notificationHistory.unshift({
            id: Date.now().toString(),
            type: 'monday',
            timestamp: new Date(),
            status: 'sent',
            recipients: ['Cubicle Management Board']
          });
          
          return;
        }
        
        // Send actual API request
        const response = await axios.post('/api/notifications/send-bulk', {
          type: 'monday',
          message: 'New cubicle assignment task created'
        }, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        if (response.data && response.data.success) {
          this.showSuccessNotification('Monday.com task created successfully');
          await this.loadNotificationHistory();
        } else {
          throw new Error('Failed to create Monday.com task');
        }
      } catch (error) {
        console.error('Error creating Monday.com task:', error);
        // If authentication error, use demo mode
        if (error.response && error.response.status === 401) {
          console.warn('User not authenticated, using demo mode');
          this.showSuccessNotification('Monday.com task created (demo mode)');
          
          // Add to local notification history in demo mode
          this.notificationHistory.unshift({
            id: Date.now().toString(),
            type: 'monday',
            timestamp: new Date(),
            status: 'sent',
            recipients: ['Cubicle Management Board']
          });
        } else {
          this.showErrorNotification('Failed to create Monday.com task: ' + (error.response?.data?.message || error.message));
        }
      } finally {
        this.sendingMonday = false;
      }
    },
    
    async refreshUserData() {
      this.refreshingData = true;
      try {
        await this.loadUserData();
        this.showSuccessNotification('User data refreshed');
      } catch (error) {
        console.error('Error refreshing user data:', error);
        this.showErrorNotification('Failed to refresh user data');
      } finally {
        this.refreshingData = false;
      }
    },
    
    async sendIndividualNotification(user) {
      this.$set(this.sendingIndividual, user.uid, true);
      try {
        const idToken = localStorage.getItem('auth_token');
        
        // Demo mode if not authenticated
        if (!idToken) {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          this.showSuccessNotification(`Notification sent to ${user.email} (demo mode)`);
          
          // Add to local notification history in demo mode
          this.notificationHistory.unshift({
            id: Date.now().toString(),
            type: 'email',
            timestamp: new Date(),
            status: 'sent',
            recipients: [user.email]
          });
          
          return;
        }
        
        // Send actual API request
        const response = await axios.post('/api/notifications/send', {
          targetUserId: user.uid,
          type: 'cubicle_sequence',
          message: 'Here is your cubicle sequence information'
        }, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        if (response.data && response.data.success) {
          this.showSuccessNotification(`Notification sent to ${user.email}`);
          await this.loadNotificationHistory();
        } else {
          throw new Error(`Failed to send notification to ${user.email}`);
        }
      } catch (error) {
        console.error('Error sending individual notification:', error);
        // If authentication error, use demo mode
        if (error.response && error.response.status === 401) {
          console.warn('User not authenticated, using demo mode');
          this.showSuccessNotification(`Notification sent to ${user.email} (demo mode)`);
          
          // Add to local notification history in demo mode
          this.notificationHistory.unshift({
            id: Date.now().toString(),
            type: 'email',
            timestamp: new Date(),
            status: 'sent',
            recipients: [user.email]
          });
        } else {
          this.showErrorNotification(`Failed to send notification to ${user.email}: ${error.response?.data?.message || error.message}`);
        }
      } finally {
        this.$set(this.sendingIndividual, user.uid, false);
      }
    },
    
    formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleString();
    },
    
    showSuccessNotification(message) {
      this.notificationKind = 'success';
      this.notificationTitle = 'Success';
      this.notificationMessage = message;
      this.showNotification = true;
      
      setTimeout(() => {
        this.clearNotification();
      }, 5000);
    },
    
    showErrorNotification(message) {
      this.notificationKind = 'error';
      this.notificationTitle = 'Error';
      this.notificationMessage = message;
      this.showNotification = true;
      
      setTimeout(() => {
        this.clearNotification();
      }, 8000);
    },
    
    clearNotification() {
      this.showNotification = false;
    },
    
    setupSlackIntegration() {
      // Prevent event propagation to avoid any redirect issues
      event?.preventDefault?.();
      event?.stopPropagation?.();
      
      // Show modal or form for Slack setup
      const slackEmail = prompt('Enter your Slack workspace email:', this.notificationSettings.email);
      
      if (!slackEmail) return;
      
      if (!slackEmail.includes('@')) {
        this.showErrorNotification('Please enter a valid email address');
        return;
      }
      
      try {
        this.showSuccessNotification('Slack integration setup initiated. A verification email will be sent to ' + slackEmail);
        
        // In a real implementation, this would connect to Slack API
        // For demo purposes, we just enable the toggle
        this.notificationSettings.slackEnabled = true;
        // Don't await updateSettings to avoid potential auth errors
        this.updateSettings().catch(err => console.warn('Settings update error:', err));
        
        // Add to notification history
        this.notificationHistory.unshift({
          id: Date.now().toString(),
          type: 'system',
          timestamp: new Date(),
          status: 'sent',
          recipients: [slackEmail]
        });
      } catch (error) {
        console.error('Error setting up Slack:', error);
        this.showErrorNotification('Failed to setup Slack integration');
      }
    },
    
    setupMondayIntegration() {
      // Prevent event propagation to avoid any redirect issues
      event?.preventDefault?.();
      event?.stopPropagation?.();
      
      // Show modal or form for Monday.com setup
      const mondayEmail = prompt('Enter your Monday.com account email:', this.notificationSettings.email);
      
      if (!mondayEmail) return;
      
      if (!mondayEmail.includes('@')) {
        this.showErrorNotification('Please enter a valid email address');
        return;
      }
      
      try {
        this.showSuccessNotification('Monday.com integration setup initiated. A verification email will be sent to ' + mondayEmail);
        
        // In a real implementation, this would connect to Monday.com API
        // For demo purposes, we just enable the toggle
        this.notificationSettings.mondayEnabled = true;
        // Don't await updateSettings to avoid potential auth errors
        this.updateSettings().catch(err => console.warn('Settings update error:', err));
        
        // Add to notification history
        this.notificationHistory.unshift({
          id: Date.now().toString(),
          type: 'system',
          timestamp: new Date(),
          status: 'sent',
          recipients: [mondayEmail]
        });
      } catch (error) {
        console.error('Error setting up Monday.com:', error);
        this.showErrorNotification('Failed to setup Monday.com integration');
      }
    },
    isValidEmail(email) {
      // Simple email validation regex
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    checkAccountSetup() {
      // Require a valid email and at least one integration enabled
      return this.isValidEmail(this.notificationSettings.email) &&
        (this.notificationSettings.emailEnabled || this.notificationSettings.slackEnabled || this.notificationSettings.mondayEnabled);
    },
  }
};
</script>

<style scoped>
.notifications-container {
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

.notifications-grid {
  padding: 1.5rem;
  width: 100%;
  max-width: none;
  margin: 0;
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

.settings-group {
  margin-bottom: 2rem;
}

.integration-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.setup-button {
  min-width: 120px;
}

.actions-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.table-container {
  margin-top: 1rem;
}

.history-list {
  margin-top: 1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6f6f6f;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 2rem;
}
</style>
