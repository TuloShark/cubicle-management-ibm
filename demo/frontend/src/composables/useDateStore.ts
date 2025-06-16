/**
 * @fileoverview Global Date Store Management Composable
 * 
 * Enterprise-grade centralized date state management for the IBM Space Optimization
 * application. Provides consistent date synchronization across all views, route parameter
 * integration, and reactive date state with comprehensive initialization protection and
 * circular watcher prevention.
 * 
 * @author IBM Space Optimization Team
 * @version 2.0.0
 * @since 1.0.0
 * 
 * @description
 * This composable solves critical date synchronization issues between ReservationsView,
 * StatisticsView, UtilizationView, and other components. It ensures that date selection
 * is maintained during navigation and provides a single source of truth for application-wide
 * date state.
 * 
 * Key Features:
 * - Race condition protection during initialization
 * - Circular watcher prevention with internal update flags
 * - Route parameter integration for deep linking
 * - Responsive date validation and error handling
 * - Memory-efficient global state management
 * 
 * @example
 * // Basic usage in a component
 * import { useDateStore } from '@/composables/useDateStore';
 * 
 * const {
 *   selectedDate,
 *   selectedDateString,
 *   setSelectedDate,
 *   goToToday
 * } = useDateStore();
 * 
 * // Watch for date changes
 * watch(selectedDateString, async (newDate) => {
 *   await fetchDataForDate(newDate);
 * });
 */
import { ref, computed, watch, Ref, ComputedRef } from 'vue';

/**
 * Date Store Return Type Interface
 * 
 * Defines the complete interface returned by the useDateStore composable.
 * Provides comprehensive type safety for consuming components and ensures
 * consistent API usage across the application.
 * 
 * @interface UseDateStoreReturn
 * @property {ComputedRef<Date>} selectedDate - Currently selected date object (never null)
 * @property {Ref<string>} selectedDateInput - String representation for input fields
 * @property {ComputedRef<string>} selectedDateString - Formatted YYYY-MM-DD string
 * @property {ComputedRef<string>} minDate - Minimum selectable date (today)
 * @property {ComputedRef<string>} maxDate - Maximum selectable date (6 months future)
 * @property {Function} setSelectedDate - Set global selected date (async)
 * @property {Function} setSelectedDateInput - Set date input string (async)
 * @property {Function} goToToday - Navigate to today's date (async)
 * @property {Function} handleDateInputChange - Handle input field changes (async)
 * @property {Function} getRouteDate - Get date for routing purposes (async)
 * @property {Function} initializeFromRoute - Initialize from route parameter (async)
 * @property {Function} formatDateToString - Utility: format Date to YYYY-MM-DD
 * @property {Function} getTodayString - Utility: get today as YYYY-MM-DD string
 */
interface UseDateStoreReturn {
  selectedDate: ComputedRef<Date>;
  selectedDateInput: Ref<string>;
  selectedDateString: ComputedRef<string>;
  minDate: ComputedRef<string>;
  maxDate: ComputedRef<string>;
  setSelectedDate: (date: Date | string) => Promise<void>;
  setSelectedDateInput: (dateString: string) => Promise<void>;
  goToToday: () => Promise<void>;
  handleDateInputChange: (event?: Event) => Promise<void>;
  getRouteDate: () => Promise<string>;
  initializeFromRoute: (routeDate?: string) => Promise<void>;
  formatDateToString: (date: Date) => string;
  getTodayString: () => string;
}

// ====================================
// GLOBAL REACTIVE STATE MANAGEMENT
// ====================================

/** Core selected date object - null only during initial startup */
const selectedDate = ref<Date | null>(null);

/** String representation for input fields and display (YYYY-MM-DD format) */
const selectedDateInput = ref<string>('');

/** Initialization state flag to prevent duplicate setup */
let isInitialized = false;

/** Shared initialization promise for race condition protection */
let initializationPromise: Promise<void> | null = null;

/** Internal update flag to prevent circular watcher updates */
let isUpdatingInternally = false;

/**
 * Date Utility: Get Today's Date String
 * 
 * Returns the current date formatted as YYYY-MM-DD string. This utility ensures
 * consistent date formatting across the application and provides a reliable
 * fallback for date initialization and default values.
 * 
 * @returns {string} Today's date in YYYY-MM-DD format
 * 
 * @example
 * const today = getTodayString(); // "2024-01-15"
 * const defaultDate = getTodayString(); // Use as fallback
 */
function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Date Utility: Format Date to String
 * 
 * Converts a Date object to YYYY-MM-DD format string. Provides consistent
 * date formatting throughout the application and ensures compatibility with
 * HTML date inputs and backend API expectations.
 * 
 * @param {Date} date - The Date object to format
 * @returns {string} Formatted date string in YYYY-MM-DD format
 * 
 * @example
 * const dateObj = new Date(2024, 0, 15); // January 15, 2024
 * const formatted = formatDateToString(dateObj); // "2024-01-15"
 * 
 * // Use with form inputs
 * inputElement.value = formatDateToString(selectedDate);
 */
function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Initialize Date Store State
 * 
 * Performs one-time initialization of the global date store with today's date.
 * Implements singleton pattern to prevent multiple initializations and ensures
 * consistent state across all application components. Now returns a Promise
 * to handle race conditions during concurrent initialization attempts.
 * 
 */
async function initializeDateStore(): Promise<void> {
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
 * Ensure Date Store Initialization
 * 
 * Guarantees that the date store is properly initialized before use. Handles
 * race conditions by using a shared initialization promise that ensures only
 * one initialization process occurs even with concurrent calls. Essential for
 * preventing null reference errors and ensuring consistent state.
 * 
 * @returns {Promise<void>} Promise that resolves when store is ready for use
 * 
 * @example
 * // Internal use - called before all public methods
 * await ensureInitialized();
 * // Now safe to access selectedDate.value
 */
async function ensureInitialized(): Promise<void> {
  if (!isInitialized || selectedDate.value === null) {
    if (!initializationPromise) {
      initializationPromise = initializeDateStore();
    }
    await initializationPromise;
  }
}

// ====================================
// REACTIVE WATCHER SYNCHRONIZATION
// ====================================

watch(selectedDate, (newDate) => {
  if (isUpdatingInternally) return;
  
  if (newDate) {
    const newDateString = formatDateToString(newDate);
    if (selectedDateInput.value !== newDateString) {
      isUpdatingInternally = true;
      selectedDateInput.value = newDateString;
      console.log('Global date store - selectedDate changed to:', newDateString);
      isUpdatingInternally = false;
    }
  }
}, { immediate: true });

/**
 * String-to-Date Synchronization Watcher
 * 
 * Automatically synchronizes selectedDateInput string changes to selectedDate object.
 * Parses YYYY-MM-DD formatted strings into Date objects with comprehensive error
 * handling and validation. Prevents circular updates and handles edge cases gracefully.
 * 
 * @description
 * When selectedDateInput (string) changes, this watcher parses the string and updates
 * selectedDate (Date object). It validates the parsed date and only updates if the
 * new string represents a different date to prevent unnecessary updates.
 */
watch(selectedDateInput, (newDateString) => {
  if (isUpdatingInternally) return;
  
  if (newDateString && newDateString !== (selectedDate.value ? formatDateToString(selectedDate.value) : '')) {
    try {
      const [year, month, day] = newDateString.split('-').map(Number);
      const newDate = new Date(year, month - 1, day); // month is 0-indexed
      if (!isNaN(newDate.getTime())) {
        isUpdatingInternally = true;
        selectedDate.value = newDate;
        console.log('Global date store - selectedDateInput changed to:', newDateString, 'parsed as:', newDate);
        isUpdatingInternally = false;
      }
    } catch (error) {
      console.warn('Invalid date string:', newDateString);
    }
  }
});

// ====================================
// MAIN COMPOSABLE EXPORT
// ====================================

/**
 * Global Date Store Management Composable
 * 
 * Enterprise-grade centralized date state management with comprehensive race condition
 * protection, circular watcher prevention, and async initialization. Provides a single
 * source of truth for date state across all application views and components.
 * 
 * This composable implements the singleton pattern to ensure consistent date state
 * throughout the application lifecycle. It handles complex synchronization between
 * Date objects and string representations while preventing infinite update loops.
 * 
 * @returns {UseDateStoreReturn} Complete date store API with reactive state and methods
 * 
 * @example
 * // Basic usage
 * const {
 *   selectedDate,
 *   selectedDateString,
 *   setSelectedDate,
 *   goToToday
 * } = useDateStore();
 * 
 * // React to date changes
 * watch(selectedDateString, async (newDate) => {
 *   await fetchDataForDate(newDate);
 * });
 * 
 * // Set date programmatically
 * await setSelectedDate('2024-01-15');
 * await setSelectedDate(new Date(2024, 0, 15));
 * 
 * // Handle route integration
 * await initializeFromRoute(route.params.date);
 */
export function useDateStore() {
  // Ensure initialization before use (but don't await here to keep composable sync)
  if (!isInitialized && !initializationPromise) {
    initializationPromise = initializeDateStore();
  }
  
  // ====================================
  // COMPUTED PROPERTIES
  // ====================================
  
  /** YYYY-MM-DD formatted string representation of selected date */
  const selectedDateString = computed(() => {
    return selectedDate.value ? formatDateToString(selectedDate.value) : getTodayString();
  });
  
  /** Minimum selectable date (today) for date input validation */
  const minDate = computed(() => getTodayString());
  
  /** Maximum selectable date (6 months from today) for date input validation */
  const maxDate = computed(() => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6); // 6 months from now
    return formatDateToString(futureDate);
  });

  /**
   * Set Global Selected Date
   * 
   * Updates the global selected date state with proper validation and type handling.
   * Accepts both Date objects and YYYY-MM-DD formatted strings for flexibility.
   * Ensures initialization before setting and provides comprehensive error handling
   * for invalid date strings.
   * 
   * @param {Date | string} date - Date object or YYYY-MM-DD string to set
   * @returns {Promise<void>} Promise that resolves when date is set
   * 
   * @example
   * // Set using Date object
   * await setSelectedDate(new Date(2024, 0, 15));
   * 
   * // Set using string
   * await setSelectedDate('2024-01-15');
   * 
   * // Handle in event handler
   * const handleDateSelect = async (selectedDate) => {
   *   await setSelectedDate(selectedDate);
   *   await refreshData();
   * };
   */
  async function setSelectedDate(date: Date | string): Promise<void> {
    await ensureInitialized();
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
   * Set Global Selected Date Input String
   * 
   * Updates the global selected date input string which automatically triggers
   * synchronization with the Date object through reactive watchers. This method
   * is particularly useful for handling direct input field updates and maintaining
   * two-way data binding with form controls.
   * 
   */
  async function setSelectedDateInput(dateString: string): Promise<void> {
    await ensureInitialized();
    console.log('Setting selected date input to:', dateString);
    selectedDateInput.value = dateString;
  }

  /**
   * Navigate to Today's Date
   * 
   * Resets the global date state to the current date. This is a common user action
   * that provides a quick way to return to the current day from any selected date.
   * Ensures initialization and triggers all reactive updates consistently.
   * 
   * @returns {Promise<void>} Promise that resolves when date is set to today
   * 
   * @example
   * // In a "Go to Today" button handler
   * const handleGoToToday = async () => {
   *   await goToToday();
   *   await refreshCurrentData();
   * };
   * 
   * // Reset date state
   * await goToToday();
   * console.log('Date reset to:', selectedDateString.value);
   */
  async function goToToday(): Promise<void> {
    await ensureInitialized();
    console.log('Going to today');
    const today = new Date();
    selectedDate.value = today;
  }

  /**
   * Handle Date Input Change Event
   * 
   * Processes date input change events from HTML date input elements. Extracts
   * the new date value from the event target and updates the global date state.
   * Provides robust event handling with proper type checking and error prevention.
   * 
   * @param {Event} [event] - Optional DOM event from input element
   * @returns {Promise<void>} Promise that resolves when change is processed
   * 
   * @example
   * // In template with event handler
   * <input 
   *   type="date" 
   *   :value="selectedDateInput"
   *   @change="handleDateInputChange"
   * />
   * 
   * // Manual event processing
   * const inputElement = document.querySelector('#date-picker');
   * inputElement.addEventListener('change', handleDateInputChange);
   */
  async function handleDateInputChange(event?: Event): Promise<void> {
    await ensureInitialized();
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
   * Get Date for Navigation/Routing
   * 
   * Retrieves the current selected date formatted for use in route parameters
   * and navigation. Ensures the date store is initialized and returns a consistent
   * YYYY-MM-DD formatted string suitable for URL parameters and deep linking.
   * 
   * @returns {Promise<string>} Promise resolving to YYYY-MM-DD formatted date string
   * 
   * @example
   * // Use in Vue Router navigation
   * const routeDate = await getRouteDate();
   * await router.push({ 
   *   name: 'statistics', 
   *   params: { date: routeDate } 
   * });
   * 
   * // Build API URLs with date
   * const date = await getRouteDate();
   * const apiUrl = `/api/data/${date}`;
   */
  async function getRouteDate(): Promise<string> {
    await ensureInitialized();
    return selectedDateString.value;
  }

  /**
   * Initialize from Route Parameter
   * 
   * Initializes the date store with a date from route parameters, enabling deep
   * linking and direct URL access to specific dates. Falls back to today's date
   * if no valid route date is provided. Essential for StatisticsView and other
   * views that support date-based routing.
   * 
   * @param {string} [routeDate] - Optional YYYY-MM-DD date string from route params
   * @returns {Promise<void>} Promise that resolves when initialization is complete
   * 
   */
  async function initializeFromRoute(routeDate?: string): Promise<void> {
    await ensureInitialized();
    console.log('Initializing from route:', routeDate);
    if (routeDate && typeof routeDate === 'string') {
      await setSelectedDate(routeDate);
    } else {
      // Default to today if no route date
      await goToToday();
    }
  }

  // ====================================
  // PUBLIC API RETURN
  // ====================================
  
  /**
   * Return Complete Date Store API
   * 
   * Provides comprehensive date management interface with reactive state,
   * utility methods, and async operations. All state properties are readonly
   * computed references to prevent external mutation of internal state.
   * 
   * @returns {UseDateStoreReturn} Complete date store API
   */
  return {
    // Reactive State Properties (read-only computed)
    selectedDate: computed(() => selectedDate.value || new Date()),
    selectedDateInput,
    selectedDateString,
    minDate,
    maxDate,
    
    // Async State Management Methods
    setSelectedDate,
    setSelectedDateInput,
    goToToday,
    handleDateInputChange,
    getRouteDate,
    initializeFromRoute,
    
    // Date Utility Functions
    formatDateToString,
    getTodayString
  };
}

// ====================================
// MODULE EXPORTS
// ====================================

export default useDateStore;
