/**
 * Mobile and PWA detection utilities
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPWA: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isFullscreen: boolean;
}

export interface PWADetectionResult {
  isPWA: boolean;
  isStandalone: boolean;
  isIOSPWA: boolean;
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
  shouldHideFullscreenButton: boolean;
  detectionMethods: {
    navigatorStandalone: boolean;
    displayModeStandalone: boolean;
    displayModeMinimalUI: boolean;
    displayModeFullscreen: boolean;
    iosWindowDimensions: boolean;
    iosViewportCheck: boolean;
  };
}

export interface EnhancedDeviceInfo extends DeviceInfo {
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
  isIOSPWA: boolean;
  shouldHideFullscreenButton: boolean;
  googleSignInSupported: boolean;
}

/**
 * Enhanced PWA detection with comprehensive iPad support
 */
export function getEnhancedPWAInfo(): PWADetectionResult {
	const userAgent = navigator.userAgent.toLowerCase();
	const isIOS = /iphone|ipad|ipod/i.test(userAgent);

	// Detection methods
	const navigatorStandalone = (window.navigator as any).standalone === true;
	const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
	const displayModeMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
	const displayModeFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;

	// iOS-specific PWA detection methods
	const iosWindowDimensions = isIOS && (
		window.outerHeight === window.innerHeight &&
		window.outerWidth === window.innerWidth
	);

	// Additional iOS PWA detection using viewport meta tag behavior
	const iosViewportCheck = isIOS && (
		window.screen.height === window.innerHeight ||
		Math.abs(window.screen.height - window.innerHeight) <= 40 // Account for status bar
	);

	// Determine display mode
	let displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' = 'browser';
	if (displayModeFullscreen) {
		displayMode = 'fullscreen';
	} else if (displayModeStandalone || navigatorStandalone) {
		displayMode = 'standalone';
	} else if (displayModeMinimalUI) {
		displayMode = 'minimal-ui';
	}

	// iOS PWA detection (strict - only use reliable indicators)
	// NOTE: We exclude displayModeFullscreen because it can be triggered by browser fullscreen
	// which is NOT the same as PWA mode
	const isIOSPWA = isIOS && (
		navigatorStandalone ||
		displayModeStandalone ||
		displayModeMinimalUI
		// Removed displayModeFullscreen - browser fullscreen triggers this incorrectly
	);

	// Simple PWA detection - use navigator.standalone or display-mode: standalone
	const isPWA = navigatorStandalone || displayModeStandalone;

	// Determine if fullscreen button should be hidden
	const shouldHideFullscreenButton = isPWA || isDocumentFullscreen() || !isFullscreenSupported();

	return {
		isPWA,
		isStandalone: navigatorStandalone || displayModeStandalone,
		isIOSPWA,
		displayMode,
		shouldHideFullscreenButton,
		detectionMethods: {
			navigatorStandalone,
			displayModeStandalone,
			displayModeMinimalUI,
			displayModeFullscreen,
			iosWindowDimensions,
			iosViewportCheck,
		},
	};
}

/**
 * Comprehensive device and context detection
 */
export function getDeviceInfo(): DeviceInfo {
	const userAgent = navigator.userAgent.toLowerCase();

	// Mobile detection
	const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
    (!!navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /macintosh/i.test(userAgent));

	// Tablet detection (iPad, Android tablets)
	const isTablet = /ipad/i.test(userAgent) ||
    (!!navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /macintosh/i.test(userAgent)) ||
    (/android/i.test(userAgent) && !/mobile/i.test(userAgent));

	const isDesktop = !isMobile && !isTablet;

	// Platform detection
	const isIOS = /iphone|ipad|ipod/i.test(userAgent);
	const isAndroid = /android/i.test(userAgent);

	// Use enhanced PWA detection
	const pwaInfo = getEnhancedPWAInfo();

	// Fullscreen detection (document fullscreen API only)
	const documentFullscreen = isDocumentFullscreen();

	// Combined fullscreen state (document fullscreen OR PWA mode)
	const isFullscreen = documentFullscreen || pwaInfo.isPWA;

	return {
		isMobile: isMobile && !isTablet, // Phones only
		isTablet,
		isDesktop,
		isPWA: pwaInfo.isPWA,
		isStandalone: pwaInfo.isStandalone,
		isIOS,
		isAndroid,
		isFullscreen: Boolean(isFullscreen),
	};
}

/**
 * Enhanced device info with additional PWA-specific properties
 */
export function getEnhancedDeviceInfo(): EnhancedDeviceInfo {
	const deviceInfo = getDeviceInfo();
	const pwaInfo = getEnhancedPWAInfo();

	// Check if Google Sign-In is supported (considering PWA constraints)
	const googleSignInSupported = (() => {
		// Always supported in non-PWA mode (desktop browsers, mobile browsers)
		if (!pwaInfo.isPWA) return true;

		// Since we only detect PWA on iOS, this will only be iOS PWA
		if (pwaInfo.isIOSPWA) {
			// Check if popups are available
			const hasPopupSupport = typeof window.open === 'function';

			// Check if we can use redirect (always available)
			const hasRedirectSupport = typeof window.location !== 'undefined';

			// iOS PWA supports Google Sign-In if we have either popup or redirect
			return hasPopupSupport || hasRedirectSupport;
		}

		// Fallback (should not reach here since PWA is only iOS now)
		return true;
	})();

	return {
		...deviceInfo,
		displayMode: pwaInfo.displayMode,
		isIOSPWA: pwaInfo.isIOSPWA,
		shouldHideFullscreenButton: pwaInfo.shouldHideFullscreenButton,
		googleSignInSupported,
	};
}

/**
 * Helper function to check document fullscreen state
 */
function isDocumentFullscreen(): boolean {
	return !!(
		document.fullscreenElement ||
		(document as any).webkitFullscreenElement ||
		(document as any).mozFullScreenElement ||
		(document as any).msFullscreenElement
	);
}

/**
 * Check if device should hide fullscreen button
 * Hides if in actual fullscreen mode OR if in PWA mode OR if fullscreen is not supported
 */
export function shouldHideFullscreenButton(): boolean {
	const pwaInfo = getEnhancedPWAInfo();
	return pwaInfo.shouldHideFullscreenButton;
}

/**
 * Legacy PWA detection function - maintained for backward compatibility
 * @deprecated Use getEnhancedPWAInfo() instead for more comprehensive detection
 */
export function isPWAMode(): boolean {
	const pwaInfo = getEnhancedPWAInfo();
	return pwaInfo.isPWA;
}

/**
 * Check if device is mobile (phone or tablet)
 */
export function isMobileDevice(): boolean {
	const device = getDeviceInfo();
	return device.isMobile || device.isTablet;
}

/**
 * Listen for fullscreen changes and update callback
 */
export function onFullscreenChange(callback: (isFullscreen: boolean) => void): () => void {
	const checkFullscreen = () => {
		const device = getDeviceInfo();
		callback(device.isFullscreen);
	};

	// Listen to all fullscreen events
	document.addEventListener('fullscreenchange', checkFullscreen);
	document.addEventListener('webkitfullscreenchange', checkFullscreen);
	document.addEventListener('mozfullscreenchange', checkFullscreen);
	document.addEventListener('MSFullscreenChange', checkFullscreen);

	// Return cleanup function
	return () => {
		document.removeEventListener('fullscreenchange', checkFullscreen);
		document.removeEventListener('webkitfullscreenchange', checkFullscreen);
		document.removeEventListener('mozfullscreenchange', checkFullscreen);
		document.removeEventListener('MSFullscreenChange', checkFullscreen);
	};
}

/**
 * Check if fullscreen is actually supported (not just if methods exist)
 */
export function isFullscreenSupported(): boolean {
	// Check if fullscreen methods exist
	const el = document.documentElement as any;
	const hasFullscreenMethods = !!(
		el.requestFullscreen ||
		el.webkitRequestFullscreen ||
		el.mozRequestFullScreen ||
		el.msRequestFullscreen
	);

	// If no methods exist, definitely no support
	if (!hasFullscreenMethods) return false;

	// Specific Chrome iOS detection - Chrome on iOS has limited fullscreen support
	// This must be checked BEFORE fullscreenEnabled checks because Chrome iOS may report
	// fullscreenEnabled as true but still not support proper fullscreen
	const userAgent = navigator.userAgent.toLowerCase();
	const isIOS = /iphone|ipad|ipod/i.test(userAgent);
	const isChrome = /crios/i.test(userAgent); // Chrome on iOS uses "CriOS" in user agent

	// Chrome on iOS typically doesn't support true fullscreen API
	if (isIOS && isChrome) {
		return false;
	}

	// Check document.fullscreenEnabled if available, but be permissive
	// Some browsers may report fullscreenEnabled as false even when it works
	if (typeof document.fullscreenEnabled !== 'undefined') {
		// If explicitly disabled, respect that
		if (document.fullscreenEnabled === false) {
			// But only on mobile devices - desktop browsers sometimes report false incorrectly
			const userAgent = navigator.userAgent.toLowerCase();
			const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
			if (isMobileDevice) {
				return false;
			}
		}
		// If enabled or we're on desktop, continue with other checks
	}

	// Check webkit equivalent, but be permissive
	if (typeof (document as any).webkitFullscreenEnabled !== 'undefined') {
		// If explicitly disabled, respect that
		if ((document as any).webkitFullscreenEnabled === false) {
			// But only on mobile devices - desktop browsers sometimes report false incorrectly
			const userAgent = navigator.userAgent.toLowerCase();
			const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
			if (isMobileDevice) {
				return false;
			}
		}
		// If enabled or we're on desktop, continue
	}

	// For other browsers, assume support if methods exist (be permissive)
	return hasFullscreenMethods;
}

/**
 * Request fullscreen if supported
 */
export function requestFullscreen(): void {
	if (!isFullscreenSupported()) {
		console.warn('[FULLSCREEN] Fullscreen not supported on this browser/device');
		return;
	}

	const el = document.documentElement as any;
	if (el.requestFullscreen) el.requestFullscreen();
	else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
	else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
	else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

/**
 * Enhanced debug function to log comprehensive PWA detection information
 */
export function debugPWADetection(): void {
	const device = getDeviceInfo();
	const enhancedDevice = getEnhancedDeviceInfo();
	const pwaInfo = getEnhancedPWAInfo();

	console.group('[PWA DEBUG] Comprehensive Detection Results');

	console.log('User Agent:', navigator.userAgent);

	console.group('Device Info');
	console.log('isMobile:', device.isMobile);
	console.log('isTablet:', device.isTablet);
	console.log('isDesktop:', device.isDesktop);
	console.log('isIOS:', device.isIOS);
	console.log('isAndroid:', device.isAndroid);
	console.groupEnd();

	console.group('PWA Detection');
	console.log('isPWA:', pwaInfo.isPWA);
	console.log('isStandalone:', pwaInfo.isStandalone);
	console.log('isIOSPWA:', pwaInfo.isIOSPWA);
	console.log('displayMode:', pwaInfo.displayMode);
	console.log('shouldHideFullscreenButton:', pwaInfo.shouldHideFullscreenButton);
	console.groupEnd();

	console.group('Detection Methods');
	console.log('navigatorStandalone:', pwaInfo.detectionMethods.navigatorStandalone);
	console.log('displayModeStandalone:', pwaInfo.detectionMethods.displayModeStandalone);
	console.log('displayModeMinimalUI:', pwaInfo.detectionMethods.displayModeMinimalUI);
	console.log('displayModeFullscreen:', pwaInfo.detectionMethods.displayModeFullscreen);
	console.log('iosWindowDimensions:', pwaInfo.detectionMethods.iosWindowDimensions);
	console.log('iosViewportCheck:', pwaInfo.detectionMethods.iosViewportCheck);
	console.groupEnd();

	console.group('Window Dimensions');
	console.log('outerWidth:', window.outerWidth);
	console.log('outerHeight:', window.outerHeight);
	console.log('innerWidth:', window.innerWidth);
	console.log('innerHeight:', window.innerHeight);
	console.log('screen.width:', window.screen.width);
	console.log('screen.height:', window.screen.height);
	console.log('dimensionsMatch:', window.outerHeight === window.innerHeight && window.outerWidth === window.innerWidth);
	console.groupEnd();

	console.group('Enhanced Features');
	console.log('googleSignInSupported:', enhancedDevice.googleSignInSupported);
	console.log('isDocumentFullscreen:', isDocumentFullscreen());
	console.log('isFullscreenSupported:', isFullscreenSupported());
	console.log('safari object available:', typeof (window as any).safari !== 'undefined');
	console.log('window.open available:', typeof window.open === 'function');
	console.groupEnd();

	console.group('Fullscreen Support Details');
	console.log('document.fullscreenEnabled:', (document as any).fullscreenEnabled);
	console.log('document.webkitFullscreenEnabled:', (document as any).webkitFullscreenEnabled);
	console.log('requestFullscreen available:', !!(document.documentElement as any).requestFullscreen);
	console.log('webkitRequestFullscreen available:', !!(document.documentElement as any).webkitRequestFullscreen);
	console.log('Chrome on iOS detected:', /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase()) && /crios/i.test(navigator.userAgent.toLowerCase()));
	console.log('isDocumentFullscreen:', isDocumentFullscreen());
	console.log('isFullscreenSupported:', isFullscreenSupported());
	console.log('fullscreenElement:', document.fullscreenElement);
	console.log('webkitFullscreenElement:', (document as any).webkitFullscreenElement);
	console.log('window dimensions:', {
		innerHeight: window.innerHeight,
		outerHeight: window.outerHeight,
		screenHeight: window.screen.height,
		innerWidth: window.innerWidth,
		outerWidth: window.outerWidth,
		screenWidth: window.screen.width
	});
	console.groupEnd();

	console.groupEnd();
}

/**
 * Lightweight PWA state logging for troubleshooting
 */
export function logPWAState(context: string = 'Unknown'): void {
	const pwaInfo = getEnhancedPWAInfo();
	console.log(`[PWA State - ${context}]`, {
		isPWA: pwaInfo.isPWA,
		displayMode: pwaInfo.displayMode,
		isIOSPWA: pwaInfo.isIOSPWA,
		shouldHideFullscreenButton: pwaInfo.shouldHideFullscreenButton,
	});
}

/**
 * Monitor PWA state changes and log when they occur
 */
export function monitorPWAStateChanges(): () => void {
	let lastState = getEnhancedPWAInfo();

	const checkStateChange = () => {
		const currentState = getEnhancedPWAInfo();

		// Check if any important state has changed
		if (
			currentState.isPWA !== lastState.isPWA ||
			currentState.displayMode !== lastState.displayMode ||
			currentState.isIOSPWA !== lastState.isIOSPWA ||
			currentState.shouldHideFullscreenButton !== lastState.shouldHideFullscreenButton
		) {
			console.log('[PWA State Change]', {
				from: lastState,
				to: currentState,
				timestamp: new Date().toISOString(),
			});
			lastState = currentState;
		}
	};

	// Check for changes periodically
	const interval = setInterval(checkStateChange, 1000);

	// Also listen for relevant events
	const events = ['resize', 'orientationchange', 'visibilitychange'];
	events.forEach(event => {
		window.addEventListener(event, checkStateChange);
	});

	// Return cleanup function
	return () => {
		clearInterval(interval);
		events.forEach(event => {
			window.removeEventListener(event, checkStateChange);
		});
	};
}
