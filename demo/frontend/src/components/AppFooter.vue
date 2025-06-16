<!--
===================================================================
COMPONENT: AppFooter
===================================================================
PURPOSE: 
Displays the application footer with branding, system status, and support links.
Shows across all authenticated pages (excludes login/public routes).

FEATURES:
- Company branding with version display
- Real-time system status indicator
- Live timestamp updates (every minute)
- IT support contact integration
- Responsive design for mobile devices

INTEGRATION:
- Used in: App.vue as global footer
- Visibility: Authenticated users only
- Position: Bottom of all main application pages

DEPENDENCIES:
- @carbon/vue (CvButton component)
- Vue 3 Composition API

ACCESSIBILITY:
- Semantic footer element
- Screen reader friendly status indicators
- Keyboard accessible support button

LAST UPDATED: June 2025
===================================================================
-->

<template>
  <footer 
    class="app-footer" 
    role="contentinfo" 
    aria-label="Application footer"
  >
    <div class="footer-content">
      <!-- Left section: Company info -->
      <div class="footer-section footer-brand">
        <div class="brand-info">
          <span 
            class="brand-name"
            aria-label="Application name"
          >IBM Space Optimization</span>
          <span 
            class="brand-version"
            aria-label="Version"
          >v{{ version }}</span>
        </div>
        <div 
          class="brand-tagline"
          aria-label="Application description"
        >Enterprise workspace management</div>
      </div>
      
      <!-- Center section: System status -->
      <div class="footer-section footer-status">
        <div 
          class="status-indicator"
          role="status"
          :aria-label="`System status: ${systemStatus.text}`"
        >
          <div 
            class="status-dot" 
            :class="systemStatus.class"
            aria-hidden="true"
          ></div>
          <span class="status-text">{{ systemStatus.text }}</span>
        </div>
        <div 
          class="last-updated"
          aria-label="Last update time"
        >
          <span class="sr-only">Last updated at </span>
          {{ lastUpdated }}
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
            aria-label="Contact IT Support for technical assistance"
          >
            IT Support
          </cv-button>
        </div>
        <div class="footer-meta">
          <span 
            class="copyright"
            aria-label="Copyright information"
          >© {{ currentYear }} IBM Corporation</span>
        </div>
      </div>
    </div>
    
    <!-- Screen reader only content -->
    <div class="sr-only">
      Application footer containing company information, system status, and support links
    </div>
  </footer>
</template>

<script>
/**
 * AppFooter Component
 * 
 * A responsive footer component that displays:
 * - Application branding and version information
 * - Real-time system status with visual indicators
 * - Live timestamp updates
 * - Support contact functionality
 * 
 * @component
 * @example
 * <AppFooter />
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { CvButton } from '@carbon/vue';

export default {
  name: 'AppFooter',
  components: {
    CvButton
  },
  setup() {
    // Reactive state
    const version = ref('2.1.0');
    const lastUpdated = ref('');
    const systemOnline = ref(true);
    const updateInterval = ref(null);
    const isComponentMounted = ref(false);

    /**
     * Computed property for current year in copyright
     * @returns {number} Current year
     */
    const currentYear = computed(() => new Date().getFullYear());
    
    /**
     * Computed property for system status display
     * @returns {Object} Status object with class and text
     */
    const systemStatus = computed(() => {
      return systemOnline.value 
        ? { class: 'online', text: 'System operational' }
        : { class: 'offline', text: 'System maintenance' };
    });

    /**
     * Updates the last updated timestamp
     * Formats time in 24-hour format (HH:MM)
     */
    const updateTimestamp = () => {
      try {
        const now = new Date();
        lastUpdated.value = now.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } catch (error) {
        console.warn('AppFooter: Error updating timestamp:', error);
        lastUpdated.value = '--:--';
      }
    };

    /**
     * Starts the automatic timestamp update interval
     * Updates every minute (60000ms)
     */
    const startTimestampUpdates = () => {
      stopTimestampUpdates(); // Clear any existing interval
      
      if (isComponentMounted.value) {
        updateInterval.value = setInterval(() => {
          updateTimestamp();
        }, 60000);
      }
    };

    /**
     * Stops the automatic timestamp updates
     * Cleans up interval to prevent memory leaks
     */
    const stopTimestampUpdates = () => {
      if (updateInterval.value) {
        clearInterval(updateInterval.value);
        updateInterval.value = null;
      }
    };

    /**
     * Opens IT support contact method
     * In production, this should integrate with actual support system
     */
    const openSupport = () => {
      try {
        // TODO: Replace with actual support system integration
        const supportMessage = [
          'IT Support Contact Information:',
          '',
          '📧 Email: it-support@company.com',
          '📞 Phone: (555) 123-4567',
          '🕒 Hours: Monday-Friday, 8:00 AM - 6:00 PM EST',
          '',
          'For cubicle management system issues, please include:',
          '• Your employee ID',
          '• Description of the problem',
          '• Steps to reproduce (if applicable)'
        ].join('\n');
        
        alert(supportMessage);
      } catch (error) {
        console.error('AppFooter: Error opening support:', error);
        alert('Unable to open support information. Please contact IT directly.');
      }
    };

    // Lifecycle hooks
    onMounted(async () => {
      isComponentMounted.value = true;
      
      // Initial timestamp update
      await nextTick();
      updateTimestamp();
      
      // Start automatic updates
      startTimestampUpdates();
    });

    onUnmounted(() => {
      isComponentMounted.value = false;
      stopTimestampUpdates();
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
/* ===========================================
   APP FOOTER - SIMPLIFIED FLEXBOX
   IBM Carbon Design System Compliant
   =========================================== */

/* Screen Reader Only Content */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Main Footer - Simplified */
.app-footer {
  background: #161616;
  color: #f4f4f4;
  border-top: 1px solid #393939;
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
  flex: 1;
}

/* Brand Section */
.footer-brand {
  align-items: flex-start;
}

.brand-info {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.brand-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
}

.brand-version {
  font-size: 0.75rem;
  color: #a8a8a8;
  padding: 0.125rem 0.375rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.brand-tagline {
  font-size: 0.75rem;
  color: #a8a8a8;
}

/* Status Section */
.footer-status {
  align-items: center;
  text-align: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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
}

/* Links Section */
.footer-links {
  align-items: flex-end;
  text-align: right;
}

.support-info {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
}

.support-text {
  font-size: 0.75rem;
  color: #a8a8a8;
}

/* Support Button - Simplified */
.support-button {
  min-height: 28px;
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  background: transparent;
  color: #0f62fe;
  border: 1px solid transparent;
  transition: background 0.15s ease;
}

.support-button:hover {
  background: rgba(15, 98, 254, 0.1);
}

.support-button:focus {
  outline: 2px solid #0f62fe;
  outline-offset: 2px;
}

.copyright {
  font-size: 0.6875rem;
  color: #6f6f6f;
}

/* Simplified Responsive Design */
@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
    text-align: center;
  }
  
  .footer-section {
    align-items: center;
  }
  
  .footer-links {
    text-align: center;
  }
  
  .support-info {
    justify-content: center;
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
