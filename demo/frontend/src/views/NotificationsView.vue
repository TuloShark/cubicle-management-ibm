<template>
  <div class="notifications-container">
    <div class="page-header">
      <h1 class="page-title">Notifications</h1>
      <p class="page-subtitle">Send cubicle sequence notifications to users via email and Slack</p>
    </div>
    
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
                  <p class="tile-subtitle">Get your current cubicle sequence assignment via email and Slack</p>
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
                    Send My Notification Update
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
                <div 
                  class="info-item centered draggable"
                  :class="{ 'dragging': isDragging }"
                  :style="dragStyle"
                  @mousedown="startDrag"
                  @touchstart="startDrag"
                >
                  <div class="drag-handle">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2.5 3.5a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM2.5 8a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zM3 12.5a.5.5 0 0 0 0 1h10a.5.5 0 0 0 0-1H3z"/>
                    </svg>
                  </div>
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
import { computed } from 'vue';

export default {
  name: 'NotificationsView',
  setup() {
    const { currentUser, isAdmin } = useAuth();
    const isAdminUser = computed(() => {
      if (!currentUser.value) return false;
      if (isAdmin.value) return true;
      const adminUids = (import.meta.env.VITE_ADMIN_UIDS || '').split(',').map(u => u.trim());
      return adminUids.includes(currentUser.value.uid);
    });
    return { isAdminUser, currentUser };
  },
  data() {
    return {
      notificationSettings: {
        emailEnabled: true,
        slackEnabled: false,
        mondayEnabled: false,
        email: '',
        frequency: 'daily'
      },
      sendingNotification: false,
      showNotification: false,
      notificationKind: 'success',
      notificationTitle: '',
      notificationMessage: '',
      accountSetupComplete: false,
      emailTouched: false,
      isDragging: false,
      dragData: {
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        initialTransform: { x: 0, y: 0 }
      },
    };
  },
  computed: {
    dragStyle() {
      if (!this.isDragging) {
        return {
          transform: `translate(${this.dragData.initialTransform.x}px, ${this.dragData.initialTransform.y}px)`
        };
      }
      return {
        transform: `translate(${this.dragData.currentX}px, ${this.dragData.currentY}px)`,
        zIndex: 1000
      };
    }
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
        const idToken = localStorage.getItem('auth_token');
        if (!idToken) {
          this.notificationSettings = {
            emailEnabled: true,
            slackEnabled: false,
            mondayEnabled: false,
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
            mondayEnabled: response.data.data.mondayComNotifications || false,
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
        const idToken = localStorage.getItem('auth_token');
        if (!idToken) {
          // In demo mode, just validate locally without showing notification
          this.accountSetupComplete = this.checkAccountSetup();
          return;
        }
        await axios.put('/api/notifications/settings', {
          emailNotifications: this.notificationSettings.emailEnabled,
          slackNotifications: this.notificationSettings.slackEnabled,
          mondayComNotifications: this.notificationSettings.mondayEnabled,
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
        const idToken = localStorage.getItem('auth_token');
        if (!idToken) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          this.showSuccessNotification('Notification sent successfully (demo mode)');
          return;
        }
        const response = await axios.post('/api/notifications/send-individual', {}, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (response.data && response.data.success) {
          this.showSuccessNotification('Notification sent successfully to your account');
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
    },
    startDrag(event) {
      this.isDragging = true;
      const clientX = event.type === 'touchstart' ? event.touches[0].clientX : event.clientX;
      const clientY = event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;
      
      this.dragData.startX = clientX - this.dragData.currentX;
      this.dragData.startY = clientY - this.dragData.currentY;
      
      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
      document.addEventListener('touchmove', this.onDrag);
      document.addEventListener('touchend', this.stopDrag);
      
      event.preventDefault();
    },
    onDrag(event) {
      if (!this.isDragging) return;
      
      const clientX = event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
      const clientY = event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;
      
      this.dragData.currentX = clientX - this.dragData.startX;
      this.dragData.currentY = clientY - this.dragData.startY;
    },
    stopDrag() {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      
      // Smooth return to center with animation
      this.animateToCenter();
      
      document.removeEventListener('mousemove', this.onDrag);
      document.removeEventListener('mouseup', this.stopDrag);
      document.removeEventListener('touchmove', this.onDrag);
      document.removeEventListener('touchend', this.stopDrag);
    },
    animateToCenter() {
      const startX = this.dragData.currentX;
      const startY = this.dragData.currentY;
      const targetX = this.dragData.initialTransform.x;
      const targetY = this.dragData.initialTransform.y;
      
      const duration = 300; // ms
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        this.dragData.currentX = startX + (targetX - startX) * easeOut;
        this.dragData.currentY = startY + (targetY - startY) * easeOut;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.dragData.currentX = targetX;
          this.dragData.currentY = targetY;
        }
      };
      
      requestAnimationFrame(animate);
    },
  }
};
</script>

<style scoped>
/* IBM Carbon Design System styling */
.notifications-container {
  padding: 0;
  margin-top: 64px;
  background-color: #f4f4f4;
  flex: 1; /* Use flex instead of min-height calculation */
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
  max-width: 1200px;
  margin: 0 auto;
}

/* Main notification tile */
.notification-tile {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 0;
  transition: box-shadow 0.15s ease;
  margin-bottom: 1.5rem;
}

.notification-tile:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.tile-header {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.header-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #0f62fe, #4589ff);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.header-text {
  flex: 1;
}

.tile-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #161616;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;
}

.tile-subtitle {
  font-size: 1rem;
  color: #6f6f6f;
  margin: 0;
  font-weight: 400;
  line-height: 1.4;
}

.notification-content {
  padding: 1.5rem;
}

/* Input section */
.input-section {
  margin-bottom: 1.5rem;
}

.email-input {
  max-width: 400px;
}

/* Status section */
.status-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f4f4f4;
  border-radius: 4px;
  border-left: 4px solid #e0e0e0;
  transition: border-color 0.2s ease;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-indicator.status-ready {
  border-left-color: #198038;
}

.status-indicator.status-ready .status-icon {
  color: #198038;
}

.status-indicator.status-pending .status-icon {
  color: #f1c21b;
}

.status-icon {
  flex-shrink: 0;
}

.status-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: #161616;
}

/* Action section */
.action-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}

.send-button {
  min-width: 240px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.send-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(15, 98, 254, 0.3);
}

.loading-spinner {
  width: 16px !important;
  height: 16px !important;
  margin-right: 8px;
}

.loading-icon {
  margin-right: 0.5rem;
}

.action-description {
  max-width: 500px;
}

.action-description p {
  font-size: 0.875rem;
  color: #6f6f6f;
  margin: 0;
  line-height: 1.4;
}

/* Information tile */
.info-tile {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  padding: 1.5rem;
  transition: box-shadow 0.15s ease;
}

.info-tile:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.info-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.info-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #161616;
  margin: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.info-grid.single-item {
  display: flex;
  justify-content: center;
  max-width: 400px;
  margin: 0 auto;
}

.info-item.centered {
  width: 100%;
  max-width: 350px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background-color: #f4f4f4;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  transition: all 0.15s ease;
}

.info-item:hover {
  background-color: #e8e8e8;
  transform: translateY(-1px);
}

.info-item.draggable {
  cursor: grab;
  user-select: none;
  position: relative;
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.15s ease;
}

.info-item.draggable:active {
  cursor: grabbing;
}

.info-item.draggable.dragging {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  transform: scale(1.05);
  background-color: #ffffff;
  border-color: #0f62fe;
  transition: none;
}

.drag-handle {
  position: absolute;
  top: 8px;
  right: 8px;
  color: #8d8d8d;
  opacity: 0;
  transition: opacity 0.2s ease;
  cursor: grab;
  padding: 4px;
  border-radius: 2px;
}

.info-item.draggable:hover .drag-handle {
  opacity: 1;
}

.info-item.draggable.dragging .drag-handle {
  opacity: 1;
  color: #0f62fe;
}

.info-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.email-icon {
  background: linear-gradient(135deg, #0f62fe, #4589ff);
  color: white;
}

.slack-icon {
  background: linear-gradient(135deg, #4285f4, #7b68ee);
  color: white;
}

.sync-icon {
  background: linear-gradient(135deg, #198038, #24a148);
  color: white;
}

.info-text h5 {
  font-size: 1rem;
  font-weight: 600;
  color: #161616;
  margin: 0 0 0.5rem 0;
}

.info-text p {
  font-size: 0.875rem;
  color: #6f6f6f;
  margin: 0;
  line-height: 1.4;
}

/* Toast notification */
.toast-notification {
  position: fixed;
  top: 80px;
  right: 1rem;
  z-index: 9999;
  max-width: 400px;
}

/* Responsive design */
@media (max-width: 768px) {
  .notifications-container {
    margin-top: 48px;
  }
  
  .page-header {
    padding: 1.5rem 1rem 1rem 1rem;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .notifications-grid {
    padding: 1rem;
  }
  
  .tile-header {
    padding: 1rem;
  }
  
  .header-content {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }
  
  .notification-content {
    padding: 1rem;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .info-item {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }
  
  .send-button {
    width: 100%;
    min-width: auto;
  }
  
  .action-section {
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .header-icon {
    width: 32px;
    height: 32px;
  }
  
  .tile-title {
    font-size: 1.25rem;
  }
  
  .tile-subtitle {
    font-size: 0.875rem;
  }
}

/* Carbon component overrides */
:deep(.bx--tile) {
  border-radius: 4px;
}

:deep(.bx--text-input) {
  margin-bottom: 0;
}

:deep(.bx--form-item) {
  margin-bottom: 0;
}

:deep(.bx--btn--primary) {
  background-color: #0f62fe;
  border-color: #0f62fe;
}

:deep(.bx--btn--primary:hover) {
  background-color: #0353e9;
  border-color: #0353e9;
}

:deep(.bx--btn--primary:disabled) {
  background-color: #c6c6c6;
  border-color: #c6c6c6;
  color: #8d8d8d;
}

:deep(.bx--toast-notification) {
  min-width: 320px;
  max-width: 400px;
}
</style>
