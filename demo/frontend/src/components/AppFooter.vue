<template>
  <footer class="app-footer">
    <div class="footer-content">
      <!-- Left section: Company info -->
      <div class="footer-section footer-brand">
        <div class="brand-info">
          <span class="brand-name">IBM Space Optimization</span>
          <span class="brand-version">v{{ version }}</span>
        </div>
        <div class="brand-tagline">Enterprise workspace management</div>
      </div>
      
      <!-- Center section: System status -->
      <div class="footer-section footer-status">
        <div class="status-indicator">
          <div class="status-dot" :class="systemStatus.class"></div>
          <span class="status-text">{{ systemStatus.text }}</span>
        </div>
        <div class="last-updated">
          Last updated: {{ lastUpdated }}
        </div>
      </div>
      
      <!-- Right section: Support and links -->
      <div class="footer-section footer-links">
        <div class="support-info">
          <span class="support-text">Need help?</span>
          <cv-button 
            kind="ghost" 
            size="sm" 
            @click="openSupport"
            class="support-button"
          >
            IT Support
          </cv-button>
        </div>
        <div class="footer-meta">
          <span class="copyright">© {{ currentYear }} IBM Corporation</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { CvButton } from '@carbon/vue';

export default {
  name: 'AppFooter',
  components: {
    CvButton
  },
  setup() {
    const version = ref('2.1.0');
    const lastUpdated = ref('');
    const systemOnline = ref(true);
    const updateInterval = ref(null);

    const currentYear = computed(() => new Date().getFullYear());
    
    const systemStatus = computed(() => {
      return systemOnline.value 
        ? { class: 'online', text: 'System operational' }
        : { class: 'offline', text: 'System maintenance' };
    });

    const updateTimestamp = () => {
      const now = new Date();
      lastUpdated.value = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };

    const openSupport = () => {
      // In a real app, this could open a support ticket system or help modal
      alert('IT Support: Please contact your system administrator for technical assistance with the cubicle management system.');
    };

    onMounted(() => {
      updateTimestamp();
      // Update timestamp every minute
      updateInterval.value = setInterval(updateTimestamp, 60000);
    });

    onUnmounted(() => {
      if (updateInterval.value) {
        clearInterval(updateInterval.value);
      }
    });

    return {
      version,
      lastUpdated,
      systemStatus,
      currentYear,
      openSupport
    };
  }
};
</script>

<style scoped>
.app-footer {
  position: relative;
  bottom: 0;
  left: 0;
  right: 0;
  background: #161616;
  color: #f4f4f4;
  border-top: 1px solid #393939;
  margin-top: auto;
  z-index: 100;
  font-family: 'IBM Plex Sans', sans-serif;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1584px;
  margin: 0 auto;
  padding: 1rem 2rem;
  gap: 2rem;
}

.footer-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Brand Section */
.footer-brand {
  flex: 1;
  align-items: flex-start;
}

.brand-info {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.brand-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.02em;
}

.brand-version {
  font-size: 0.75rem;
  color: #a8a8a8;
  font-weight: 400;
  padding: 0.125rem 0.375rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.brand-tagline {
  font-size: 0.75rem;
  color: #a8a8a8;
  font-weight: 400;
}

/* Status Section */
.footer-status {
  flex: 1;
  align-items: center;
  text-align: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.25rem;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background: #24a148;
  box-shadow: 0 0 0 2px rgba(36, 161, 72, 0.2);
}

.status-dot.offline {
  background: #fa4d56;
  box-shadow: 0 0 0 2px rgba(250, 77, 86, 0.2);
}

.status-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: #f4f4f4;
}

.last-updated {
  font-size: 0.6875rem;
  color: #a8a8a8;
  font-weight: 400;
}

/* Links Section */
.footer-links {
  flex: 1;
  align-items: flex-end;
  text-align: right;
}

.support-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-bottom: 0.25rem;
}

.support-text {
  font-size: 0.75rem;
  color: #a8a8a8;
  font-weight: 400;
}

.support-button {
  min-height: 28px !important;
  padding: 0.25rem 0.75rem !important;
  font-size: 0.75rem !important;
  border-radius: 0 !important;
}

.support-button :deep(.bx--btn) {
  min-height: 28px !important;
  padding: 0.25rem 0.75rem !important;
  font-size: 0.75rem !important;
  border-radius: 0 !important;
  color: #0f62fe !important;
  border-color: transparent !important;
}

.support-button :deep(.bx--btn:hover) {
  background: rgba(15, 98, 254, 0.1) !important;
  color: #0353e9 !important;
}

.footer-meta {
  align-self: flex-end;
}

.copyright {
  font-size: 0.6875rem;
  color: #6f6f6f;
  font-weight: 400;
}

/* Responsive Design */
@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    text-align: center;
  }
  
  .footer-section {
    align-items: center !important;
    text-align: center !important;
  }
  
  .brand-info {
    justify-content: center;
  }
  
  .support-info {
    justify-content: center;
  }
  
  .footer-meta {
    align-self: center;
  }
}

@media (max-width: 480px) {
  .footer-content {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .brand-info {
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .support-info {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
