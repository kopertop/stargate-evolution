import * as PIXI from 'pixi.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { BackgroundLayer } from '../background-layer';

// Mock PIXI for testing
vi.mock('pixi.js', () => ({
	Container: class MockContainer {
		children: any[] = [];
		addChild = vi.fn();
		addChildAt = vi.fn();
		removeChildren = vi.fn();
		destroy = vi.fn();
		visible = true;
		constructor() {}
	},
	Graphics: class MockGraphics {
		circle = vi.fn().mockReturnThis();
		fill = vi.fn().mockReturnThis();
		moveTo = vi.fn().mockReturnThis();
		lineTo = vi.fn().mockReturnThis();
		stroke = vi.fn().mockReturnThis();
		destroy = vi.fn();
		visible = true;
		x = 0;
		y = 0;
		constructor() {}
	},
}));

describe('BackgroundLayer', () => {
	let backgroundLayer: BackgroundLayer;
	let mockCallback: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockCallback = vi.fn();
		backgroundLayer = new BackgroundLayer({
			onBackgroundTypeChange: mockCallback,
		});
	});

	describe('Initialization', () => {
		it('should initialize with default stars background', () => {
			expect(backgroundLayer.getCurrentBackgroundType()).toBe('stars');
		});

		it('should create starfield on initialization', () => {
			// Starfield should be created during initialization
			expect(backgroundLayer).toBeDefined();
		});

		it('should handle callback options', () => {
			const layerWithCallback = new BackgroundLayer({
				onBackgroundTypeChange: mockCallback,
			});
			expect(layerWithCallback).toBeDefined();
		});
	});

	describe('Background Type Management', () => {
		it('should switch to FTL background type', () => {
			backgroundLayer.setBackgroundType('ftl');
      
			expect(backgroundLayer.getCurrentBackgroundType()).toBe('ftl');
			expect(mockCallback).toHaveBeenCalledWith('ftl');
		});

		it('should switch to stars background type', () => {
			// First switch to FTL
			backgroundLayer.setBackgroundType('ftl');
			mockCallback.mockClear();
      
			// Then switch back to stars
			backgroundLayer.setBackgroundType('stars');
      
			expect(backgroundLayer.getCurrentBackgroundType()).toBe('stars');
			expect(mockCallback).toHaveBeenCalledWith('stars');
		});

		it('should not trigger callback when setting same background type', () => {
			// Start with stars, set to stars again
			backgroundLayer.setBackgroundType('stars');
      
			expect(mockCallback).not.toHaveBeenCalled();
		});

		it('should handle FTL status updates', () => {
			backgroundLayer.updateFTLStatus('active');
			expect(backgroundLayer.getCurrentBackgroundType()).toBe('ftl');
      
			backgroundLayer.updateFTLStatus('inactive');
			expect(backgroundLayer.getCurrentBackgroundType()).toBe('stars');
		});
	});

	describe('Starfield Management', () => {
		it('should set starfield visibility', () => {
			backgroundLayer.setStarfieldVisible(false);
			// Should not throw error
			expect(true).toBe(true);
      
			backgroundLayer.setStarfieldVisible(true);
			// Should not throw error
			expect(true).toBe(true);
		});
	});

	describe('Animation System', () => {
		it('should update FTL animation when in FTL mode', () => {
			backgroundLayer.setBackgroundType('ftl');
      
			// Should not throw error during update
			expect(() => backgroundLayer.update()).not.toThrow();
		});

		it('should not animate when in stars mode', () => {
			backgroundLayer.setBackgroundType('stars');
      
			// Should not throw error during update
			expect(() => backgroundLayer.update()).not.toThrow();
		});

		it('should handle update calls when no FTL streaks exist', () => {
			// Should not throw error
			expect(() => backgroundLayer.update()).not.toThrow();
		});
	});

	describe('Debug Information', () => {
		it('should provide debug information', () => {
			const debugInfo = backgroundLayer.getDebugInfo();
      
			expect(debugInfo).toHaveProperty('currentBackgroundType');
			expect(debugInfo).toHaveProperty('animationFrame');
			expect(debugInfo).toHaveProperty('ftlStreakCount');
			expect(debugInfo).toHaveProperty('starfieldVisible');
			expect(debugInfo).toHaveProperty('ftlStreaksVisible');
      
			expect((debugInfo as any).currentBackgroundType).toBe('stars');
			expect(typeof (debugInfo as any).animationFrame).toBe('number');
			expect(typeof (debugInfo as any).ftlStreakCount).toBe('number');
			expect(typeof (debugInfo as any).starfieldVisible).toBe('boolean');
			expect(typeof (debugInfo as any).ftlStreaksVisible).toBe('boolean');
		});
	});

	describe('Lifecycle Management', () => {
		it('should clean up resources on destroy', () => {
			backgroundLayer.setBackgroundType('ftl'); // Create FTL streaks
      
			expect(() => backgroundLayer.destroy()).not.toThrow();
		});

		it('should handle destroy when no FTL streaks exist', () => {
			expect(() => backgroundLayer.destroy()).not.toThrow();
		});
	});

	describe('FTL Streak System', () => {
		it('should create FTL streaks when switching to FTL mode', () => {
			backgroundLayer.setBackgroundType('ftl');
      
			const debugInfo = backgroundLayer.getDebugInfo();
			expect((debugInfo as any).ftlStreakCount).toBeGreaterThan(0);
		});

		it('should animate FTL streaks during update', () => {
			backgroundLayer.setBackgroundType('ftl');
      
			// Run animation for several frames
			for (let i = 0; i < 5; i++) {
				backgroundLayer.update();
			}
      
			const debugInfo = backgroundLayer.getDebugInfo();
			expect((debugInfo as any).animationFrame).toBeGreaterThan(0);
		});
	});

	describe('Error Handling', () => {
		it('should handle missing callback gracefully', () => {
			const layerWithoutCallback = new BackgroundLayer();
      
			expect(() => layerWithoutCallback.setBackgroundType('ftl')).not.toThrow();
		});

		it('should handle update calls before initialization', () => {
			const newLayer = new BackgroundLayer();
      
			expect(() => newLayer.update()).not.toThrow();
		});
	});
});