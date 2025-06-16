# Router.ts User Testing Guide

## Overview
This guide provides comprehensive testing procedures for the refactored Vue Router configuration in the IBM Space Optimization application. The router handles all navigation, authentication, and accessibility features.

## Pre-Testing Setup

### Environment Preparation
1. **Start the application**:
   ```bash
   cd demo/frontend
   npm run dev
   ```

2. **Open browser developer tools**:
   - Enable Console tab for error monitoring
   - Enable Network tab for request monitoring
   - Enable Application tab for localStorage inspection

3. **Enable screen reader (Optional)**:
   - macOS: VoiceOver (Cmd + F5)
   - Windows: NVDA (free) or JAWS
   - Chrome: ChromeVox extension

## Test Categories

## 1. Basic Navigation Testing

### 1.1 Public Route Access
**Objective**: Verify unauthenticated users can only access login

**Steps**:
1. Clear browser cache and localStorage
2. Navigate to `http://localhost:5173/`
3. Verify login page displays
4. Try accessing protected routes directly:
   - `http://localhost:5173/reservations`
   - `http://localhost:5173/statistics`
   - `http://localhost:5173/utilization`
   - `http://localhost:5173/notifications`

**Expected Results**:
- All protected routes redirect to login (`/`)
- No error messages in console
- Browser URL shows `/` after redirect

### 1.2 Authenticated Navigation
**Objective**: Test navigation after login

**Steps**:
1. Complete login process
2. Use navigation menu to visit each page:
   - Reservations
   - Statistics
   - Utilization
   - Notifications
3. Use browser back/forward buttons
4. Bookmark a page and reload

**Expected Results**:
- All pages load successfully
- Navigation is smooth without flickering
- Back/forward navigation preserves scroll position
- Bookmarked pages load correctly when authenticated

## 2. Route Parameter Testing

### 2.1 Date Parameter Validation
**Objective**: Test date parameter validation and handling

**Steps**:
1. Navigate to pages with valid dates:
   - `/reservations/2024-01-15`
   - `/statistics/2024-12-31`
   - `/utilization/2025-06-01`

2. Try invalid date formats:
   - `/reservations/2024/01/15` (wrong format)
   - `/statistics/invalid-date`
   - `/utilization/2024-13-45` (invalid date)

3. Try dates outside reasonable bounds:
   - `/reservations/2020-01-01` (too old)
   - `/statistics/2030-01-01` (too far ahead)

**Expected Results**:
- Valid dates: Pages load with correct date
- Invalid formats: Redirect to base route (e.g., `/reservations`)
- Warning messages in console for invalid dates
- No application crashes or blank pages

### 2.2 Date Parameter Edge Cases
**Objective**: Test edge cases for date parameters

**Steps**:
1. Test leap year dates: `/reservations/2024-02-29`
2. Test month boundaries: `/statistics/2024-01-31`, `/statistics/2024-02-01`
3. Test with special characters: `/utilization/2024-01-01%20test`
4. Test empty date parameter: `/reservations/`

**Expected Results**:
- Leap year dates work correctly
- Month boundaries handled properly
- Special characters cause redirect to base route
- Empty parameters work as intended

## 3. Authentication Flow Testing

### 3.1 Authentication State Changes
**Objective**: Test router behavior during auth state changes

**Steps**:
1. While on a protected page, simulate token expiration:
   - Open Application tab in DevTools
   - Delete authToken from localStorage
   - Navigate to another page

2. Test slow authentication loading:
   - Throttle network to slow 3G
   - Refresh page and observe loading behavior

**Expected Results**:
- Token expiration redirects to login
- Slow auth loading shows appropriate behavior
- No infinite redirect loops
- User-friendly error handling

### 3.2 Concurrent Navigation
**Objective**: Test rapid navigation during auth loading

**Steps**:
1. Refresh page and immediately click multiple navigation links
2. Test browser back button during auth loading
3. Try direct URL access during auth initialization

**Expected Results**:
- No navigation errors or crashes
- Auth guard properly queues navigation
- Final destination is correct after auth loads

## 4. Accessibility Testing

### 4.1 Screen Reader Announcements
**Objective**: Test route change announcements

**Prerequisites**: Screen reader enabled

**Steps**:
1. Navigate between pages using:
   - Navigation menu
   - Browser back/forward
   - Direct URL entry
2. Listen for route change announcements
3. Check for live region in DOM inspector

**Expected Results**:
- Each navigation announces page change
- Announcements are clear and informative
- Live region element exists in DOM
- No duplicate or confusing announcements

### 4.2 Keyboard Navigation
**Objective**: Test keyboard-only navigation

**Steps**:
1. Use only keyboard to navigate:
   - Tab through navigation elements
   - Press Enter/Space to activate links
   - Use browser shortcuts (Ctrl+L for address bar)
2. Test focus management after route changes

**Expected Results**:
- All navigation elements are keyboard accessible
- Focus is properly managed after navigation
- No focus traps or lost focus issues
- Visual focus indicators are clear

## 5. Performance Testing

### 5.1 Navigation Speed
**Objective**: Measure navigation performance

**Steps**:
1. Open Network tab in DevTools
2. Navigate between pages and measure:
   - Time to first contentful paint
   - Time to interactive
   - Network request timings
3. Test with slow network conditions

**Expected Results**:
- Navigation feels responsive (<200ms)
- No unnecessary network requests
- Graceful degradation on slow networks
- Efficient resource loading

### 5.2 Memory Usage
**Objective**: Test for memory leaks during navigation

**Steps**:
1. Open Performance tab in DevTools
2. Navigate extensively between all pages
3. Force garbage collection
4. Monitor memory usage over time

**Expected Results**:
- Memory usage remains stable
- No significant memory leaks
- Event listeners properly cleaned up
- Efficient resource management

## 6. Error Handling Testing

### 6.1 Network Errors
**Objective**: Test router behavior during network issues

**Steps**:
1. Disable network connection
2. Try navigation
3. Restore connection and retry
4. Test with intermittent connectivity

**Expected Results**:
- Graceful handling of network errors  
- Appropriate error messages to user
- Recovery when connection restored
- No lost navigation state

### 6.2 JavaScript Errors
**Objective**: Test router resilience to JS errors

**Steps**:
1. Simulate JavaScript errors in components
2. Test navigation after errors occur
3. Monitor console for error handling

**Expected Results**:
- Router continues functioning after component errors
- Error boundaries prevent app crashes
- User can navigate away from broken components
- Errors are logged properly

## 7. Browser Compatibility Testing

### 7.1 Cross-Browser Testing
**Objective**: Test router across different browsers

**Browsers to Test**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Steps**:
1. Test all navigation scenarios in each browser
2. Check for browser-specific issues
3. Verify scroll behavior consistency

**Expected Results**:
- Consistent behavior across browsers
- No browser-specific errors
- Feature compatibility maintained

### 7.2 Mobile Testing
**Objective**: Test router on mobile devices

**Steps**:
1. Test on actual mobile devices or DevTools mobile simulation
2. Test touch navigation
3. Test mobile browser back button
4. Test app-like navigation behavior

**Expected Results**:
- Touch navigation works smoothly
- Mobile browser integration works correctly
- Responsive navigation behavior
- No mobile-specific errors

## 8. Security Testing

### 8.1 Route Protection
**Objective**: Verify route security is properly enforced

**Steps**:
1. Attempt to access protected routes without authentication
2. Try to bypass auth guards using browser tools
3. Test with expired or invalid tokens
4. Check for sensitive data exposure in URLs

**Expected Results**:
- All protected routes properly secured
- No bypassing of authentication
- Expired tokens handled correctly
- No sensitive data in URLs or logs

## Test Results Documentation

### Success Criteria
- ✅ All basic navigation works without errors
- ✅ Date parameter validation functions correctly
- ✅ Authentication flows work as expected
- ✅ Accessibility features function properly
- ✅ Performance meets acceptable standards
- ✅ Error handling is robust and user-friendly
- ✅ Browser compatibility is maintained
- ✅ Security measures are effective

### Issue Reporting Template
```
**Issue**: Brief description
**Steps to Reproduce**: 
1. Step one
2. Step two
**Expected Result**: What should happen
**Actual Result**: What actually happened
**Browser**: Browser and version
**Console Errors**: Any error messages
**Severity**: Critical/High/Medium/Low
```

## Automated Testing Commands

### Run Unit Tests
```bash
npm run test:unit
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run Accessibility Tests
```bash
npm run test:a11y
```

### Performance Auditing
```bash
npm run lighthouse
```

## Post-Testing Validation

After completing all tests:

1. **Review Console**: No errors or warnings related to routing
2. **Check Performance**: Navigation feels fast and responsive
3. **Verify Accessibility**: Screen reader users can navigate effectively
4. **Confirm Security**: All routes properly protected
5. **Test Mobile**: Mobile navigation works correctly
6. **Cross-Browser**: Consistent behavior across browsers

## Common Issues and Solutions

### Issue: Infinite Redirect Loop
**Solution**: Check authentication guard logic and public route configuration

### Issue: Date Parameters Not Working
**Solution**: Verify date format matches regex pattern in router config

### Issue: Screen Reader Not Announcing
**Solution**: Check live region element creation and aria attributes

### Issue: Slow Navigation
**Solution**: Check for unnecessary re-renders and optimize auth loading

### Issue: Memory Leaks
**Solution**: Verify event listeners are cleaned up and components properly unmounted
