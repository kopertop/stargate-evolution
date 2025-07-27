/**
 * Tests for Google Sign-In functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { isGoogleSignInSupported, getGoogleSignInState, clearGoogleSignInState } from '../google-auth';

// Mock the mobile-utils module
vi.mock('../../utils/mobile-utils', () => ({
	getEnhancedDeviceInfo: vi.fn(() => ({
		isPWA: false,
		isIOSPWA: false,
		isTablet: false,
		googleSignInSupported: true,
		displayMode: 'browser',
	})),
}));

describe('Google Sign-In Authentication', () => {
	beforeEach(() => {
		// Clear any existing states
		clearGoogleSignInState('test-container');
	});

	describe('isGoogleSignInSupported', () => {
		it('should return true when Google Sign-In is supported', () => {
			// Mock window and document
			vi.stubGlobal('window', {});
			vi.stubGlobal('document', {});

			expect(isGoogleSignInSupported()).toBe(true);

			vi.unstubAllGlobals();
		});

		it('should return false when window is undefined', () => {
			vi.stubGlobal('window', undefined);
			vi.stubGlobal('document', {});

			expect(isGoogleSignInSupported()).toBe(false);

			vi.unstubAllGlobals();
		});

		it('should return false when document is undefined', () => {
			vi.stubGlobal('window', {});
			vi.stubGlobal('document', undefined);

			expect(isGoogleSignInSupported()).toBe(false);

			vi.unstubAllGlobals();
		});
	});

	describe('state management', () => {
		it('should return null for non-existent container state', () => {
			const state = getGoogleSignInState('non-existent');
			expect(state).toBeNull();
		});

		it('should clear sign-in state', () => {
			// This test just ensures the function doesn't throw
			expect(() => clearGoogleSignInState('test-container')).not.toThrow();
		});
	});

	describe('device detection integration', () => {
		it('should use enhanced device info for support detection', async () => {
			const { getEnhancedDeviceInfo } = await import('../../utils/mobile-utils');

			// Mock different device scenarios
			vi.mocked(getEnhancedDeviceInfo).mockReturnValue({
				isPWA: true,
				isIOSPWA: true,
				isTablet: true,
				googleSignInSupported: false,
				displayMode: 'standalone',
			} as any);

			vi.stubGlobal('window', {});
			vi.stubGlobal('document', {});

			// Should still return false due to googleSignInSupported: false
			expect(isGoogleSignInSupported()).toBe(false);

			vi.unstubAllGlobals();
		});
	});
});
