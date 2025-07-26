/**
 * Tests for fullscreen detection functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { isFullscreenSupported } from '../mobile-utils';

describe('Fullscreen Detection', () => {
	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Mock document with default values
		vi.stubGlobal('document', {
			documentElement: {},
			fullscreenEnabled: undefined,
			webkitFullscreenEnabled: undefined,
		});

		// Mock navigator with default values
		vi.stubGlobal('navigator', {
			userAgent: '',
		});
	});

	describe('isFullscreenSupported', () => {
		it('should return false when no fullscreen methods exist', () => {
			expect(isFullscreenSupported()).toBe(false);
		});

		it('should return true when fullscreen methods exist and fullscreenEnabled is true', () => {
			vi.stubGlobal('document', {
				documentElement: { requestFullscreen: vi.fn() },
				fullscreenEnabled: true,
				webkitFullscreenEnabled: undefined,
			});

			expect(isFullscreenSupported()).toBe(true);
		});

		it('should return true on desktop when fullscreen methods exist but fullscreenEnabled is false', () => {
			vi.stubGlobal('document', {
				documentElement: { requestFullscreen: vi.fn() },
				fullscreenEnabled: false,
				webkitFullscreenEnabled: undefined,
			});

			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
			});

			expect(isFullscreenSupported()).toBe(true);
		});

		it('should return false on mobile when fullscreen methods exist but fullscreenEnabled is false', () => {
			vi.stubGlobal('document', {
				documentElement: { requestFullscreen: vi.fn() },
				fullscreenEnabled: false,
				webkitFullscreenEnabled: undefined,
			});

			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
			});

			expect(isFullscreenSupported()).toBe(false);
		});

		it('should return true on desktop when fullscreen methods exist but webkitFullscreenEnabled is false', () => {
			vi.stubGlobal('document', {
				documentElement: { webkitRequestFullscreen: vi.fn() },
				fullscreenEnabled: undefined,
				webkitFullscreenEnabled: false,
			});

			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
			});

			expect(isFullscreenSupported()).toBe(true);
		});

		it('should return false on mobile when fullscreen methods exist but webkitFullscreenEnabled is false', () => {
			vi.stubGlobal('document', {
				documentElement: { webkitRequestFullscreen: vi.fn() },
				fullscreenEnabled: undefined,
				webkitFullscreenEnabled: false,
			});

			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
			});

			expect(isFullscreenSupported()).toBe(false);
		});

		it('should return true when webkit fullscreen methods exist and webkitFullscreenEnabled is true', () => {
			vi.stubGlobal('document', {
				documentElement: { webkitRequestFullscreen: vi.fn() },
				fullscreenEnabled: undefined,
				webkitFullscreenEnabled: true,
			});

			expect(isFullscreenSupported()).toBe(true);
		});

		it('should return false for Chrome on iOS even when methods exist', () => {
			vi.stubGlobal('document', {
				documentElement: { requestFullscreen: vi.fn() },
				fullscreenEnabled: true,
				webkitFullscreenEnabled: undefined,
			});

			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/94.0.4606.76 Mobile/15E148 Safari/604.1',
			});

			expect(isFullscreenSupported()).toBe(false);
		});

		it('should return false for Chrome on iPad even when methods exist', () => {
			vi.stubGlobal('document', {
				documentElement: { requestFullscreen: vi.fn() },
				fullscreenEnabled: true,
				webkitFullscreenEnabled: undefined,
			});

			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/94.0.4606.76 Mobile/15E148 Safari/604.1',
			});

			expect(isFullscreenSupported()).toBe(false);
		});

		it('should return true for Safari on iOS when methods exist and enabled', () => {
			vi.stubGlobal('document', {
				documentElement: { webkitRequestFullscreen: vi.fn() },
				fullscreenEnabled: undefined,
				webkitFullscreenEnabled: true,
			});

			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
			});

			expect(isFullscreenSupported()).toBe(true);
		});

		it('should return true for Edge on iOS when methods exist and enabled', () => {
			vi.stubGlobal('document', {
				documentElement: { requestFullscreen: vi.fn() },
				fullscreenEnabled: true,
				webkitFullscreenEnabled: undefined,
			});

			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 EdgiOS/46.3.13 Mobile/15E148 Safari/605.1.15',
			});

			expect(isFullscreenSupported()).toBe(true);
		});

		it('should return true for desktop Chrome when methods exist and enabled', () => {
			vi.stubGlobal('document', {
				documentElement: { requestFullscreen: vi.fn() },
				fullscreenEnabled: true,
				webkitFullscreenEnabled: undefined,
			});

			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
			});

			expect(isFullscreenSupported()).toBe(true);
		});

		it('should return true when methods exist but no enabled flags are available (fallback)', () => {
			vi.stubGlobal('document', {
				documentElement: { requestFullscreen: vi.fn() },
				fullscreenEnabled: undefined,
				webkitFullscreenEnabled: undefined,
			});

			vi.stubGlobal('navigator', {
				userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
			});

			expect(isFullscreenSupported()).toBe(true);
		});
	});
});
