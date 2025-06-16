<!--
===================================================================
COMPONENT: PageHeader
===================================================================
PURPOSE: 
Consistent page header component that displays page title, subtitle,
and current selected date across all main views in the application.

FEATURES:
- Dynamic title and subtitle display
- Current selected date integration with date store
- IBM Carbon Design System compliant styling
- Responsive design for all screen sizes
- Accessible semantic structure

INTEGRATION:
- Used in: All main views (Reservations, Statistics, Utilization, Notifications)
- Props: title (string), subtitle (string)
- Date integration: useDateStore composable

DEPENDENCIES:
- Vue 3 Composition API
- useDateStore composable
- IBM Carbon Design System tokens

ACCESSIBILITY:
- Proper heading hierarchy (h1 for page title)
- High contrast text for readability
- Screen reader friendly structure

LAST UPDATED: June 2025
===================================================================
-->

<template>
  <header class="page-header" role="banner">
    <div class="header-content">
      <div class="header-text">
        <h1 class="page-title">{{ title }}</h1>
        <div class="date-info" role="region" aria-label="Current selected date">
          <span class="date-label">Selected Date:</span>
          <time class="date-value" :datetime="selectedDateString">
            {{ formatDisplayDate(selectedDateString) }}
          </time>
        </div>
        <p class="page-subtitle">{{ subtitle }}</p>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * PageHeader Component
 * Provides consistent page headers across all main application views
 */

import { useDateStore } from '../composables/useDateStore'

// Props Interface
interface Props {
  title: string
  subtitle: string
}

defineProps<Props>()

// Composables
const { selectedDateString } = useDateStore()

/**
 * Formats a date string for display in a user-friendly format
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string or fallback message
 */
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return 'No date selected'
  
  try {
    // Parse as local date to avoid timezone issues
    const date = new Date(dateStr + 'T00:00:00')
    
    // Validate the date is actually valid
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    console.warn('Error formatting date in PageHeader:', error)
    return dateStr // Return original string as fallback
  }
}
</script>

<style scoped>
/* ===========================================
   PAGE HEADER - CLEAN & CARBON COMPLIANT
   IBM Carbon Design System Implementation
   =========================================== */

/* Main Header Container */
.page-header {
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  padding: 1.5rem 1rem;
  width: 100%;
}

/* Content Layout */
.header-content {
  max-width: 1584px;
  margin: 0 auto;
}

/* Text Content */
.header-text {
  width: 100%;
}

.page-title {
  font-size: 2rem;
  font-weight: 400;
  color: #161616;
  margin: 0 0 0.5rem 0;
  line-height: 1.25;
  letter-spacing: 0;
}

.page-subtitle {
  font-size: 1rem;
  color: #525252;
  margin: 0;
  font-weight: 400;
  line-height: 1.375;
}

/* Date Display */
.date-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  background-color: #0f62fe;
  border-left: 4px solid #0043ce;
  width: 100%;
  box-sizing: border-box;
}

.date-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-value {
  font-size: 1.125rem;
  font-weight: 400;
  color: #ffffff;
  padding: 0.25rem 0.75rem;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Responsive Design - Single Clean Breakpoint */
@media (max-width: 768px) {
  .page-title {
    font-size: 1.75rem;
  }
  
  .date-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .date-value {
    text-align: left;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .date-info {
    border-width: 2px;
    border-left-width: 6px;
    border-color: #0043ce;
  }
}
</style>
