import type { RoomTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';

import type { Position, PlayerState, PlayerPosition } from '../types/game-types';

import type { CollisionSystem } from './collision-system';

/**
 * PlayerController manages the player character including movement, positioning, and state.
 * This centralizes all player-related logic that was previously in the Game class.
 */
export class PlayerController {
	private player: PIXI.Graphics;
	private position: Position = { x: 0, y: 0 };
	private isRunning: boolean = false;
	private wasRunning: boolean = false;
	private currentRoomId: string | null = null;

	// Configuration
	private config = {
		radius: 5,
		baseSpeed: 4,
		speedMultiplier: 5, // Running speed multiplier
		color: 0xFF6600, // Bright orange
		borderColor: 0xFFFFFF, // White border
		innerBorderColor: 0xCC4400, // Inner darker orange ring
		borderWidth: 1,
		innerBorderWidth: 1,
	};

	// Dependencies
	private collisionSystem: CollisionSystem;
	private rooms: RoomTemplate[] = [];

	constructor(collisionSystem: CollisionSystem, config?: Partial<typeof PlayerController.prototype.config>) {
		this.collisionSystem = collisionSystem;

		// Apply configuration overrides
		if (config) {
			this.config = { ...this.config, ...config };
		}

		// Create player graphics
		this.player = this.createPlayerGraphics();

		console.log('[PLAYER] Initialized with radius:', this.config.radius);
	}

	/**
	 * Create the player graphics representation
	 */
	private createPlayerGraphics(): PIXI.Graphics {
		const graphics = new PIXI.Graphics();

		// Main body (orange circle)
		graphics.circle(0, 0, this.config.radius).fill(this.config.color);

		// White border
		graphics.circle(0, 0, this.config.radius)
			.stroke({ color: this.config.borderColor, width: this.config.borderWidth });

		// Inner darker orange ring
		graphics.circle(0, 0, this.config.radius - 2)
			.stroke({ color: this.config.innerBorderColor, width: this.config.innerBorderWidth });

		graphics.x = this.position.x;
		graphics.y = this.position.y;

		console.log('[PLAYER] Created circular player character with radius:', this.config.radius);
		return graphics;
	}

	/**
	 * Get the player's PIXI graphics object for rendering
	 */
	getGraphics(): PIXI.Graphics {
		return this.player;
	}

	/**
	 * Update player position and graphics
	 */
	private updateGraphicsPosition(): void {
		this.player.x = this.position.x;
		this.player.y = this.position.y;
	}

	/**
	 * Set player position directly (for restoration, teleporting, etc.)
	 */
	setPosition(x: number, y: number, roomId?: string): void {
		this.position.x = x;
		this.position.y = y;
		this.currentRoomId = roomId || null;
		this.updateGraphicsPosition();

		console.log(`[PLAYER] Position set to (${x.toFixed(1)}, ${y.toFixed(1)}) in room: ${roomId || 'unknown'}`);
	}

	/**
	 * Get current player position
	 */
	getPosition(): Position {
		return { x: this.position.x, y: this.position.y };
	}

	/**
	 * Get current player position with room info
	 */
	getPlayerPosition(): PlayerPosition {
		return {
			x: this.position.x,
			y: this.position.y,
			roomId: this.currentRoomId || 'unknown',
		};
	}

	/**
	 * Get current player state
	 */
	getState(): PlayerState {
		return {
			position: this.getPlayerPosition(),
			isRunning: this.isRunning,
			speed: this.getCurrentSpeed(),
		};
	}

	/**
	 * Get current movement speed based on running state
	 */
	getCurrentSpeed(): number {
		return this.isRunning ? this.config.baseSpeed * this.config.speedMultiplier : this.config.baseSpeed;
	}

	/**
	 * Update room data for position validation
	 */
	updateRooms(rooms: RoomTemplate[]): void {
		this.rooms = rooms;
		console.log(`[PLAYER] Updated room data: ${rooms.length} rooms`);
	}

	/**
	 * Process movement input and update player position
	 * @param dx - Normalized X movement direction (-1 to 1)
	 * @param dy - Normalized Y movement direction (-1 to 1)
	 * @param isRunning - Whether the player is running
	 * @returns Whether movement was successful
	 */
	processMovement(dx: number, dy: number, isRunning: boolean): boolean {
		if (dx === 0 && dy === 0) {
			this.isRunning = false;
			return false;
		}

		// Update running state
		this.isRunning = isRunning;

		// Log running state changes
		if (isRunning && !this.wasRunning) {
			console.log('[PLAYER] Running mode activated - speed:', this.getCurrentSpeed());
			this.wasRunning = true;
		} else if (!isRunning && this.wasRunning) {
			console.log('[PLAYER] Running mode deactivated - speed:', this.getCurrentSpeed());
			this.wasRunning = false;
		}

		// Normalize movement vector
		const length = Math.sqrt(dx * dx + dy * dy) || 1;
		dx /= length;
		dy /= length;

		// Calculate movement with current speed
		const currentSpeed = this.getCurrentSpeed();
		const newX = this.position.x + dx * currentSpeed;
		const newY = this.position.y + dy * currentSpeed;

		console.log('[PLAYER] Movement input:', {
			dx: dx.toFixed(3),
			dy: dy.toFixed(3),
			speed: currentSpeed,
			isRunning,
			from: { x: this.position.x.toFixed(1), y: this.position.y.toFixed(1) },
			to: { x: newX.toFixed(1), y: newY.toFixed(1) },
		});

		// Check collision and apply movement
		const collisionResult = this.collisionSystem.checkCollision(
			this.position.x,
			this.position.y,
			newX,
			newY,
		);

		// Update position
		const positionChanged = Math.abs(collisionResult.x - this.position.x) > 0.01 ||
							  Math.abs(collisionResult.y - this.position.y) > 0.01;

		this.position.x = collisionResult.x;
		this.position.y = collisionResult.y;
		this.updateGraphicsPosition();

		// Update current room
		this.updateCurrentRoom();

		if (collisionResult.blocked) {
			console.log(`[PLAYER] Movement blocked: ${collisionResult.reason}`);
		}

		return positionChanged;
	}

	/**
	 * Update the current room ID based on player position
	 */
	private updateCurrentRoom(): void {
		const room = this.rooms.find(r =>
			this.position.x >= r.startX && this.position.x <= r.endX &&
			this.position.y >= r.startY && this.position.y <= r.endY,
		);

		const newRoomId = room?.id || null;
		if (newRoomId !== this.currentRoomId) {
			const oldRoomId = this.currentRoomId;
			this.currentRoomId = newRoomId;
			console.log(`[PLAYER] Room changed from '${oldRoomId}' to '${newRoomId}'`);
		}
	}

	/**
	 * Get the room containing the player
	 */
	getCurrentRoom(): RoomTemplate | null {
		return this.rooms.find(r => r.id === this.currentRoomId) || null;
	}

	/**
	 * Get current room ID
	 */
	getCurrentRoomId(): string | null {
		return this.currentRoomId;
	}

	/**
	 * Position player in the starting room (typically origin)
	 */
	positionInStartingRoom(): void {
		this.setPosition(0, 0, undefined);
		console.log('[PLAYER] Positioned at starting location (origin)');
	}

	/**
	 * Find and move player to a safe position in current room
	 * This is used for emergency situations (e.g., stuck in door)
	 */
	moveToSafePosition(): boolean {
		const safePosition = this.collisionSystem.findSafePositionInRoom(this.position.x, this.position.y);

		if (safePosition) {
			this.setPosition(safePosition.x, safePosition.y, this.currentRoomId || undefined);
			console.log(`[PLAYER] Moved to safe position: (${safePosition.x.toFixed(1)}, ${safePosition.y.toFixed(1)})`);
			return true;
		} else {
			console.warn('[PLAYER] Could not find safe position');
			return false;
		}
	}

	/**
	 * Center player in current room
	 */
	centerInCurrentRoom(): boolean {
		const currentRoom = this.getCurrentRoom();
		if (!currentRoom) {
			console.warn('[PLAYER] Cannot center - not in a room');
			return false;
		}

		const centerX = currentRoom.startX + (currentRoom.endX - currentRoom.startX) / 2;
		const centerY = currentRoom.startY + (currentRoom.endY - currentRoom.startY) / 2;

		// Validate that center position is safe
		const collisionResult = this.collisionSystem.checkCollision(
			this.position.x,
			this.position.y,
			centerX,
			centerY,
		);

		if (!collisionResult.blocked) {
			this.setPosition(centerX, centerY, this.currentRoomId || undefined);
			console.log(`[PLAYER] Centered in room: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
			return true;
		} else {
			console.warn('[PLAYER] Cannot center in room - position not safe');
			return false;
		}
	}

	/**
	 * Check if player is within interaction range of a position
	 */
	isWithinRange(targetX: number, targetY: number, range: number): boolean {
		const distance = Math.sqrt(
			(this.position.x - targetX) ** 2 +
			(this.position.y - targetY) ** 2,
		);
		return distance <= range;
	}

	/**
	 * Get distance to a target position
	 */
	getDistanceTo(targetX: number, targetY: number): number {
		return Math.sqrt(
			(this.position.x - targetX) ** 2 +
			(this.position.y - targetY) ** 2,
		);
	}

	/**
	 * Update player configuration
	 */
	updateConfig(newConfig: Partial<typeof PlayerController.prototype.config>): void {
		const oldConfig = { ...this.config };
		this.config = { ...this.config, ...newConfig };

		// If radius changed, update collision system
		if (oldConfig.radius !== this.config.radius) {
			console.log(`[PLAYER] Radius updated from ${oldConfig.radius} to ${this.config.radius}`);
			// The collision system configuration should be updated by the caller
		}

		// If appearance changed, recreate graphics
		const appearanceProps = ['color', 'borderColor', 'innerBorderColor', 'borderWidth', 'innerBorderWidth'] as const;
		const appearanceChanged = appearanceProps.some(prop => oldConfig[prop] !== this.config[prop]);

		if (appearanceChanged || oldConfig.radius !== this.config.radius) {
			const oldGraphics = this.player;
			this.player = this.createPlayerGraphics();

			// If the old graphics had a parent, replace it
			if (oldGraphics.parent) {
				const parent = oldGraphics.parent;
				const index = parent.getChildIndex(oldGraphics);
				parent.removeChild(oldGraphics);
				parent.addChildAt(this.player, index);
			}

			oldGraphics.destroy();
			console.log('[PLAYER] Recreated graphics due to config change');
		}
	}

	/**
	 * Get player debug information
	 */
	getDebugInfo(): {
		position: Position;
		currentRoomId: string | null;
		isRunning: boolean;
		speed: number;
		config: typeof PlayerController.prototype.config;
		} {
		return {
			position: this.getPosition(),
			currentRoomId: this.currentRoomId,
			isRunning: this.isRunning,
			speed: this.getCurrentSpeed(),
			config: { ...this.config },
		};
	}

	/**
	 * Cleanup player resources
	 */
	destroy(): void {
		if (this.player.parent) {
			this.player.parent.removeChild(this.player);
		}
		this.player.destroy();
		console.log('[PLAYER] Player controller destroyed');
	}
}
