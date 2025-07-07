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
  
	// PWA/Standalone detection with enhanced iOS support
	const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true;
  
	// Enhanced iOS PWA detection
	const isIOSPWA = isIOS && (
		(window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.outerHeight === window.innerHeight && window.outerWidth === window.innerWidth)
	);
  
	// General PWA detection
	const isPWA = isStandalone || 
    isIOSPWA ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;
  
	// Fullscreen detection (document fullscreen API only)
	const isDocumentFullscreen = !!(
		document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
	);
  
	// Combined fullscreen state (document fullscreen OR PWA mode)
	const isFullscreen = isDocumentFullscreen || isPWA;
  
	return {
		isMobile: isMobile && !isTablet, // Phones only
		isTablet,
		isDesktop,
		isPWA,
		isStandalone,
		isIOS,
		isAndroid,
		isFullscreen: Boolean(isFullscreen),
	};
}

/**
 * Check if device should hide fullscreen button
 * Hides if in actual fullscreen mode OR if in PWA mode
 */
export function shouldHideFullscreenButton(): boolean {
	const device = getDeviceInfo();
  
	// Check document fullscreen state
	const isDocumentFullscreen = !!(
		document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
	);
  
	// Hide if actually fullscreen OR if in PWA mode
	return isDocumentFullscreen || device.isPWA || device.isStandalone;
}

/**
 * Check if device is mobile (phone or tablet)
 */
export function isMobileDevice(): boolean {
	const device = getDeviceInfo();
	return device.isMobile || device.isTablet;
}

/**
 * Check if we're in PWA/standalone mode
 */
export function isPWAMode(): boolean {
	const device = getDeviceInfo();
	return device.isPWA || device.isStandalone;
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
 * Request fullscreen if supported
 */
export function requestFullscreen(): void {
	const el = document.documentElement as any;
	if (el.requestFullscreen) el.requestFullscreen();
	else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
	else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
	else if (el.msRequestFullscreen) el.msRequestFullscreen();
}

/**
 * Debug function to log PWA detection information
 */
export function debugPWADetection(): void {
	const device = getDeviceInfo();
	console.log('[PWA DEBUG] Device detection:', {
		userAgent: navigator.userAgent,
		isMobile: device.isMobile,
		isTablet: device.isTablet,
		isIOS: device.isIOS,
		isAndroid: device.isAndroid,
		isPWA: device.isPWA,
		isStandalone: device.isStandalone,
		isFullscreen: device.isFullscreen,
		navigatorStandalone: (window.navigator as any).standalone,
		displayModeStandalone: window.matchMedia('(display-mode: standalone)').matches,
		displayModeFullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
		displayModeMinimalUI: window.matchMedia('(display-mode: minimal-ui)').matches,
		windowDimensions: {
			outerWidth: window.outerWidth,
			outerHeight: window.outerHeight,
			innerWidth: window.innerWidth,
			innerHeight: window.innerHeight,
			dimensionsMatch: window.outerHeight === window.innerHeight && window.outerWidth === window.innerWidth,
		},
	});
}