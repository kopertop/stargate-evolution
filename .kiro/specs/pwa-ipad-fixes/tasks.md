# Implementation Plan

- [x] 1. Enhance PWA detection utilities
  - Update `mobile-utils.ts` with comprehensive iPad PWA detection logic
  - Add enhanced PWA detection functions with better iOS support
  - Add logging and debugging utilities for PWA state troubleshooting
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Fix fullscreen button visibility in HTML
  - Update the PWA detection logic in `index.html` to match React app detection
  - Enhance the `checkFullscreen()` function with comprehensive iPad PWA detection
  - Add iOS-specific PWA detection for Safari "Add to Home Screen" scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3. Investigate and fix Google Sign-In button rendering on iPad
  - Debug why Google Sign-In button appears blank on iPad devices
  - Add error handling and fallback mechanisms for Google Identity Services script loading
  - Implement retry logic for failed Google Sign-In button rendering
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 4. Enhance Google Sign-In button functionality for PWA mode
  - Modify authentication flow to work properly within PWA constraints on iPad
  - Handle popup blocking scenarios in PWA mode with alternative authentication methods
  - Ensure authentication state persists correctly in PWA context
  - _Requirements: 2.2, 2.4, 2.5, 2.6_

- [x] 5. Update fullscreen button detection for Chrome iOS compatibility
  - Enhanced fullscreen support detection to properly identify Chrome iOS limitations
  - Added document.fullscreenEnabled and webkitFullscreenEnabled checks with permissive desktop handling
  - Specific detection for Chrome on iOS (CriOS user agent) which has limited fullscreen API support
  - Chrome iOS detection happens before fullscreenEnabled checks to override false positives
  - Fixed issue where fullscreen button was hidden on desktop browsers when fullscreenEnabled was false
  - Made detection more permissive on desktop browsers while strict on mobile devices
  - **CRITICAL FIX**: Fixed browser fullscreen vs app fullscreen confusion
    - Removed `display-mode: fullscreen` from PWA detection as it triggers on browser fullscreen
    - Browser fullscreen (Chrome's green button) no longer incorrectly hides the app's fullscreen button
    - App fullscreen button now shows correctly in both browser fullscreen and non-fullscreen modes
  - **CLEANUP**: Simplified HTML fullscreen logic to essential functionality only
    - Removed complex PWA detection logic from HTML - now only checks `window.navigator.standalone`
    - Simplified to only hide button if app is fullscreen OR if running as PWA
    - Reduced HTML file size from 13.67 kB to 5.97 kB (56% reduction)
    - Clean, maintainable code with clear separation of concerns
  - Updated both HTML and React app detection logic to be consistent
  - Added comprehensive test suite for fullscreen detection logic (13 test cases)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ] 6. Update Google Sign-In button styling for iPad compatibility
  - Fix CSS styling issues that may cause button invisibility on iPad
  - Add iPad-specific responsive design for different orientations
  - Ensure proper button visibility across all themes and PWA contexts
  - _Requirements: 2.1, 2.4_

- [ ] 7. Add comprehensive error handling for authentication failures
  - Implement proper error messages when Google Identity Services fails to load
  - Add fallback authentication instructions for users when automatic sign-in fails
  - Create user-friendly error handling for PWA authentication edge cases
  - _Requirements: 2.3, 2.6_

- [ ] 8. Create comprehensive test suite for PWA functionality
  - Write unit tests for enhanced PWA detection functions
  - Create integration tests for fullscreen button visibility logic
  - Add tests for Google Sign-In functionality across different device modes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 9. Update PWA detection usage across the application
  - Review and update all components that use PWA detection to use enhanced functions
  - Ensure consistent PWA behavior across menu page, game page, and admin components
  - Update any hardcoded PWA detection logic to use centralized utilities
  - _Requirements: 3.5_

- [ ] 10. Run type checking and fix any issues
  - Execute `pnpm run check` to validate TypeScript types across all packages
  - Fix any type errors introduced by elevator system implementation
  - Ensure all new interfaces and types are properly exported and imported
  - Validate that existing type contracts are maintained
  - _Requirements: All requirements (code quality and maintainability)_
