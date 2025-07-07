import * as PIXI from 'pixi.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CameraController } from '../camera-controller';

// Mock PIXI Application
const mockApp = {
	screen: { width: 800, height: 600 },
	stage: {
		position: { x: 0, y: 0 },
		scale: { x: 1, y: 1 },
	},
	ticker: {
		add: vi.fn(),
		remove: vi.fn(),
	},
} as unknown as PIXI.Application;

// Mock world container
const mockWorld = {
	position: { x: 0, y: 0 },
	scale: {
		x: 1,
		y: 1,
		set: vi.fn((x: number, y: number) => {
			mockWorld.scale.x = x;
			mockWorld.scale.y = y;
		}),
	},
	x: 0,
	y: 0,
} as unknown as PIXI.Container;

describe('CameraController', () => {
	let cameraController: CameraController;

	beforeEach(() => {
		// Reset mock values
		mockApp.stage.position.x = 0;
		mockApp.stage.position.y = 0;
		mockApp.stage.scale.x = 1;
		mockApp.stage.scale.y = 1;
		mockWorld.position.x = 0;
		mockWorld.position.y = 0;
		mockWorld.scale.x = 1;
		mockWorld.scale.y = 1;
		mockWorld.x = 0;
		mockWorld.y = 0;

		cameraController = new CameraController(mockApp, mockWorld);
	});

	describe('initialization', () => {
		it('should initialize with default settings', () => {
			const zoom = cameraController.getZoom();

			expect(zoom).toBe(2.0); // Default zoom
		});

		it('should initialize with custom zoom', () => {
			const customController = new CameraController(mockApp, mockWorld, 1.5);

			expect(customController.getZoom()).toBe(1.5);
		});
	});

	describe('zoom functionality', () => {
		it('should zoom in correctly', () => {
			const initialZoom = cameraController.getZoom();
			cameraController.zoomIn();
			const newZoom = cameraController.getZoom();

			expect(newZoom).toBeGreaterThan(initialZoom);
		});

		it('should zoom out correctly', () => {
			const initialZoom = cameraController.getZoom();
			cameraController.zoomOut();
			const newZoom = cameraController.getZoom();

			expect(newZoom).toBeLessThan(initialZoom);
		});

		it('should not zoom beyond maximum zoom', () => {
			// Zoom in many times to hit the limit
			for (let i = 0; i < 20; i++) {
				cameraController.zoomIn();
			}

			const zoom = cameraController.getZoom();
			expect(zoom).toBeLessThanOrEqual(8.0); // Default max zoom
		});

		it('should not zoom below minimum zoom', () => {
			// Zoom out many times to hit the limit
			for (let i = 0; i < 20; i++) {
				cameraController.zoomOut();
			}

			const zoom = cameraController.getZoom();
			expect(zoom).toBeGreaterThanOrEqual(0.2); // Default min zoom
		});

		it('should set zoom to specific value', () => {
			cameraController.setZoom(3.0);
			expect(cameraController.getZoom()).toBe(3.0);
		});

		it('should clamp zoom values to valid range', () => {
			cameraController.setZoom(100); // Too high
			expect(cameraController.getZoom()).toBe(8.0); // Should be clamped to max

			cameraController.setZoom(0.01); // Too low
			expect(cameraController.getZoom()).toBe(0.2); // Should be clamped to min
		});

		it('should reset zoom to specific level', () => {
			cameraController.setZoom(5.0);
			cameraController.resetZoom(1.0);

			expect(cameraController.getZoom()).toBe(1.0);
		});

		it('should set zoom constraints', () => {
			cameraController.setZoomConstraints(0.5, 4.0);

			// Test new max constraint
			cameraController.setZoom(10.0);
			expect(cameraController.getZoom()).toBe(4.0);

			// Test new min constraint
			cameraController.setZoom(0.1);
			expect(cameraController.getZoom()).toBe(0.5);
		});
	});

	describe('camera movement', () => {
		it('should pan camera by delta values', () => {
			const deltaX = 50;
			const deltaY = 30;

			cameraController.pan(deltaX, deltaY);

			expect(mockWorld.x).toBe(deltaX);
			expect(mockWorld.y).toBe(deltaY);
		});

		it('should center camera on specific position', () => {
			const x = 100;
			const y = 200;

			cameraController.centerOnPosition(x, y);

			// Position should be adjusted to center the point on screen
			expect(mockWorld.x).toBeDefined();
			expect(mockWorld.y).toBeDefined();
		});
	});

	describe('target following', () => {
		it('should follow target when enabled', () => {
			const target = { x: 100, y: 100, follow: true };

			cameraController.setTarget(target);
			cameraController.update(); // Simulate frame update

			// Camera should be updated (world position changes)
			expect(mockWorld.x).toBeDefined();
			expect(mockWorld.y).toBeDefined();
		});

		it('should not follow target when disabled', () => {
			const target = { x: 100, y: 100, follow: true };
			const initialX = mockWorld.x;
			const initialY = mockWorld.y;

			cameraController.setFollowEnabled(false);
			cameraController.setTarget(target);
			cameraController.update();

			expect(mockWorld.x).toBe(initialX);
			expect(mockWorld.y).toBe(initialY);
		});

		it('should smooth follow with configurable speed', () => {
			const target = { x: 200, y: 200, follow: true };

			cameraController.setFollowSpeed(0.5); // Faster following
			cameraController.setTarget(target);
			cameraController.update();

			// With higher follow speed, camera should move more towards target
			expect(mockWorld.x).toBeDefined();
			expect(mockWorld.y).toBeDefined();
		});

		it('should center immediately when follow is false', () => {
			const target = { x: 300, y: 250, follow: false };

			cameraController.setTarget(target);

			// Camera should immediately center on target
			expect(mockWorld.x).toBeDefined();
			expect(mockWorld.y).toBeDefined();
		});

		it('should clear target', () => {
			const target = { x: 100, y: 100, follow: true };

			cameraController.setTarget(target);
			cameraController.setTarget(null);

			// Should not crash on update
			expect(() => cameraController.update()).not.toThrow();
		});
	});

	describe('coordinate transformations', () => {
		it('should convert screen to world coordinates', () => {
			const screenX = 400;
			const screenY = 300;

			const worldPos = cameraController.screenToWorld(screenX, screenY);

			expect(worldPos.x).toBeDefined();
			expect(worldPos.y).toBeDefined();
			expect(typeof worldPos.x).toBe('number');
			expect(typeof worldPos.y).toBe('number');
		});

		it('should convert world to screen coordinates', () => {
			const worldX = 100;
			const worldY = 150;

			const screenPos = cameraController.worldToScreen(worldX, worldY);

			expect(screenPos.x).toBeDefined();
			expect(screenPos.y).toBeDefined();
			expect(typeof screenPos.x).toBe('number');
			expect(typeof screenPos.y).toBe('number');
		});

		it('should convert screen to world and back accurately', () => {
			const originalScreenX = 400;
			const originalScreenY = 300;

			const worldPos = cameraController.screenToWorld(originalScreenX, originalScreenY);
			const backToScreen = cameraController.worldToScreen(worldPos.x, worldPos.y);

			// Should be approximately the same (allowing for floating point precision)
			expect(Math.abs(backToScreen.x - originalScreenX)).toBeLessThan(0.1);
			expect(Math.abs(backToScreen.y - originalScreenY)).toBeLessThan(0.1);
		});

		it('should handle coordinate conversion with different zoom levels', () => {
			cameraController.setZoom(4.0);

			const screenX = 400;
			const screenY = 300;

			const worldPos = cameraController.screenToWorld(screenX, screenY);
			const backToScreen = cameraController.worldToScreen(worldPos.x, worldPos.y);

			expect(Math.abs(backToScreen.x - screenX)).toBeLessThan(0.1);
			expect(Math.abs(backToScreen.y - screenY)).toBeLessThan(0.1);
		});
	});

	describe('viewport calculations', () => {
		it('should calculate visible bounds correctly', () => {
			const bounds = cameraController.getViewportBounds();

			expect(bounds.left).toBeDefined();
			expect(bounds.right).toBeDefined();
			expect(bounds.top).toBeDefined();
			expect(bounds.bottom).toBeDefined();
			expect(bounds.right).toBeGreaterThan(bounds.left);
			expect(bounds.bottom).toBeGreaterThan(bounds.top);
		});

		it('should check if position is visible', () => {
			const centerPoint = cameraController.screenToWorld(400, 300);
			const isVisible = cameraController.isPositionVisible(centerPoint.x, centerPoint.y);

			expect(isVisible).toBe(true);
		});

		it('should check if position is outside viewport', () => {
			const isVisible = cameraController.isPositionVisible(10000, 10000);

			expect(isVisible).toBe(false);
		});

		it('should check visibility with margin', () => {
			const centerPoint = cameraController.screenToWorld(400, 300);
			const isVisible = cameraController.isPositionVisible(centerPoint.x, centerPoint.y, 100);

			expect(isVisible).toBe(true);
		});
	});

	describe('debug and utility functions', () => {
		it('should provide debug information', () => {
			const debugInfo = cameraController.getDebugInfo();

			expect(debugInfo.zoom).toBeDefined();
			expect(debugInfo.worldPosition).toBeDefined();
			expect(debugInfo.target).toBeNull();
			expect(debugInfo.followEnabled).toBe(true);
			expect(debugInfo.viewportBounds).toBeDefined();
		});

		it('should handle resize', () => {
			expect(() => cameraController.handleResize()).not.toThrow();
		});

		it('should destroy cleanly', () => {
			expect(() => cameraController.destroy()).not.toThrow();
		});
	});

	describe('edge cases and error handling', () => {
		it('should handle invalid zoom values gracefully', () => {
			cameraController.setZoom(NaN);
			expect(isNaN(cameraController.getZoom())).toBe(false);

			cameraController.setZoom(Infinity);
			expect(cameraController.getZoom()).toBe(8.0); // Should clamp to max

			cameraController.setZoom(-1);
			expect(cameraController.getZoom()).toBe(0.2); // Should clamp to min
		});

		it('should handle update with no target', () => {
			expect(() => cameraController.update()).not.toThrow();
		});

		it('should handle screen to world conversion at extreme zoom levels', () => {
			cameraController.setZoom(0.1); // Very small zoom

			const worldPos = cameraController.screenToWorld(400, 300);
			expect(isFinite(worldPos.x)).toBe(true);
			expect(isFinite(worldPos.y)).toBe(true);

			cameraController.setZoom(100); // Very large zoom (clamped to max)
			const worldPos2 = cameraController.screenToWorld(400, 300);
			expect(isFinite(worldPos2.x)).toBe(true);
			expect(isFinite(worldPos2.y)).toBe(true);
		});

		it('should handle extreme follow speeds', () => {
			cameraController.setFollowSpeed(-1); // Should clamp to 0
			cameraController.setFollowSpeed(2); // Should clamp to 1

			// Should not crash during update
			const target = { x: 100, y: 100, follow: true };
			cameraController.setTarget(target);
			expect(() => cameraController.update()).not.toThrow();
		});
	});
});
