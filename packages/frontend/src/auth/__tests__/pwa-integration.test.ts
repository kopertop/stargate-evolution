/**
 * Integration tests for PWA authentication flow
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderGoogleSignInButton, isGoogleSignInSupported, clearAllGoogleSignInStates } from '../google-auth';
import { getSession, setSession, clearSession } from '../session';

// Mock the mobile-utils module
const mockDeviceInfo = {
	isPWA: false,
	isIOSPWA: false,
	isTablet: false,
	isDesktop: true,
	googleSignInSupported: true,
	displayMode: 'browser' as const,
};

vi.mock('../../utils/mobile-utils', () => ({
	getEnhancedDeviceInfo: vi.fn(() => mockDeviceInfo),
}));

// Mock Google Identity Services
const mockGoogleAccounts = {
	id: {
		initialize: vi.fn(),
		renderButton: vi.fn(),
	},
};

Object.defineProperty(window, 'google', {
	value: {
		accounts: mockGoogleAccounts,
	},
	writable: true,
});

describe('PWA Authentication Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = '';
		clearAllGoogleSignInStates();

		// Reset device info to default
		mockDeviceInfo.isPWA = false;
		mockDeviceInfo.isIOSPWA = false;
		mockDeviceInfo.googleSignInSupported = true;
		mockDeviceInfo.displayMode = 'browser';
		mockDeviceInfo.isTablet = false;
		mockDeviceInfo.isDesktop = true;
	});

	describe('Google Sign-In Support Detection', () => {
		it('should support Google Sign-In in regular browser mode', () => {
			mockDeviceInfo.isPWA = false;
			expect(isGoogleSignInSupported()).toBe(true);
		});

		it('should support Google Sign-In in Android browser mode', () => {
			mockDeviceInfo.isPWA = false; // Android is not detected as PWA anymore
			mockDeviceInfo.isIOSPWA = false;
			mockDeviceInfo.googleSignInSupported = true;
			expect(isGoogleSignInSupported()).toBe(true);
		});

		it('should support Google Sign-In in iOS PWA with popup support', () => {
			mockDeviceInfo.isPWA = true;
			mockDeviceInfo.isIOSPWA = true;
			mockDeviceInfo.googleSignInSupported = true;
			expect(isGoogleSignInSupported()).toBe(true);
		});

		it('should support Google Sign-In in iOS PWA without popup support (redirect fallback)', () => {
			mockDeviceInfo.isPWA = true;
			mockDeviceInfo.isIOSPWA = true;
			mockDeviceInfo.googleSignInSupported = false;
			// Should still be supported due to redirect fallback
			expect(isGoogleSignInSupported()).toBe(true);
		});
	});

	describe('Button Rendering in Different PWA Modes', () => {
		it('should render button in regular browser mode', async () => {
			const container = document.createElement('div');
			container.id = 'test-signin';
			document.body.appendChild(container);

			const onSuccess = vi.fn();

			mockDeviceInfo.isPWA = false;

			await renderGoogleSignInButton('test-signin', onSuccess);

			expect(mockGoogleAccounts.id.initialize).toHaveBeenCalledWith(
				expect.objectContaining({
					client_id: expect.any(String),
					ux_mode: 'popup',
				})
			);

			expect(mockGoogleAccounts.id.renderButton).toHaveBeenCalledWith(
				container,
				expect.objectContaining({
					theme: 'outline',
					size: 'large',
				})
			);
		});

		it('should render button in iOS PWA mode with popup support', async () => {
			const container = document.createElement('div');
			container.id = 'test-signin';
			document.body.appendChild(container);

			const onSuccess = vi.fn();

			mockDeviceInfo.isPWA = true;
			mockDeviceInfo.isIOSPWA = true;
			mockDeviceInfo.googleSignInSupported = true;
			mockDeviceInfo.isDesktop = false; // Important: not desktop in PWA mode
			mockDeviceInfo.isTablet = true; // iPad

			await renderGoogleSignInButton('test-signin', onSuccess);

			expect(mockGoogleAccounts.id.initialize).toHaveBeenCalledWith(
				expect.objectContaining({
					client_id: expect.any(String),
					ux_mode: 'popup',
				})
			);

			expect(mockGoogleAccounts.id.renderButton).toHaveBeenCalledWith(
				container,
				expect.objectContaining({
					theme: 'filled_blue', // More prominent for PWA
				})
			);
		});

		it('should render button in iOS PWA mode without popup support (redirect mode)', async () => {
			const container = document.createElement('div');
			container.id = 'test-signin';
			document.body.appendChild(container);

			const onSuccess = vi.fn();

			mockDeviceInfo.isPWA = true;
			mockDeviceInfo.isIOSPWA = true;
			mockDeviceInfo.googleSignInSupported = false;
			mockDeviceInfo.isDesktop = false; // Important: not desktop in PWA mode
			mockDeviceInfo.isTablet = true; // iPad

			await renderGoogleSignInButton('test-signin', onSuccess);

			expect(mockGoogleAccounts.id.initialize).toHaveBeenCalledWith(
				expect.objectContaining({
					client_id: expect.any(String),
					ux_mode: 'redirect',
				})
			);
		});

		it('should handle tablet-specific optimizations', async () => {
			const container = document.createElement('div');
			container.id = 'test-signin';
			document.body.appendChild(container);

			const onSuccess = vi.fn();

			mockDeviceInfo.isTablet = true;
			mockDeviceInfo.isPWA = true;
			mockDeviceInfo.isIOSPWA = true; // iPad PWA
			mockDeviceInfo.isDesktop = false; // Important: not desktop in PWA mode

			await renderGoogleSignInButton('test-signin', onSuccess);

			expect(mockGoogleAccounts.id.renderButton).toHaveBeenCalledWith(
				container,
				expect.objectContaining({
					width: '100%', // Full width for tablets
					theme: 'filled_blue',
				})
			);
		});
	});

	describe('Session Management in PWA Mode', () => {
		it('should store and retrieve session in regular mode', () => {
			const testSession = {
				token: 'test-token',
				refreshToken: 'test-refresh',
				user: {
					id: '123',
					email: 'test@example.com',
					name: 'Test User',
					is_admin: false,
				},
				expiresAt: Date.now() + 3600000,
			};

			setSession(testSession);
			const retrieved = getSession();

			expect(retrieved).toEqual(testSession);
		});

		it('should handle session storage in PWA mode with backup', () => {
			mockDeviceInfo.isPWA = true;

			const testSession = {
				token: 'test-token',
				refreshToken: 'test-refresh',
				user: {
					id: '123',
					email: 'test@example.com',
					name: 'Test User',
					is_admin: false,
				},
				expiresAt: Date.now() + 3600000,
			};

			setSession(testSession);
			const retrieved = getSession();

			expect(retrieved).toEqual(testSession);
		});

		it('should clear session properly', () => {
			const testSession = {
				token: 'test-token',
				refreshToken: 'test-refresh',
				user: {
					id: '123',
					email: 'test@example.com',
					name: 'Test User',
					is_admin: false,
				},
				expiresAt: Date.now() + 3600000,
			};

			setSession(testSession);
			expect(getSession()).toEqual(testSession);

			clearSession();
			expect(getSession()).toBeNull();
		});
	});

	describe('Error Handling in PWA Mode', () => {
		it('should handle container not found error', async () => {
			const onSuccess = vi.fn();
			const onError = vi.fn();

			await renderGoogleSignInButton({
				containerId: 'non-existent-container',
				onSuccess,
				onError,
			});

			expect(onError).toHaveBeenCalledWith(
				expect.stringContaining('Container element with ID \'non-existent-container\' not found')
			);
		});

		it('should handle Google script loading failure', () => {
			// Set Google object to undefined to simulate script loading failure
			(window as unknown).google = undefined;

			const container = document.createElement('div');
			container.id = 'test-signin';
			document.body.appendChild(container);

			const onSuccess = vi.fn();
			const onError = vi.fn();

			// This should not throw an error even when Google is undefined
			expect(() => {
				renderGoogleSignInButton({
					containerId: 'test-signin',
					onSuccess,
					onError,
				});
			}).not.toThrow();

			// Should show loading state initially
			expect(container.innerHTML).toContain('Loading Sign-In');
		});
	});
});
