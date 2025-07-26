# Requirements Document

## Introduction

This feature addresses two critical PWA (Progressive Web App) issues specifically affecting iPad users:

1. **Fullscreen Button Issue**: The fullscreen button currently shows up even when the app is already running in PWA mode (which is already fullscreen), creating confusion and unnecessary UI clutter.

2. **Login Button Issue**: The Google Sign-In button appears blank/invisible on iPad devices, preventing users from authenticating and accessing the game.

These issues significantly impact the user experience on iPad, which is a primary target platform for this game.

## Requirements

### Requirement 1: Fullscreen Button Visibility Control

**User Story:** As an iPad user running the app in PWA mode, I want the fullscreen button to be hidden since I'm already in fullscreen mode, so that I don't see unnecessary UI elements.

#### Acceptance Criteria

1. WHEN the app is running in PWA mode on any device THEN the fullscreen button SHALL be hidden
2. WHEN the app is running in standalone mode (navigator.standalone === true) THEN the fullscreen button SHALL be hidden  
3. WHEN the app detects display-mode: standalone THEN the fullscreen button SHALL be hidden
4. WHEN the app detects display-mode: minimal-ui THEN the fullscreen button SHALL be hidden
5. WHEN the app is running in regular browser mode AND has fullscreen support THEN the fullscreen button SHALL be visible
6. WHEN the document is already in fullscreen mode THEN the fullscreen button SHALL be hidden

### Requirement 2: Google Sign-In Button Functionality on iPad

**User Story:** As an iPad user, I want the Google Sign-In button to be visible and functional, so that I can authenticate and access my saved games.

#### Acceptance Criteria

1. WHEN the Google Sign-In button is rendered on iPad THEN it SHALL be visible and properly styled
2. WHEN a user taps the Google Sign-In button on iPad THEN it SHALL trigger the authentication flow
3. WHEN the Google Identity Services script fails to load THEN the system SHALL provide a fallback or error message
4. WHEN the app is in PWA mode on iPad THEN the Google Sign-In button SHALL still function correctly
5. WHEN the authentication popup is triggered on iPad THEN it SHALL work within the PWA context
6. WHEN the user completes authentication on iPad THEN they SHALL be properly signed in to the application

### Requirement 3: PWA Detection Accuracy

**User Story:** As a developer, I want accurate PWA detection across all devices and browsers, so that the app behaves correctly in different contexts.

#### Acceptance Criteria

1. WHEN the app runs on iPad in Safari with "Add to Home Screen" THEN it SHALL be detected as PWA mode
2. WHEN the app runs on iPad in regular Safari browser THEN it SHALL NOT be detected as PWA mode
3. WHEN the app runs on Android with "Add to Home Screen" THEN it SHALL be detected as PWA mode
4. WHEN the app runs in Chrome with display-mode: standalone THEN it SHALL be detected as PWA mode
5. WHEN PWA detection changes THEN all dependent UI elements SHALL update accordingly
