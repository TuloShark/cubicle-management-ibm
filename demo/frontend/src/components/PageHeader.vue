<template>
  <div class="page-header">
    <div class="header-content">
      <div class="header-titles">
        <h1 class="page-title">{{ title }}</h1>
        <div class="date-info">
          <span class="date-label">Selected Date:</span>
          <span class="date-value">{{ formatDisplayDate(selectedDateString) }}</span>
        </div>
        <p class="page-subtitle">
          {{ subtitle }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDateStore } from '../composables/useDateStore'

// Props
interface Props {
  title: string
  subtitle: string
}

defineProps<Props>()

// Composables
const { selectedDateString } = useDateStore()

// Format display date function to match StatisticsView
const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return 'No date selected'
  try {
    const date = new Date(dateStr + 'T00:00:00') // Parse as local date
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    console.warn('Error formatting date:', error)
    return dateStr
  }
}
</script>

<style scoped>
/* IBM Carbon Design System inspired styling */
.statistics-container {
  padding: 0;
  margin-top: 64px; /* Space for navbar */
  background-color: #f4f4f4;
  min-height: calc(100vh - 64px - 60px); /* Calculate exact height: viewport - navbar - footer */
  overflow-x: hidden; /* Prevent horizontal scrollbar */
  padding-bottom: 2rem; /* Add bottom padding for footer separation */
}

.page-header {
  background-color: #ffffff;
  padding: 2rem 2rem 1.5rem 2rem;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 1.5rem; /* Reduced margin for minimal spacing */
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  max-width: 1584px;
  margin: 0 auto;
}

.header-titles {
  flex: 1;
}

.page-title {
  font-size: 2rem;
  font-weight: 400;
  color: #161616;
  margin: 0 0 0.5rem 0;
  line-height: 1.25;
}

.date-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: #0f62fe;
  border-left: 4px solid #0043ce;
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

.page-subtitle {
  font-size: 1rem;
  color: #525252;
  margin: 0;
  font-weight: 400;
}
</style>
