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
 * Enhanced Google Sign-In button renderer with error handling and retry logic
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

		// Get device info to determine optimal UX mode
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

		// Determine UX mode based on device capabilities
		let uxMode: 'popup' | 'redirect' = 'popup';

		// Use redirect mode for iOS PWA if popup support is questionable
		if (deviceInfo.isIOSPWA && !deviceInfo.googleSignInSupported) {
			uxMode = 'redirect';
			console.log(`[GOOGLE-AUTH] Using redirect mode for iOS PWA`);
		}

		// Initialize Google Identity Services
		(window as any).google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: (response: GoogleCredentialResponse) => {
				console.log(`[GOOGLE-AUTH] Authentication successful for ${containerId}`);
				state.isLoading = false;
				state.hasError = false;
				state.retryCount = 0;
				successCallback(response.credential);
			},
			ux_mode: uxMode,
			// Add error handling for initialization
			error_callback: (error: any) => {
				console.error(`[GOOGLE-AUTH] Google Identity Services error:`, error);
				const errorMessage = 'Google Sign-In initialization failed. Please try again.';
				handleRenderError(errorMessage, containerId, options);
			},
		});

		// Clear container before rendering
		container.innerHTML = '';

		// Render the button with iPad-optimized settings
		(window as any).google.accounts.id.renderButton(
			container,
			{
				theme: 'outline',
				size: 'large',
				text: 'continue_with',
				shape: 'pill',
				// Add iPad-specific styling
				width: deviceInfo.isTablet ? '100%' : undefined,
				locale: 'en',
			},
		);

		// Verify button was actually rendered
		setTimeout(() => {
			const renderedButton = container.querySelector('div[role="button"], iframe, button');
			if (!renderedButton) {
				console.warn(`[GOOGLE-AUTH] Button may not have rendered properly in ${containerId}`);
				// Try alternative rendering approach
				tryAlternativeRender(container, containerId, options);
			} else {
				console.log(`[GOOGLE-AUTH] Button successfully rendered in ${containerId}`);
				state.isLoading = false;
			}
		}, 1000);

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
 * Try alternative rendering approach for problematic cases
 */
function tryAlternativeRender(container: HTMLElement, containerId: string, options: GoogleSignInOptions): void {
	console.log(`[GOOGLE-AUTH] Trying alternative render approach for ${containerId}`);

	try {
		// Clear and try again with different settings
		container.innerHTML = '';

		(window as any).google.accounts.id.renderButton(
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

	} catch (error: any) {
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
	const deviceInfo = getEnhancedDeviceInfo();
	return deviceInfo.googleSignInSupported && (
		typeof window !== 'undefined' &&
		typeof document !== 'undefined'
	);
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
}
