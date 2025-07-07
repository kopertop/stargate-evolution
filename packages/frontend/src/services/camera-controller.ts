import * as PIXI from 'pixi.js';

import type { Position, ViewportBounds, CameraTarget } from '../types/game-types';

/**
 * CameraController manages the game camera including zoom, centering, and viewport tracking.
 * This centralizes all camera-related operations that were previously scattered in the Game class.
 */
export class CameraController {
	private app: PIXI.Application;
	private world: PIXI.Container;
	private zoom: number;
	private target: CameraTarget | null = null;
	private minZoom: number = 0.2;
	private maxZoom: number = 8.0;
	private zoomSpeed: number = 1.25; // Multiplier for zoom in/out

	// Smooth camera following
	private followSpeed: number = 0.1; // 0 = instant, 1 = never catch up
	private followEnabled: boolean = true;

	constructor(app: PIXI.Application, world: PIXI.Container, initialZoom: number = 2.0) {
		this.app = app;
		this.world = world;
		this.zoom = initialZoom;

		// Apply initial zoom - PIXI expects separate x and y scale values
		this.world.scale.set(this.zoom, this.zoom);

		console.log('[CAMERA] Initialized with zoom:', this.zoom);
	}

	/**
	 * Set the camera zoom level
	 * @param zoom - New zoom level (clamped to min/max bounds)
	 */
	setZoom(zoom: number): void {
		const previousZoom = this.zoom;

		// Handle invalid zoom values - clamp infinities and NaN
		if (isNaN(zoom)) {
			zoom = this.zoom; // Keep current zoom for NaN
		} else if (zoom === Infinity) {
			zoom = this.maxZoom; // Clamp positive infinity to max
		} else if (zoom === -Infinity) {
			zoom = this.minZoom; // Clamp negative infinity to min
		}

		this.zoom = Math.max(this.minZoom, Math.min(zoom, this.maxZoom));

		if (this.zoom !== previousZoom) {
			this.world.scale.set(this.zoom, this.zoom);
			console.log(`[CAMERA] Zoom changed from ${previousZoom.toFixed(2)} to ${this.zoom.toFixed(2)}`);
		}
	}

	/**
	 * Get the current zoom level
	 */
	getZoom(): number {
		return this.zoom;
	}

	/**
	 * Zoom in by the configured zoom speed multiplier
	 */
	zoomIn(): void {
		this.setZoom(this.zoom * this.zoomSpeed);
	}

	/**
	 * Zoom out by the configured zoom speed multiplier
	 */
	zoomOut(): void {
		this.setZoom(this.zoom / this.zoomSpeed);
	}

	/**
	 * Reset zoom to a specific level (default 1.0)
	 * @param resetZoom - Zoom level to reset to
	 */
	resetZoom(resetZoom: number = 1.0): void {
		this.setZoom(resetZoom);
	}

	/**
	 * Set zoom constraints
	 * @param minZoom - Minimum allowed zoom level
	 * @param maxZoom - Maximum allowed zoom level
	 */
	setZoomConstraints(minZoom: number, maxZoom: number): void {
		this.minZoom = Math.max(0.1, minZoom);
		this.maxZoom = Math.min(50.0, maxZoom);

		// Re-apply current zoom to respect new constraints
		this.setZoom(this.zoom);

		console.log(`[CAMERA] Zoom constraints set: ${this.minZoom} - ${this.maxZoom}`);
	}

	/**
	 * Center the camera on a specific world position immediately
	 * @param x - World X coordinate
	 * @param y - World Y coordinate
	 */
	centerOnPosition(x: number, y: number): void {
		const screenCenterX = this.app.screen.width / 2;
		const screenCenterY = this.app.screen.height / 2;

		// Calculate world offset to center the position
		this.world.x = screenCenterX - (x * this.world.scale.x);
		this.world.y = screenCenterY - (y * this.world.scale.y);

		console.log(`[CAMERA] Centered on position (${x.toFixed(1)}, ${y.toFixed(1)})`);
	}

	/**
	 * Set a target for the camera to follow
	 * @param target - Target position and follow settings
	 */
	setTarget(target: CameraTarget | null): void {
		this.target = target;

		if (target) {
			console.log(`[CAMERA] Set follow target at (${target.x.toFixed(1)}, ${target.y.toFixed(1)}) follow: ${target.follow}`);

			// If not following smoothly, center immediately
			if (!target.follow) {
				this.centerOnPosition(target.x, target.y);
			}
		} else {
			console.log('[CAMERA] Cleared follow target');
		}
	}

	/**
	 * Set whether camera following is enabled
	 * @param enabled - Whether to enable smooth camera following
	 */
	setFollowEnabled(enabled: boolean): void {
		this.followEnabled = enabled;
		console.log(`[CAMERA] Follow ${enabled ? 'enabled' : 'disabled'}`);
	}

	/**
	 * Set the follow speed for smooth camera movement
	 * @param speed - Follow speed (0 = instant, 1 = never catch up)
	 */
	setFollowSpeed(speed: number): void {
		this.followSpeed = Math.max(0, Math.min(1, speed));
		console.log(`[CAMERA] Follow speed set to ${this.followSpeed}`);
	}

	/**
	 * Update the camera position (call this every frame)
	 * This handles smooth following of the target
	 */
	update(): void {
		if (!this.target || !this.target.follow || !this.followEnabled) {
			return;
		}

		// Calculate desired camera position
		const screenCenterX = this.app.screen.width / 2;
		const screenCenterY = this.app.screen.height / 2;
		const targetWorldX = screenCenterX - (this.target.x * this.world.scale.x);
		const targetWorldY = screenCenterY - (this.target.y * this.world.scale.y);

		// Smooth interpolation towards target
		if (this.followSpeed >= 1.0) {
			// Instant following
			this.world.x = targetWorldX;
			this.world.y = targetWorldY;
		} else {
			// Smooth following
			this.world.x += (targetWorldX - this.world.x) * this.followSpeed;
			this.world.y += (targetWorldY - this.world.y) * this.followSpeed;
		}
	}

	/**
	 * Get the current viewport bounds in world coordinates
	 * This is useful for fog of war and culling calculations
	 */
	getViewportBounds(): ViewportBounds {
		const screenWidth = this.app.screen.width;
		const screenHeight = this.app.screen.height;
		const worldScale = this.world.scale.x;

		// Convert screen coordinates to world coordinates
		const left = (-this.world.x) / worldScale;
		const right = (screenWidth - this.world.x) / worldScale;
		const top = (-this.world.y) / worldScale;
		const bottom = (screenHeight - this.world.y) / worldScale;

		return { left, right, top, bottom };
	}

	/**
	 * Convert screen coordinates to world coordinates
	 * @param screenX - Screen X coordinate
	 * @param screenY - Screen Y coordinate
	 * @returns World coordinates
	 */
	screenToWorld(screenX: number, screenY: number): Position {
		const worldScale = this.world.scale.x;
		const worldX = (screenX - this.world.x) / worldScale;
		const worldY = (screenY - this.world.y) / worldScale;

		return { x: worldX, y: worldY };
	}

	/**
	 * Convert world coordinates to screen coordinates
	 * @param worldX - World X coordinate
	 * @param worldY - World Y coordinate
	 * @returns Screen coordinates
	 */
	worldToScreen(worldX: number, worldY: number): Position {
		const worldScale = this.world.scale.x;
		const screenX = (worldX * worldScale) + this.world.x;
		const screenY = (worldY * worldScale) + this.world.y;

		return { x: screenX, y: screenY };
	}

	/**
	 * Check if a world position is currently visible on screen
	 * @param worldX - World X coordinate
	 * @param worldY - World Y coordinate
	 * @param margin - Additional margin around screen edges
	 * @returns Whether the position is visible
	 */
	isPositionVisible(worldX: number, worldY: number, margin: number = 0): boolean {
		const screen = this.worldToScreen(worldX, worldY);

		return screen.x >= -margin &&
			   screen.x <= this.app.screen.width + margin &&
			   screen.y >= -margin &&
			   screen.y <= this.app.screen.height + margin;
	}

	/**
	 * Pan the camera by a specific amount in screen pixels
	 * @param deltaX - Horizontal pan distance in screen pixels
	 * @param deltaY - Vertical pan distance in screen pixels
	 */
	pan(deltaX: number, deltaY: number): void {
		this.world.x += deltaX;
		this.world.y += deltaY;

		// Clear target following when manually panning
		if (this.target && this.target.follow) {
			this.target.follow = false;
			console.log('[CAMERA] Disabled target following due to manual pan');
		}
	}

	/**
	 * Get camera debug information
	 * @returns Camera state for debugging
	 */
	getDebugInfo(): {
		zoom: number;
		worldPosition: Position;
		target: CameraTarget | null;
		followEnabled: boolean;
		viewportBounds: ViewportBounds;
		} {
		return {
			zoom: this.zoom,
			worldPosition: { x: this.world.x, y: this.world.y },
			target: this.target,
			followEnabled: this.followEnabled,
			viewportBounds: this.getViewportBounds(),
		};
	}

	/**
	 * Handle window resize by adjusting camera if needed
	 */
	handleResize(): void {
		// Re-center on current target if we have one and it's not following
		if (this.target && !this.target.follow) {
			this.centerOnPosition(this.target.x, this.target.y);
		}

		console.log(`[CAMERA] Handled resize to ${this.app.screen.width}x${this.app.screen.height}`);
	}

	/**
	 * Cleanup camera resources
	 */
	destroy(): void {
		this.target = null;
		console.log('[CAMERA] Camera controller destroyed');
	}
}
