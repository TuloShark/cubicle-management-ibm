/**
 * Global Date Store - Vue 3 Composition API
 * Manages application-wide date state for consistent navigation between views
 * Solves the date synchronization issue between ReservationsView and StatisticsView
 */
import { ref, computed, watch } from 'vue';

// Global reactive state - shared across all components
// Initialize with null to detect first-time setup
const selectedDate = ref<Date | null>(null);
const selectedDateInput = ref<string>('');
let isInitialized = false;

/**
 * Get today's date in YYYY-MM-DD format (consistent with ReservationsView logic)
 */
function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format Date object to YYYY-MM-DD string (consistent with ReservationsView logic)
 */
function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Initialize the date store with today's date - only called once
 */
function initializeDateStore() {
  if (isInitialized) {
    console.log('Date store already initialized, skipping...');
    return;
  }
  
  const today = new Date();
  selectedDate.value = today;
  selectedDateInput.value = getTodayString();
  isInitialized = true;
  console.log('Date store initialized with:', formatDateToString(today));
}

/**
 * Ensure the date store is initialized
 */
function ensureInitialized() {
  if (!isInitialized || selectedDate.value === null) {
    initializeDateStore();
  }
}

// Watch for selectedDate changes and sync selectedDateInput
watch(selectedDate, (newDate) => {
  if (newDate) {
    const newDateString = formatDateToString(newDate);
    if (selectedDateInput.value !== newDateString) {
      selectedDateInput.value = newDateString;
      console.log('Global date store - selectedDate changed to:', newDateString);
    }
  }
}, { immediate: true });

// Watch for selectedDateInput changes and sync selectedDate
watch(selectedDateInput, (newDateString) => {
  if (newDateString && newDateString !== (selectedDate.value ? formatDateToString(selectedDate.value) : '')) {
    try {
      const [year, month, day] = newDateString.split('-').map(Number);
      const newDate = new Date(year, month - 1, day); // month is 0-indexed
      if (!isNaN(newDate.getTime())) {
        selectedDate.value = newDate;
        console.log('Global date store - selectedDateInput changed to:', newDateString, 'parsed as:', newDate);
      }
    } catch (error) {
      console.warn('Invalid date string:', newDateString);
    }
  }
});

/**
 * Global Date Store Composable
 * Provides centralized date state management across the application
 */
export function useDateStore() {
  // Ensure initialization before use
  ensureInitialized();
  
  // Computed properties for consistent formatting
  const selectedDateString = computed(() => {
    return selectedDate.value ? formatDateToString(selectedDate.value) : getTodayString();
  });
  
  const minDate = computed(() => getTodayString());
  
  const maxDate = computed(() => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6); // 6 months from now
    return formatDateToString(futureDate);
  });

  /**
   * Set the global selected date
   */
  function setSelectedDate(date: Date | string) {
    ensureInitialized();
    console.log('Setting selected date to:', date);
    if (typeof date === 'string') {
      try {
        const [year, month, day] = date.split('-').map(Number);
        const parsedDate = new Date(year, month - 1, day); // month is 0-indexed
        if (!isNaN(parsedDate.getTime())) {
          selectedDate.value = parsedDate;
        }
      } catch (error) {
        console.warn('Invalid date string:', date);
      }
    } else {
      selectedDate.value = date;
    }
  }

  /**
   * Set the global selected date input (string format)
   */
  function setSelectedDateInput(dateString: string) {
    ensureInitialized();
    console.log('Setting selected date input to:', dateString);
    selectedDateInput.value = dateString;
  }

  /**
   * Navigate to today's date
   */
  function goToToday() {
    ensureInitialized();
    console.log('Going to today');
    const today = new Date();
    selectedDate.value = today;
  }

  /**
   * Handle date input change (consistent with ReservationsView logic)
   */
  function handleDateInputChange(event?: Event) {
    ensureInitialized();
    if (event && event.target) {
      const target = event.target as HTMLInputElement;
      const newDateString = target.value;
      console.log('Handling date input change:', newDateString);
      if (newDateString) {
        selectedDateInput.value = newDateString; // Direct assignment to trigger watcher
      }
    }
  }

  /**
   * Get date for navigation/routing
   */
  function getRouteDate(): string {
    ensureInitialized();
    return selectedDateString.value;
  }

  /**
   * Initialize from route parameter (for StatisticsView)
   */
  function initializeFromRoute(routeDate?: string) {
    ensureInitialized();
    console.log('Initializing from route:', routeDate);
    if (routeDate && typeof routeDate === 'string') {
      setSelectedDate(routeDate);
    } else {
      // Default to today if no route date
      goToToday();
    }
  }

  return {
    // State - return direct refs for better reactivity, but ensure they're not null
    selectedDate: computed(() => selectedDate.value || new Date()),
    selectedDateInput,
    selectedDateString,
    minDate,
    maxDate,
    
    // Actions
    setSelectedDate,
    setSelectedDateInput,
    goToToday,
    handleDateInputChange,
    getRouteDate,
    initializeFromRoute,
    
    // Utilities
    formatDateToString,
    getTodayString
  };
}

export default useDateStore;
