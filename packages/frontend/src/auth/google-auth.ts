// Utility for Google Identity Services login
// Usage: import { renderGoogleSignInButton } from './auth/google-auth';

import { getEnhancedDeviceInfo } from '../utils/mobile-utils';

const GOOGLE_CLIENT_ID = '688478835170-eloiofvs1afuiqfflk44qevfphsfh5e6.apps.googleusercontent.com';

export type GoogleCredentialResponse = {
	credential: string;
	select_by: string;
};

export interface GoogleSignInOptions {
	containerId: string;
	onSuccess: (idToken: string) => void;
	onError?: (error: string) => void;
	maxRetries?: number;
	retryDelay?: number;
}

interface GoogleSignInState {
	isLoading: boolean;
	hasError: boolean;
	errorMessage: string;
	retryCount: number;
}

// Global state to track Google Sign-In attempts
const signInStates = new Map<string, GoogleSignInState>();

/**
 * Check if Google Identity Services script is loaded and available
 */
function isGoogleScriptLoaded(): boolean {
	return !!(window as any).google && !!(window as any).google.accounts && !!(window as any).google.accounts.id;
}

/**
 * Wait for Google Identity Services script to load with timeout
 */
function waitForGoogleScript(timeout: number = 10000): Promise<boolean> {
	return new Promise((resolve) => {
		if (isGoogleScriptLoaded()) {
			resolve(true);
			return;
		}

		const startTime = Date.now();
		const checkInterval = setInterval(() => {
			if (isGoogleScriptLoaded()) {
				clearInterval(checkInterval);
				resolve(true);
				return;
			}

			if (Date.now() - startTime > timeout) {
				clearInterval(checkInterval);
				resolve(false);
			}
		}, 100);
	});
}

/**
 * Create fallback button when Google Sign-In fails
 */
function createFallbackButton(containerId: string, errorMessage: string, onRetry: () => void): void {
	const container = document.getElementById(containerId);
	if (!container) return;

	container.innerHTML = `
		<div class="google-signin-fallback">
			<div class="alert alert-warning mb-3" role="alert">
				<strong>Sign-In Issue:</strong> ${errorMessage}
			</div>
			<button type="button" class="btn btn-primary btn-lg w-100" id="${containerId}-retry">
				<i class="fas fa-redo me-2"></i>
				Retry Google Sign-In
			</button>
			<div class="mt-2">
				<small class="text-muted">
					If this continues to fail, try refreshing the page or using a different browser.
				</small>
			</div>
		</div>
	`;

	// Add retry button event listener
	const retryButton = document.getElementById(`${containerId}-retry`);
	if (retryButton) {
		retryButton.addEventListener('click', onRetry);
	}
}

/**
 * Enhanced Google Sign-In button renderer with PWA-optimized authentication flow
 * @param options Configuration options for Google Sign-In button
 */
export async function renderGoogleSignInButton(options: GoogleSignInOptions): Promise<void>;
export async function renderGoogleSignInButton(
	containerId: string,
	onSuccess: (idToken: string) => void,
): Promise<void>;
export async function renderGoogleSignInButton(
	optionsOrContainerId: GoogleSignInOptions | string,
	onSuccess?: (idToken: string) => void,
): Promise<void> {
	// Handle both function signatures for backward compatibility
	const options: GoogleSignInOptions = typeof optionsOrContainerId === 'string'
		? {
			containerId: optionsOrContainerId,
			onSuccess: onSuccess!,
			maxRetries: 3,
			retryDelay: 2000,
		}
		: {
			maxRetries: 3,
			retryDelay: 2000,
			...optionsOrContainerId,
		};

	const { containerId, onSuccess: successCallback, onError, maxRetries = 3, retryDelay = 2000 } = options;

	// Initialize state for this container
	if (!signInStates.has(containerId)) {
		signInStates.set(containerId, {
			isLoading: false,
			hasError: false,
			errorMessage: '',
			retryCount: 0,
		});
	}

	const state = signInStates.get(containerId)!;

	// Prevent multiple simultaneous attempts
	if (state.isLoading) {
		console.log(`[GOOGLE-AUTH] Sign-in already in progress for ${containerId}`);
		return;
	}

	state.isLoading = true;
	state.hasError = false;

	const container = document.getElementById(containerId);
	if (!container) {
		const error = `Container element with ID '${containerId}' not found`;
		console.error(`[GOOGLE-AUTH] ${error}`);
		onError?.(error);
		state.isLoading = false;
		return;
	}

	// Show loading state
	container.innerHTML = `
		<div class="d-flex justify-content-center align-items-center py-3">
			<div class="spinner-border spinner-border-sm me-2" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
			<span>Loading Sign-In...</span>
		</div>
	`;

	try {
		console.log(`[GOOGLE-AUTH] Attempting to render Google Sign-In button (attempt ${state.retryCount + 1}/${maxRetries})`);

		// Get device info to determine optimal authentication strategy
		const deviceInfo = getEnhancedDeviceInfo();
		console.log(`[GOOGLE-AUTH] Device info:`, {
			isPWA: deviceInfo.isPWA,
			isIOSPWA: deviceInfo.isIOSPWA,
			googleSignInSupported: deviceInfo.googleSignInSupported,
			displayMode: deviceInfo.displayMode,
		});

		// Wait for Google script to load
		const scriptLoaded = await waitForGoogleScript(10000);
		if (!scriptLoaded) {
			throw new Error('Google Identity Services script failed to load. Please check your internet connection.');
		}

		// Determine optimal authentication strategy for PWA mode
		const authStrategy = determinePWAAuthStrategy(deviceInfo);
		console.log(`[GOOGLE-AUTH] Using authentication strategy:`, authStrategy);

		// Initialize Google Identity Services with PWA-optimized settings
		const initConfig = createPWAOptimizedConfig(authStrategy, successCallback, containerId, options);
		(window as any).google.accounts.id.initialize(initConfig);

		// Clear container before rendering
		container.innerHTML = '';

		// Render button with PWA-optimized settings
		const buttonConfig = createPWAOptimizedButtonConfig(deviceInfo, authStrategy);
		(window as any).google.accounts.id.renderButton(container, buttonConfig);

		// Verify button rendering and handle PWA-specific issues
		await verifyButtonRenderingWithPWAFallback(container, containerId, options, authStrategy);

	} catch (error: any) {
		console.error(`[GOOGLE-AUTH] Failed to render Google Sign-In button:`, error);
		handleRenderError(error.message || 'Unknown error occurred', containerId, options);
	}
}

/**
 * Handle rendering errors with retry logic
 */
function handleRenderError(errorMessage: string, containerId: string, options: GoogleSignInOptions): void {
	const state = signInStates.get(containerId)!;
	state.isLoading = false;
	state.hasError = true;
	state.errorMessage = errorMessage;

	console.error(`[GOOGLE-AUTH] Render error for ${containerId}:`, errorMessage);

	// Call error callback if provided
	options.onError?.(errorMessage);

	// Show retry option if we haven't exceeded max retries
	if (state.retryCount < (options.maxRetries || 3)) {
		const retryFunction = () => {
			state.retryCount++;
			console.log(`[GOOGLE-AUTH] Retrying render for ${containerId} (attempt ${state.retryCount})`);

			// Wait before retrying
			setTimeout(() => {
				renderGoogleSignInButton(options);
			}, options.retryDelay || 2000);
		};

		createFallbackButton(containerId, errorMessage, retryFunction);
	} else {
		// Max retries exceeded - show final error state
		const container = document.getElementById(containerId);
		if (container) {
			container.innerHTML = `
				<div class="google-signin-error">
					<div class="alert alert-danger" role="alert">
						<strong>Sign-In Unavailable:</strong> ${errorMessage}
					</div>
					<div class="text-center">
						<small class="text-muted">
							Please refresh the page or try again later. If the problem persists,
							contact support or try using a different browser.
						</small>
					</div>
				</div>
			`;
		}
	}
}

/**
 * Authentication strategy types for different PWA contexts
 */
interface PWAAuthStrategy {
	uxMode: 'popup' | 'redirect';
	useAlternativeFlow: boolean;
	requiresRedirectHandling: boolean;
	popupBlocked: boolean;
	description: string;
}

/**
 * Determine the optimal authentication strategy based on PWA context
 */
function determinePWAAuthStrategy(deviceInfo: any): PWAAuthStrategy {
	// Default strategy for non-PWA or desktop
	if (!deviceInfo.isPWA || deviceInfo.isDesktop) {
		return {
			uxMode: 'popup',
			useAlternativeFlow: false,
			requiresRedirectHandling: false,
			popupBlocked: false,
			description: 'Standard popup authentication',
		};
	}

	// iOS PWA - most restrictive environment
	if (deviceInfo.isIOSPWA) {
		// Check if we can use popups in iOS PWA
		const canUsePopups = typeof window.open === 'function' && deviceInfo.googleSignInSupported;

		if (canUsePopups) {
			return {
				uxMode: 'popup',
				useAlternativeFlow: false,
				requiresRedirectHandling: false,
				popupBlocked: false,
				description: 'iOS PWA with popup support',
			};
		} else {
			return {
				uxMode: 'redirect',
				useAlternativeFlow: true,
				requiresRedirectHandling: true,
				popupBlocked: true,
				description: 'iOS PWA with redirect fallback',
			};
		}
	}

	// Since PWA is now only detected on iOS, this case should not occur
	// But keeping it as a safety fallback
	if (deviceInfo.isPWA && !deviceInfo.isIOSPWA) {
		return {
			uxMode: 'popup',
			useAlternativeFlow: false,
			requiresRedirectHandling: false,
			popupBlocked: false,
			description: 'Non-iOS PWA with popup support',
		};
	}

	// Fallback
	return {
		uxMode: 'popup',
		useAlternativeFlow: false,
		requiresRedirectHandling: false,
		popupBlocked: false,
		description: 'Default popup authentication',
	};
}

/**
 * Create PWA-optimized Google Identity Services configuration
 */
function createPWAOptimizedConfig(
	strategy: PWAAuthStrategy,
	successCallback: (idToken: string) => void,
	containerId: string,
	options: GoogleSignInOptions,
): any {
	const baseConfig = {
		client_id: GOOGLE_CLIENT_ID,
		ux_mode: strategy.uxMode,
		callback: (response: GoogleCredentialResponse) => {
			console.log(`[GOOGLE-AUTH] Authentication successful for ${containerId} using ${strategy.description}`);
			const state = signInStates.get(containerId)!;
			state.isLoading = false;
			state.hasError = false;
			state.retryCount = 0;

			// Store authentication success in PWA-compatible storage
			if (strategy.requiresRedirectHandling) {
				storePWAAuthState(containerId, 'success', response.credential);
			}

			successCallback(response.credential);
		},
		error_callback: (error: any) => {
			console.error(`[GOOGLE-AUTH] Google Identity Services error for ${strategy.description}:`, error);

			// Handle PWA-specific errors
			if (strategy.popupBlocked && error.type === 'popup_blocked_by_browser') {
				console.log(`[GOOGLE-AUTH] Popup blocked in PWA mode, attempting redirect fallback`);
				handlePWAPopupBlocked(containerId, options);
			} else {
				const errorMessage = `Google Sign-In failed (${strategy.description}). Please try again.`;
				handleRenderError(errorMessage, containerId, options);
			}
		},
	};

	// Add PWA-specific configuration
	if (strategy.requiresRedirectHandling) {
		return {
			...baseConfig,
			// Store redirect URI for PWA context
			redirect_uri: window.location.origin + window.location.pathname,
			// Add state parameter for security
			state: generatePWAAuthState(containerId),
		};
	}

	return baseConfig;
}

/**
 * Create PWA-optimized button configuration
 */
function createPWAOptimizedButtonConfig(deviceInfo: any, strategy: PWAAuthStrategy): any {
	const baseConfig = {
		theme: 'outline',
		size: 'large',
		text: 'continue_with',
		shape: 'pill',
		locale: 'en',
	};

	// iPad-specific optimizations
	if (deviceInfo.isTablet) {
		return {
			...baseConfig,
			width: '100%',
			// Use more prominent styling for PWA mode
			theme: deviceInfo.isPWA ? 'filled_blue' : 'outline',
		};
	}

	// PWA-specific optimizations
	if (deviceInfo.isPWA) {
		return {
			...baseConfig,
			// More prominent button for PWA context
			theme: 'filled_blue',
			text: strategy.uxMode === 'redirect' ? 'signin_with' : 'continue_with',
		};
	}

	return baseConfig;
}

/**
 * Verify button rendering with PWA-specific fallback handling
 */
async function verifyButtonRenderingWithPWAFallback(
	container: HTMLElement,
	containerId: string,
	options: GoogleSignInOptions,
	strategy: PWAAuthStrategy,
): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => {
			const renderedButton = container.querySelector('div[role="button"], iframe, button');
			if (!renderedButton) {
				console.warn(`[GOOGLE-AUTH] Button may not have rendered properly in ${containerId} with ${strategy.description}`);

				// Try PWA-specific alternative rendering
				if (strategy.useAlternativeFlow) {
					tryPWAAlternativeRender(container, containerId, options, strategy);
				} else {
					tryAlternativeRender(container, containerId, options);
				}
			} else {
				console.log(`[GOOGLE-AUTH] Button successfully rendered in ${containerId} using ${strategy.description}`);
				signInStates.get(containerId)!.isLoading = false;
			}
			resolve();
		}, 1000);
	});
}

/**
 * Handle popup blocked scenario in PWA mode
 */
function handlePWAPopupBlocked(containerId: string, options: GoogleSignInOptions): void {
	console.log(`[GOOGLE-AUTH] Handling popup blocked in PWA mode for ${containerId}`);

	const container = document.getElementById(containerId);
	if (!container) return;

	// Show PWA-specific fallback UI
	container.innerHTML = `
		<div class="google-signin-pwa-fallback">
			<div class="alert alert-info mb-3" role="alert">
				<strong>PWA Authentication:</strong> Popup blocked. Using redirect method.
			</div>
			<button type="button" class="btn btn-primary btn-lg w-100" id="${containerId}-redirect">
				<i class="fab fa-google me-2"></i>
				Continue with Google (Redirect)
			</button>
			<div class="mt-2">
				<small class="text-muted">
					You'll be redirected to Google for authentication, then back to the app.
				</small>
			</div>
		</div>
	`;

	// Add redirect button event listener
	const redirectButton = document.getElementById(`${containerId}-redirect`);
	if (redirectButton) {
		redirectButton.addEventListener('click', () => {
			initiateRedirectAuth(containerId, options);
		});
	}
}

/**
 * Try PWA-specific alternative rendering approach
 */
function tryPWAAlternativeRender(
	container: HTMLElement,
	containerId: string,
	options: GoogleSignInOptions,
	strategy: PWAAuthStrategy,
): void {
	console.log(`[GOOGLE-AUTH] Trying PWA alternative render for ${containerId} with ${strategy.description}`);

	try {
		// Clear and try with PWA-optimized settings
		container.innerHTML = '';

		const alternativeConfig = {
			theme: 'filled_blue',
			size: 'medium',
			text: 'signin_with',
			shape: 'rectangular',
			width: '100%',
		};

		(window as any).google.accounts.id.renderButton(container, alternativeConfig);

		// Check again after a delay
		setTimeout(() => {
			const renderedButton = container.querySelector('div[role="button"], iframe, button');
			if (!renderedButton) {
				// If still failing, show manual redirect option
				if (strategy.requiresRedirectHandling) {
					showManualRedirectOption(container, containerId, options);
				} else {
					handleRenderError('Button rendering failed after PWA alternative attempts', containerId, options);
				}
			} else {
				console.log(`[GOOGLE-AUTH] PWA alternative render successful for ${containerId}`);
				signInStates.get(containerId)!.isLoading = false;
			}
		}, 1000);

	} catch (error: any) {
		if (strategy.requiresRedirectHandling) {
			showManualRedirectOption(container, containerId, options);
		} else {
			handleRenderError(`PWA alternative render failed: ${error.message}`, containerId, options);
		}
	}
}

/**
 * Show manual redirect option when all automatic methods fail
 */
function showManualRedirectOption(container: HTMLElement, containerId: string, options: GoogleSignInOptions): void {
	console.log(`[GOOGLE-AUTH] Showing manual redirect option for ${containerId}`);

	container.innerHTML = `
		<div class="google-signin-manual-redirect">
			<div class="alert alert-warning mb-3" role="alert">
				<strong>Authentication Required:</strong> Please use the button below to sign in.
			</div>
			<button type="button" class="btn btn-primary btn-lg w-100" id="${containerId}-manual">
				<i class="fab fa-google me-2"></i>
				Sign in with Google
			</button>
			<div class="mt-2">
				<small class="text-muted">
					This will open Google's sign-in page in a new window or redirect.
				</small>
			</div>
		</div>
	`;

	// Add manual redirect button event listener
	const manualButton = document.getElementById(`${containerId}-manual`);
	if (manualButton) {
		manualButton.addEventListener('click', () => {
			initiateRedirectAuth(containerId, options);
		});
	}

	signInStates.get(containerId)!.isLoading = false;
}

/**
 * Initiate redirect-based authentication for PWA mode
 */
function initiateRedirectAuth(containerId: string, options: GoogleSignInOptions): void {
	console.log(`[GOOGLE-AUTH] Initiating redirect auth for ${containerId}`);

	try {
		// Store the container ID and callback for post-redirect handling
		storePWAAuthState(containerId, 'pending', null);

		// Use Google's redirect flow
		const redirectUrl = `https://accounts.google.com/oauth/authorize?` +
			`client_id=${GOOGLE_CLIENT_ID}&` +
			`redirect_uri=${encodeURIComponent(window.location.origin + window.location.pathname)}&` +
			`response_type=code&` +
			`scope=openid email profile&` +
			`state=${generatePWAAuthState(containerId)}`;

		// Redirect to Google
		window.location.href = redirectUrl;

	} catch (error: any) {
		console.error(`[GOOGLE-AUTH] Failed to initiate redirect auth:`, error);
		options.onError?.(`Redirect authentication failed: ${error.message}`);
	}
}

/**
 * Try alternative rendering approach for problematic cases
 */
function tryAlternativeRender(container: HTMLElement, containerId: string, options: GoogleSignInOptions): void {
	console.log(`[GOOGLE-AUTH] Trying alternative render approach for ${containerId}`);

	try {
		// Clear and try again with different settings
		container.innerHTML = '';

		(window as unknown).google.accounts.id.renderButton(
			container,
			{
				theme: 'filled_blue',
				size: 'medium',
				text: 'signin_with',
				shape: 'rectangular',
				width: '100%',
			},
		);

		// Check again after a delay
		setTimeout(() => {
			const renderedButton = container.querySelector('div[role="button"], iframe, button');
			if (!renderedButton) {
				handleRenderError('Button rendering failed after multiple attempts', containerId, options);
			} else {
				console.log(`[GOOGLE-AUTH] Alternative render successful for ${containerId}`);
				signInStates.get(containerId)!.isLoading = false;
			}
		}, 1000);

	} catch (error: unknown) {
		handleRenderError(`Alternative render failed: ${error.message}`, containerId, options);
	}
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use the enhanced renderGoogleSignInButton with options instead
 */
export function renderGoogleSignInButtonLegacy(
	containerId: string,
	onSuccess: (idToken: string) => void,
): void {
	renderGoogleSignInButton(containerId, onSuccess).catch(error => {
		console.error('[GOOGLE-AUTH] Legacy render failed:', error);
	});
}

/**
 * Check if Google Sign-In is supported on current device/browser
 */
export function isGoogleSignInSupported(): boolean {
	// Basic environment check
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return false;
	}

	const deviceInfo = getEnhancedDeviceInfo();

	// For iOS PWA without popup support, we can still use redirect
	if (deviceInfo.isPWA && deviceInfo.isIOSPWA && !deviceInfo.googleSignInSupported) {
		// Check if redirect is available (it should be in all browsers)
		return typeof window.location !== 'undefined';
	}

	return deviceInfo.googleSignInSupported;
}

/**
 * Get current state of Google Sign-In for a container
 */
export function getGoogleSignInState(containerId: string): GoogleSignInState | null {
	return signInStates.get(containerId) || null;
}

/**
 * Clear state for a specific container (useful for cleanup)
 */
export function clearGoogleSignInState(containerId: string): void {
	signInStates.delete(containerId);
	clearPWAAuthState(containerId);
}

/**
 * Clear all Google Sign-In states (useful for testing)
 */
export function clearAllGoogleSignInStates(): void {
	signInStates.clear();
	clearPWAAuthState();
}

/**
 * PWA authentication state management
 */
const PWA_AUTH_STATE_KEY = 'stargate-pwa-auth-state';

interface PWAAuthState {
	containerId: string;
	status: 'pending' | 'success' | 'error';
	credential?: string;
	timestamp: number;
	state: string;
}

/**
 * Generate secure state parameter for PWA authentication
 */
function generatePWAAuthState(containerId: string): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2);
	return `${containerId}-${timestamp}-${random}`;
}

/**
 * Store PWA authentication state in localStorage
 */
function storePWAAuthState(containerId: string, status: 'pending' | 'success' | 'error', credential: string | null): void {
	try {
		const authState: PWAAuthState = {
			containerId,
			status,
			credential: credential || undefined,
			timestamp: Date.now(),
			state: generatePWAAuthState(containerId),
		};

		localStorage.setItem(PWA_AUTH_STATE_KEY, JSON.stringify(authState));
		console.log(`[GOOGLE-AUTH] Stored PWA auth state for ${containerId}:`, status);
	} catch (error) {
		console.error('[GOOGLE-AUTH] Failed to store PWA auth state:', error);
	}
}

/**
 * Retrieve PWA authentication state from localStorage
 */
function getPWAAuthState(): PWAAuthState | null {
	try {
		const raw = localStorage.getItem(PWA_AUTH_STATE_KEY);
		if (!raw) return null;

		const authState = JSON.parse(raw) as PWAAuthState;

		// Check if state is expired (older than 10 minutes)
		if (Date.now() - authState.timestamp > 10 * 60 * 1000) {
			clearPWAAuthState();
			return null;
		}

		return authState;
	} catch (error) {
		console.error('[GOOGLE-AUTH] Failed to retrieve PWA auth state:', error);
		return null;
	}
}

/**
 * Clear PWA authentication state
 */
function clearPWAAuthState(containerId?: string): void {
	try {
		if (containerId) {
			const currentState = getPWAAuthState();
			if (currentState && currentState.containerId === containerId) {
				localStorage.removeItem(PWA_AUTH_STATE_KEY);
			}
		} else {
			localStorage.removeItem(PWA_AUTH_STATE_KEY);
		}
	} catch (error) {
		console.error('[GOOGLE-AUTH] Failed to clear PWA auth state:', error);
	}
}

/**
 * Handle redirect return from Google OAuth (for PWA mode)
 */
export function handlePWARedirectReturn(): boolean {
	const urlParams = new URLSearchParams(window.location.search);
	const code = urlParams.get('code');
	const state = urlParams.get('state');
	const error = urlParams.get('error');

	// Check if this is a redirect return
	if (!code && !error) {
		return false;
	}

	console.log('[GOOGLE-AUTH] Handling PWA redirect return');

	// Get stored auth state
	const authState = getPWAAuthState();
	if (!authState || authState.status !== 'pending') {
		console.warn('[GOOGLE-AUTH] No pending PWA auth state found');
		return false;
	}

	// Validate state parameter
	if (state && !state.startsWith(authState.containerId)) {
		console.error('[GOOGLE-AUTH] Invalid state parameter in redirect');
		clearPWAAuthState();
		return false;
	}

	if (error) {
		console.error('[GOOGLE-AUTH] OAuth error in redirect:', error);
		storePWAAuthState(authState.containerId, 'error', null);

		// Show error to user
		const container = document.getElementById(authState.containerId);
		if (container) {
			container.innerHTML = `
				<div class="alert alert-danger" role="alert">
					<strong>Authentication Failed:</strong> ${error}
				</div>
			`;
		}

		// Clean up URL
		cleanupRedirectURL();
		return true;
	}

	if (code) {
		// Exchange code for token (this would typically be done on the backend)
		console.log('[GOOGLE-AUTH] Received authorization code, would exchange for token');

		// For now, we'll need to handle this differently since we need the ID token
		// In a real implementation, you'd send the code to your backend to exchange for tokens

		// Clean up URL and show success message
		cleanupRedirectURL();

		const container = document.getElementById(authState.containerId);
		if (container) {
			container.innerHTML = `
				<div class="alert alert-info" role="alert">
					<strong>Authentication in Progress:</strong> Please wait while we complete the sign-in process.
				</div>
			`;
		}

		// Clear the auth state
		clearPWAAuthState();
		return true;
	}

	return false;
}

/**
 * Clean up redirect URL parameters
 */
function cleanupRedirectURL(): void {
	try {
		const url = new URL(window.location.href);
		url.searchParams.delete('code');
		url.searchParams.delete('state');
		url.searchParams.delete('error');
		url.searchParams.delete('error_description');

		// Update URL without page reload
		window.history.replaceState({}, document.title, url.toString());
	} catch (error) {
		console.error('[GOOGLE-AUTH] Failed to clean up redirect URL:', error);
	}
}

/**
 * Initialize PWA authentication handling on page load
 */
export function initializePWAAuthHandling(): void {
	// Check if we're returning from a redirect
	if (handlePWARedirectReturn()) {
		console.log('[GOOGLE-AUTH] Handled PWA redirect return');
	}

	// Set up periodic cleanup of expired auth states
	setInterval(() => {
		const authState = getPWAAuthState();
		if (authState && Date.now() - authState.timestamp > 10 * 60 * 1000) {
			console.log('[GOOGLE-AUTH] Cleaning up expired PWA auth state');
			clearPWAAuthState();
		}
	}, 60 * 1000); // Check every minute
}

/**
 * Enhanced session persistence for PWA mode
 */
export function ensurePWASessionPersistence(): void {
	// Listen for app visibility changes (PWA lifecycle events)
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') {
			console.log('[GOOGLE-AUTH] App became visible, checking auth state');

			// Check if we have any pending auth states
			const authState = getPWAAuthState();
			if (authState && authState.status === 'success' && authState.credential) {
				console.log('[GOOGLE-AUTH] Found successful auth state, processing...');
				// Process the successful authentication
				// This would typically trigger the success callback
			}
		}
	});

	// Listen for storage events (for cross-tab communication in PWA)
	window.addEventListener('storage', (event) => {
		if (event.key === PWA_AUTH_STATE_KEY) {
			console.log('[GOOGLE-AUTH] PWA auth state changed in another tab');
			// Handle auth state changes from other tabs/windows
		}
	});

	// Listen for beforeunload to clean up temporary states
	window.addEventListener('beforeunload', () => {
		const authState = getPWAAuthState();
		if (authState && authState.status === 'pending') {
			// Don't clear pending states on unload in PWA mode
			// as the user might be navigating back from OAuth
			console.log('[GOOGLE-AUTH] Preserving pending auth state for PWA navigation');
		}
	});
}
