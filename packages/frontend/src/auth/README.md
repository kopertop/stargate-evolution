# Google Sign-In Authentication

This module provides enhanced Google Sign-In functionality with iPad-specific fixes and comprehensive error handling.

## Features

### Enhanced Error Handling
- **Script Loading Detection**: Automatically detects if Google Identity Services script fails to load
- **Retry Logic**: Implements exponential backoff retry mechanism for failed authentication attempts
- **Fallback UI**: Provides user-friendly fallback buttons when Google Sign-In fails
- **Comprehensive Logging**: Detailed logging for debugging authentication issues

### iPad-Specific Fixes
- **PWA Detection**: Enhanced PWA detection specifically for iPad Safari "Add to Home Screen" scenarios
- **UX Mode Selection**: Automatically chooses between popup and redirect modes based on device capabilities
- **Responsive Styling**: iPad-optimized button styling and layout
- **Touch-Friendly Interface**: Improved touch interaction for tablet devices

### Device-Aware Authentication
- **iOS PWA Support**: Special handling for iOS PWA mode where popups may be restricted
- **Tablet Optimization**: Full-width buttons and improved visibility on tablet devices
- **Cross-Platform Compatibility**: Works consistently across desktop, mobile, and tablet devices

## Usage

### Basic Usage
```typescript
import { renderGoogleSignInButton } from './auth/google-auth';

// Simple usage (backward compatible)
renderGoogleSignInButton('google-signin-button', (idToken) => {
  console.log('Authentication successful:', idToken);
});
```

### Enhanced Usage with Error Handling
```typescript
import { renderGoogleSignInButton } from './auth/google-auth';

renderGoogleSignInButton({
  containerId: 'google-signin-button',
  onSuccess: (idToken) => {
    console.log('Authentication successful:', idToken);
    // Handle successful authentication
  },
  onError: (error) => {
    console.error('Authentication failed:', error);
    // Handle authentication errors
  },
  maxRetries: 3,
  retryDelay: 2000,
});
```

### Checking Support
```typescript
import { isGoogleSignInSupported } from './auth/google-auth';

if (isGoogleSignInSupported()) {
  // Render Google Sign-In button
} else {
  // Show alternative authentication method
}
```

### State Management
```typescript
import { getGoogleSignInState, clearGoogleSignInState } from './auth/google-auth';

// Check current state
const state = getGoogleSignInState('my-container');
if (state?.hasError) {
  console.log('Error:', state.errorMessage);
}

// Clear state (useful for cleanup)
clearGoogleSignInState('my-container');
```

## Configuration Options

### GoogleSignInOptions
- `containerId` (string): DOM element ID to render the button into
- `onSuccess` (function): Callback with Google ID token on successful login
- `onError` (function, optional): Callback with error message on failure
- `maxRetries` (number, optional): Maximum number of retry attempts (default: 3)
- `retryDelay` (number, optional): Delay between retries in milliseconds (default: 2000)

## Error Handling

The module provides comprehensive error handling for common issues:

### Script Loading Failures
- Detects when Google Identity Services script fails to load
- Provides retry mechanism with exponential backoff
- Shows user-friendly error messages with manual retry options

### Button Rendering Issues
- Verifies that the button actually renders in the DOM
- Attempts alternative rendering approaches if initial render fails
- Provides fallback UI when rendering completely fails

### Authentication Failures
- Handles Google Identity Services initialization errors
- Manages popup blocking scenarios in PWA mode
- Provides clear error messages for different failure scenarios

## iPad-Specific Enhancements

### PWA Mode Detection
The module includes enhanced PWA detection specifically for iPad:
- Detects Safari "Add to Home Screen" scenarios
- Handles iOS-specific PWA constraints
- Automatically adjusts authentication flow for PWA mode

### UX Mode Selection
- **Popup Mode**: Used for regular browser sessions
- **Redirect Mode**: Used for iOS PWA where popups may be blocked

### Styling Optimizations
- Full-width buttons on tablet devices
- Improved visibility in dark theme
- Touch-friendly button sizing
- PWA-specific styling adjustments

## Debugging

### Debug Logging
The module includes comprehensive debug logging:
```javascript
// Enable debug logging (automatically enabled in development)
console.log('[GOOGLE-AUTH] Debug information available in console');
```

### PWA Detection Debugging
```typescript
import { debugPWADetection } from '../utils/mobile-utils';

// Log comprehensive PWA detection information
debugPWADetection();
```

### State Inspection
```typescript
import { getGoogleSignInState } from './auth/google-auth';

const state = getGoogleSignInState('my-container');
console.log('Current state:', state);
```

## Browser Compatibility

- **Chrome/Chromium**: Full support
- **Safari**: Full support including PWA mode
- **Firefox**: Full support
- **Edge**: Full support
- **iOS Safari**: Enhanced PWA support
- **Android Chrome**: Full PWA support

## Security Considerations

- Uses Google's official Identity Services library
- Implements proper CSRF protection
- Validates authentication tokens server-side
- Handles authentication state securely in PWA mode
- Prevents authentication token exposure in logs

## Troubleshooting

### Common Issues

1. **Button Not Visible on iPad**
   - Check CSS styling in `google-login.css`
   - Verify PWA detection is working correctly
   - Ensure Google Identity Services script loaded successfully

2. **Authentication Fails in PWA Mode**
   - Module automatically handles PWA constraints
   - Uses redirect mode for iOS PWA when necessary
   - Check browser console for detailed error messages

3. **Script Loading Failures**
   - Module includes automatic retry logic
   - Check network connectivity
   - Verify Google Identity Services is not blocked by ad blockers

### Manual Testing
To test the enhanced functionality:
1. Open the app on iPad Safari
2. Add to Home Screen to test PWA mode
3. Try authentication in both regular and PWA modes
4. Check browser console for debug information
