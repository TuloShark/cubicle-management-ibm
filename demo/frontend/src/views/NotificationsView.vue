<template>
  <div class="notifications-container">
    <!-- Simple Consistent Header Component -->
    <PageHeader
      title="Notifications"
      subtitle="Send cubicle sequence notifications to users via email and Slack"
    />
    
    <!-- Main Content Area -->
    <cv-grid class="notifications-grid">
      <!-- Main Notification Card -->
      <cv-row class="main-row">
        <cv-column :sm="4" :md="12" :lg="12">
          <cv-tile class="notification-tile">
            <div class="tile-header">
              <div class="header-content">
                <div class="header-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div class="header-text">
                  <h3 class="tile-title">Send Notification Update</h3>
                  <p class="tile-subtitle">Get your cubicle sequence assignment for the selected date via email and Slack</p>
                </div>
              </div>
            </div>
            
            <div class="notification-content">
              <!-- Email Input Section -->
              <div class="input-section">
                <cv-text-input
                  v-model="notificationSettings.email"
                  label="Your Email Address"
                  placeholder="Enter your email address"
                  helper-text="This email will be used as the sender for notifications"
                  readonly
                  class="email-input"
                />
              </div>
              
              <!-- Status Indicator -->
              <div class="status-section">
                <div class="status-indicator" :class="{ 'status-ready': accountSetupComplete, 'status-pending': !accountSetupComplete }">
                  <div class="status-icon">
                    <svg v-if="accountSetupComplete" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm3.5 6.1L7.1 10.5c-.2.2-.4.2-.6 0L4.5 8.5c-.2-.2-.2-.4 0-.6s.4-.2.6 0l1.6 1.6 3.8-3.8c.2-.2.4-.2.6 0s.2.4 0 .6z"/>
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm4 9H4V7h8v2z"/>
                    </svg>
                  </div>
                  <span class="status-text">
                    {{ accountSetupComplete ? 'Ready to send notifications' : 'Email validation required' }}
                  </span>
                </div>
              </div>
              
              <!-- Action Section -->
              <div class="action-section">
                <cv-button 
                  kind="primary" 
                  size="lg"
                  @click="sendCubicleSequenceNotification"
                  :disabled="sendingNotification || !accountSetupComplete"
                  class="send-button"
                >
                  <template v-if="sendingNotification">
                    <cv-loading class="loading-spinner" size="sm" />
                    <span>Sending Notification...</span>
                  </template>
                  <template v-else>
                    Send Notification for Selected Date
                  </template>
                </cv-button>
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
      
      <!-- Information Card -->
      <cv-row class="info-row">
        <cv-column :sm="4" :md="12" :lg="12">
          <cv-tile class="info-tile">
            <div class="info-header">
              <h4 class="info-title">How Notifications Work</h4>
            </div>
            <div class="info-content">
              <div class="info-grid single-item">
                <div class="info-item centered">
                  <div class="info-icon email-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M18 3H2C1.45 3 1 3.45 1 4v12c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zm-1 13H3V6l7 4 7-4v10zm-7-6L3 6h14l-7 4z"/>
                    </svg>
                  </div>
                  <div class="info-text">
                    <h5>Email Notifications</h5>
                    <p>Email for the Manager, and distribution with Slack</p>
                  </div>
                </div>
              </div>
            </div>
          </cv-tile>
        </cv-column>
      </cv-row>
    </cv-grid>
    
    <!-- Toast Notification -->
    <cv-toast-notification
      v-if="showNotification"
      :kind="notificationKind"
      :title="notificationTitle"
      :subtitle="notificationMessage"
      @close="clearNotification"
      class="toast-notification"
    />
  </div>
</template>

<script>
import axios from 'axios';
import useAuth from '../composables/useAuth';
import { useDateStore } from '../composables/useDateStore';
import { computed } from 'vue';
import PageHeader from '../components/PageHeader.vue';
import { isAdminUid } from '../utils/envUtils';
import './styles/NotificationsViewStyles.css';

export default {
  name: 'NotificationsView',
  components: {
    PageHeader
  },
  setup() {
    const { currentUser, isAdmin, token, authError, clearError, refreshToken } = useAuth();
    const { selectedDateString } = useDateStore();
    const isAdminUser = computed(() => {
      if (!currentUser.value) return false;
      if (isAdmin.value) return true;
      return isAdminUid(currentUser.value.uid);
    });
    return { isAdminUser, currentUser, selectedDateString, token, authError, clearError, refreshToken };
  },
  data() {
    return {
      notificationSettings: {
        emailEnabled: true,
        slackEnabled: false,
        email: '',
        frequency: 'daily'
      },
      sendingNotification: false,
      showNotification: false,
      notificationKind: 'success',
      notificationTitle: '',
      notificationMessage: '',
      accountSetupComplete: false,
      emailTouched: false
    };
  },
  watch: {
    'notificationSettings.email': {
      handler() {
        // Update account setup status when email changes
        this.accountSetupComplete = this.checkAccountSetup();
      }
    }
  },
  async created() {
    await this.loadUserSettings();
    this.accountSetupComplete = this.checkAccountSetup();
  },
  methods: {
    async loadUserSettings() {
      try {
        const idToken = this.token;
        if (!idToken) {
          this.notificationSettings = {
            emailEnabled: true,
            slackEnabled: false,
            email: this.currentUser?.email || '',
            frequency: 'daily'
          };
          return;
        }
        const response = await axios.get('/api/notifications/settings', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (response.data && response.data.data) {
          this.notificationSettings = {
            emailEnabled: response.data.data.emailNotifications || true,
            slackEnabled: response.data.data.slackNotifications || false,
            email: response.data.data.email || this.currentUser?.email || '',
            frequency: response.data.data.frequency || 'daily'
          };
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    },
    async updateSettings() {
      try {
        const idToken = this.token;
        if (!idToken) {
          // In demo mode, just validate locally without showing notification
          this.accountSetupComplete = this.checkAccountSetup();
          return;
        }
        await axios.put('/api/notifications/settings', {
          emailNotifications: this.notificationSettings.emailEnabled,
          slackNotifications: this.notificationSettings.slackEnabled,
          email: this.notificationSettings.email,
          frequency: this.notificationSettings.frequency
        }, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        this.showSuccessNotification('Settings updated successfully');
      } catch (error) {
        console.error('Error updating settings:', error);
        this.showErrorNotification('Failed to update settings: ' + (error.response?.data?.message || error.message));
      }
      // Only update account setup status, don't reload settings to avoid conflicts
      this.accountSetupComplete = this.checkAccountSetup();
    },
    async sendCubicleSequenceNotification() {
      this.sendingNotification = true;
      try {
        const idToken = this.token;
        if (!idToken) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          this.showSuccessNotification('Notification sent successfully (demo mode)');
          return;
        }
        
        // Include the selected date from the global date store
        const requestData = {};
        if (this.selectedDateString) {
          requestData.date = this.selectedDateString;
        }
        
        const response = await axios.post('/api/notifications/send-individual', requestData, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (response.data && response.data.success) {
          const dateMessage = this.selectedDateString ? ` for ${new Date(this.selectedDateString + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : '';
          this.showSuccessNotification(`Notification sent successfully to your account${dateMessage}`);
        } else {
          throw new Error('Failed to send notification');
        }
      } catch (error) {
        console.error('Error sending notification:', error);
        this.showErrorNotification('Failed to send notification: ' + (error.response?.data?.message || error.message));
      } finally {
        this.sendingNotification = false;
      }
    },
    isValidEmail(email) {
      if (!email || email.trim() === '') return false;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    },
    checkAccountSetup() {
      return this.notificationSettings.email && this.notificationSettings.email.trim() !== '';
    },
    showSuccessNotification(message) {
      this.notificationKind = 'success';
      this.notificationTitle = 'Success';
      this.notificationMessage = message;
      this.showNotification = true;
      setTimeout(() => { this.clearNotification(); }, 5000);
    },
    showErrorNotification(message) {
      this.notificationKind = 'error';
      this.notificationTitle = 'Error';
      this.notificationMessage = message;
      this.showNotification = true;
      setTimeout(() => { this.clearNotification(); }, 8000);
    },
    clearNotification() {
      this.showNotification = false;
    },
    handleEmailBlur() {
      this.emailTouched = true;
      // Update settings when user finishes editing email
      this.updateSettings();
    }
  }
};
</script>