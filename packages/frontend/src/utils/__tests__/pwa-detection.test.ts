/**
 * Tests for PWA detection accuracy
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEnhancedPWAInfo, getEnhancedDeviceInfo } from '../mobile-utils';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

describe('PWA Detection Accuracy', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset navigator
		Object.defineProperty(window.navigator, 'userAgent', {
			writable: true,
			value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
		});

		// Reset standalone property
		delete (window.navigator as any).standalone;
	});

	describe('Desktop Chrome Browser', () => {
		it('should NOT detect desktop Chrome as PWA', () => {
			// Desktop Chrome user agent
			Object.defineProperty(window.navigator, 'userAgent', {
				writable: true,
				value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			});

			// Mock display-mode: standalone (which Chrome might report)
			(window.matchMedia as any).mockImplementation((query: string) => ({
				matches: query === '(display-mode: standalone)',
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}));

			const pwaInfo = getEnhancedPWAInfo();
			const deviceInfo = getEnhancedDeviceInfo();

			expect(pwaInfo.isPWA).toBe(false);
			expect(pwaInfo.isIOSPWA).toBe(false);
			expect(deviceInfo.isPWA).toBe(false);
			expect(deviceInfo.googleSignInSupported).toBe(true);
		});
	});

	describe('iOS Safari Browser', () => {
		it('should NOT detect iOS Safari browser as PWA', () => {
			// iOS Safari user agent
			Object.defineProperty(window.navigator, 'userAgent', {
				writable: true,
				value: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
			});

			// Regular Safari browser (not standalone)
			(window.navigator as any).standalone = false;

			// Ensure matchMedia returns false for all display modes
			(window.matchMedia as any).mockImplementation((query: string) => ({
				matches: false, // All display modes should be false for regular browser
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}));

			const pwaInfo = getEnhancedPWAInfo();
			const deviceInfo = getEnhancedDeviceInfo();



			expect(pwaInfo.isPWA).toBe(false);
			expect(pwaInfo.isIOSPWA).toBe(false);
			expect(deviceInfo.isPWA).toBe(false);
			expect(deviceInfo.googleSignInSupported).toBe(true);
		});
	});

	describe('iOS PWA Mode', () => {
		it('should detect iOS PWA when navigator.standalone is true', () => {
			// iOS Safari user agent
			Object.defineProperty(window.navigator, 'userAgent', {
				writable: true,
				value: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
			});

			// PWA mode (standalone)
			(window.navigator as any).standalone = true;

			const pwaInfo = getEnhancedPWAInfo();
			const deviceInfo = getEnhancedDeviceInfo();

			expect(pwaInfo.isPWA).toBe(true);
			expect(pwaInfo.isIOSPWA).toBe(true);
			expect(deviceInfo.isPWA).toBe(true);
			expect(deviceInfo.googleSignInSupported).toBe(true); // Should support via redirect
		});

		it('should detect iOS PWA when display-mode is standalone', () => {
			// iOS Safari user agent
			Object.defineProperty(window.navigator, 'userAgent', {
				writable: true,
				value: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
			});

			// Mock display-mode: standalone
			(window.matchMedia as any).mockImplementation((query: string) => ({
				matches: query === '(display-mode: standalone)',
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}));

			const pwaInfo = getEnhancedPWAInfo();
			const deviceInfo = getEnhancedDeviceInfo();

			expect(pwaInfo.isPWA).toBe(true);
			expect(pwaInfo.isIOSPWA).toBe(true);
			expect(deviceInfo.isPWA).toBe(true);
			expect(deviceInfo.googleSignInSupported).toBe(true);
		});
	});

	describe('Android Browser', () => {
		it('should NOT detect Android browser as PWA', () => {
			// Android Chrome user agent
			Object.defineProperty(window.navigator, 'userAgent', {
				writable: true,
				value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
			});

			// Even with display-mode: standalone
			(window.matchMedia as any).mockImplementation((query: string) => ({
				matches: query === '(display-mode: standalone)',
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}));

			const pwaInfo = getEnhancedPWAInfo();
			const deviceInfo = getEnhancedDeviceInfo();

			expect(pwaInfo.isPWA).toBe(false); // Should be false since we only detect iOS as PWA
			expect(pwaInfo.isIOSPWA).toBe(false);
			expect(deviceInfo.isPWA).toBe(false);
			expect(deviceInfo.googleSignInSupported).toBe(true);
		});
	});


});
