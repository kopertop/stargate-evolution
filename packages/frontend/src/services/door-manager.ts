import type { DoorTemplate, RoomTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';

import type { Position, DoorState } from '../types/game-types';
import type { LayerManager } from '../types/renderer-types';

/**
 * DoorManager handles all door-related functionality including rendering, state management,
 * player interactions, and collision handling.
 */
export class DoorManager {
	private layerManager: LayerManager;
	private doorsLayer: PIXI.Container;
	private doors: DoorTemplate[] = [];
	private rooms: RoomTemplate[] = [];

	// Door rendering configuration
	private config = {
		colors: {
			opened: 0x00FF00, // Green for open doors
			closed: 0xFF0000, // Red for closed doors
			locked: 0x800000, // Dark red for locked doors
		},
		borderColor: 0xFFFFFF, // White border
		borderWidth: 2,
		interactionRadius: 25, // Distance for player activation
		safeDistance: 15, // Safety margin when pushing player out
	};

	// Callbacks for external systems
	private callbacks: {
		onDoorStateChange?: (doorId: string, newState: string) => void;
		onDoorInteraction?: (doorId: string, isNPC: boolean) => boolean;
		findRoomContainingPoint?: (x: number, y: number) => RoomTemplate | null;
		checkCollision?: (currentX: number, currentY: number, newX: number, newY: number) => Position;
		findSafePosition?: (originalX: number, originalY: number) => Position | null;
	} = {};

	constructor(layerManager: LayerManager) {
		this.layerManager = layerManager;

		// Get or create the doors layer
		this.doorsLayer = this.layerManager.getLayer('doors') || this.layerManager.createLayer('doors', 2);

		console.log('[DOOR-MANAGER] Initialized with doors layer');
	}

	/**
	 * Set callbacks for external system integration
	 */
	setCallbacks(callbacks: Partial<typeof DoorManager.prototype.callbacks>): void {
		this.callbacks = { ...this.callbacks, ...callbacks };
		console.log('[DOOR-MANAGER] Updated system callbacks');
	}

	/**
	 * Update door and room data
	 */
	updateData(doors: DoorTemplate[], rooms: RoomTemplate[]): void {
		this.doors = doors;
		this.rooms = rooms;
		console.log(`[DOOR-MANAGER] Updated data: ${doors.length} doors, ${rooms.length} rooms`);
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<typeof DoorManager.prototype.config>): void {
		this.config = { ...this.config, ...newConfig };
		console.log('[DOOR-MANAGER] Updated configuration');
	}

	/**
	 * Render all doors
	 */
	renderAll(): void {
		if (!this.doorsLayer) return;

		console.log('[DOOR-MANAGER] Rendering all doors...');

		// Clear existing door graphics
		this.doorsLayer.removeChildren();

		// Render each door
		for (const door of this.doors) {
			this.renderDoor(door);
		}

		console.log(`[DOOR-MANAGER] Rendered ${this.doors.length} doors`);
	}

	/**
	 * Render a single door
	 */
	private renderDoor(door: DoorTemplate): void {
		if (!this.doorsLayer) return;

		// Create door graphics
		const doorGraphics = new PIXI.Graphics();

		// Choose color based on door state
		const doorColor = this.config.colors[door.state as keyof typeof this.config.colors] || this.config.colors.closed;

		// Draw door rectangle
		doorGraphics.rect(-door.width/2, -door.height/2, door.width, door.height).fill(doorColor);

		// Add border for visibility
		doorGraphics.rect(-door.width/2, -door.height/2, door.width, door.height)
			.stroke({ color: this.config.borderColor, width: this.config.borderWidth });

		// Position and rotate door
		doorGraphics.x = door.x;
		doorGraphics.y = door.y;
		doorGraphics.rotation = (door.rotation * Math.PI) / 180; // Convert degrees to radians

		this.doorsLayer.addChild(doorGraphics);

		console.log(`[DOOR-MANAGER] Rendered door ${door.id} at (${door.x}, ${door.y}) state: ${door.state}`);
	}

	/**
	 * Handle player interaction with doors
	 */
	handlePlayerActivation(playerX: number, playerY: number): boolean {
		// Find the closest door within interaction range
		let closestDoor: DoorTemplate | null = null;
		let closestDistance = Infinity;

		for (const door of this.doors) {
			const distance = Math.sqrt((playerX - door.x) ** 2 + (playerY - door.y) ** 2);
			if (distance <= this.config.interactionRadius && distance < closestDistance) {
				closestDistance = distance;
				closestDoor = door;
			}
		}

		if (closestDoor) {
			return this.activateDoor(closestDoor.id, false);
		} else {
			console.log('[DOOR-MANAGER] No doors nearby to activate');
			return false;
		}
	}

	/**
	 * Activate a door (open/close)
	 */
	activateDoor(doorId: string, isNPC: boolean = false): boolean {
		const door = this.doors.find(d => d.id === doorId);
		if (!door) {
			console.log('[DOOR-MANAGER] Door not found:', doorId);
			return false;
		}

		// Check if door can be activated
		if (door.state === 'locked') {
			console.log('[DOOR-MANAGER] Cannot activate locked door:', doorId);
			return false;
		}

		// NPC access control
		if (isNPC) {
			// NPCs can only open doors that have been cleared by the user
			if (!door.cleared) {
				console.log('[DOOR-MANAGER] NPC cannot open uncleared door:', doorId);
				return false;
			}
			// NPCs cannot open restricted doors
			if (door.restricted) {
				console.log('[DOOR-MANAGER] NPC cannot open restricted door:', doorId);
				return false;
			}
		}

		// Check power requirements (placeholder for future implementation)
		if (door.power_required > 0) {
			console.log('[DOOR-MANAGER] Door requires power:', door.power_required);
			// TODO: Check if player/ship has enough power
		}

		// Store old state for callback
		const oldState = door.state;

		// Toggle door state
		if (door.state === 'opened') {
			door.state = 'closed';
			console.log('[DOOR-MANAGER] Closed door:', doorId);
		} else if (door.state === 'closed') {
			door.state = 'opened';
			console.log('[DOOR-MANAGER] Opened door:', doorId);

			// Mark door as cleared when user opens it for the first time
			if (!isNPC && !door.cleared) {
				door.cleared = true;
				console.log('[DOOR-MANAGER] Marked door as cleared by user:', doorId);
			}
		}

		// Notify external systems of state change
		if (this.callbacks.onDoorStateChange) {
			this.callbacks.onDoorStateChange(doorId, door.state);
		}

		// Re-render doors to show state change
		this.renderAll();

		return true;
	}

	/**
	 * Set door restriction status
	 */
	setDoorRestricted(doorId: string, restricted: boolean): boolean {
		const door = this.doors.find(d => d.id === doorId);
		if (!door) {
			console.log('[DOOR-MANAGER] Door not found for restriction update:', doorId);
			return false;
		}

		door.restricted = restricted;
		console.log('[DOOR-MANAGER] Set door restriction:', doorId, 'restricted:', restricted);

		// Re-render doors to show potential visual changes
		this.renderAll();
		return true;
	}

	/**
	 * Push player out of door when it closes on them
	 */
	pushPlayerOutOfDoor(door: DoorTemplate, currentPlayerX: number, currentPlayerY: number, playerRadius: number): Position | null {
		// Check if player is actually colliding with the door
		const isColliding = this.isPlayerCollidingWithDoor(currentPlayerX, currentPlayerY, playerRadius, door);
		if (!isColliding) {
			return { x: currentPlayerX, y: currentPlayerY }; // Player not colliding, return current position
		}

		console.log('[DOOR-MANAGER] Player is colliding with door - attempting to push out');

		// Store original position
		const originalPosition = { x: currentPlayerX, y: currentPlayerY };

		// Transform player position to door's local coordinate system
		const dx = currentPlayerX - door.x;
		const dy = currentPlayerY - door.y;

		// Convert door rotation from degrees to radians
		const rotationRad = (door.rotation * Math.PI) / 180;

		// Rotate to get local coordinates
		const cos = Math.cos(-rotationRad);
		const sin = Math.sin(-rotationRad);
		const localX = dx * cos - dy * sin;
		const localY = dx * sin + dy * cos;

		// Calculate door bounds
		const halfWidth = door.width / 2;
		const halfHeight = door.height / 2;

		// Try multiple push directions in order of preference
		const pushAttempts = [
			// Primary direction based on player's relative position
			{
				localX: Math.abs(localX) > Math.abs(localY)
					? (localX > 0 ? halfWidth + this.config.safeDistance : -halfWidth - this.config.safeDistance)
					: localX,
				localY: Math.abs(localX) > Math.abs(localY)
					? localY
					: (localY > 0 ? halfHeight + this.config.safeDistance : -halfHeight - this.config.safeDistance),
				description: 'primary direction',
			},
			// Try all four cardinal directions
			{
				localX: halfWidth + this.config.safeDistance,
				localY: 0,
				description: 'right side',
			},
			{
				localX: -halfWidth - this.config.safeDistance,
				localY: 0,
				description: 'left side',
			},
			{
				localX: 0,
				localY: halfHeight + this.config.safeDistance,
				description: 'bottom side',
			},
			{
				localX: 0,
				localY: -halfHeight - this.config.safeDistance,
				description: 'top side',
			},
		];

		// Try each push direction
		for (const attempt of pushAttempts) {
			// Transform back to world coordinates
			const worldDx = attempt.localX * cos + attempt.localY * sin;
			const worldDy = -attempt.localX * sin + attempt.localY * cos;

			const candidateX = door.x + worldDx;
			const candidateY = door.y + worldDy;

			// Validate the candidate position using collision system
			if (this.callbacks.checkCollision) {
				const validatedPosition = this.callbacks.checkCollision(originalPosition.x, originalPosition.y, candidateX, candidateY);

				// If the validated position is the same as candidate, it's safe
				if (Math.abs(validatedPosition.x - candidateX) < 0.1 &&
					Math.abs(validatedPosition.y - candidateY) < 0.1) {

					console.log(`[DOOR-MANAGER] Successfully pushed player out to ${attempt.description}:`,
						candidateX.toFixed(1), candidateY.toFixed(1));
					return { x: candidateX, y: candidateY };
				}
			} else {
				// No collision callback available - just return the first candidate position for testing
				console.log(`[DOOR-MANAGER] No collision callback - returning candidate position for ${attempt.description}:`,
					candidateX.toFixed(1), candidateY.toFixed(1));
				return { x: candidateX, y: candidateY };
			}
		}

		// If all push attempts failed, try to find a safe position
		if (this.callbacks.findSafePosition) {
			const safePosition = this.callbacks.findSafePosition(originalPosition.x, originalPosition.y);
			if (safePosition) {
				console.log('[DOOR-MANAGER] Moved player to emergency safe position:',
					safePosition.x.toFixed(1), safePosition.y.toFixed(1));
				return safePosition;
			}
		}

		// All attempts failed
		console.error('[DOOR-MANAGER] Failed to find safe position for player push');
		return null;
	}

	/**
	 * Check if player is colliding with a specific door
	 */
	isPlayerCollidingWithDoor(playerX: number, playerY: number, playerRadius: number, door: DoorTemplate): boolean {
		// Transform player position to door's local coordinate system to handle rotation
		const dx = playerX - door.x;
		const dy = playerY - door.y;

		// Convert door rotation from degrees to radians
		const rotationRad = (door.rotation * Math.PI) / 180;

		// Rotate the player position by the negative door rotation to get local coordinates
		const cos = Math.cos(-rotationRad);
		const sin = Math.sin(-rotationRad);
		const localX = dx * cos - dy * sin;
		const localY = dx * sin + dy * cos;

		// Check collision with door's local bounding box
		const halfWidth = door.width / 2;
		const halfHeight = door.height / 2;

		// Find closest point on the door rectangle to the player circle center
		const closestX = Math.max(-halfWidth, Math.min(localX, halfWidth));
		const closestY = Math.max(-halfHeight, Math.min(localY, halfHeight));

		// Calculate distance from player center to closest point on door
		const distance = Math.sqrt((localX - closestX) ** 2 + (localY - closestY) ** 2);

		return distance <= playerRadius;
	}

	/**
	 * Find door between two rooms
	 */
	findDoorBetweenRooms(roomId1: string, roomId2: string): DoorTemplate | null {
		return this.doors.find(door =>
			(door.from_room_id === roomId1 && door.to_room_id === roomId2) ||
			(door.from_room_id === roomId2 && door.to_room_id === roomId1),
		) || null;
	}

	/**
	 * Find door by ID
	 */
	getDoorById(doorId: string): DoorTemplate | null {
		return this.doors.find(door => door.id === doorId) || null;
	}

	/**
	 * Get all door states for persistence
	 */
	getDoorStates(): DoorState[] {
		return this.doors.map(door => ({
			id: door.id,
			state: door.state,
			from_room_id: door.from_room_id,
			to_room_id: door.to_room_id,
			x: door.x,
			y: door.y,
			width: door.width,
			height: door.height,
			rotation: door.rotation,
			is_automatic: door.is_automatic,
			open_direction: door.open_direction,
			style: door.style,
			color: door.color,
			requirements: door.requirements,
			power_required: door.power_required,
			cleared: door.cleared,
			restricted: door.restricted,
		}));
	}

	/**
	 * Restore door states from saved data
	 */
	restoreDoorStates(doorStates: DoorState[]): void {
		console.log('[DOOR-MANAGER] Restoring door states:', doorStates.length, 'doors');

		let restoredCount = 0;
		let skippedCount = 0;

		for (const savedDoor of doorStates) {
			const doorIndex = this.doors.findIndex(d => d.id === savedDoor.id);
			if (doorIndex !== -1) {
				// Update the door state
				this.doors[doorIndex] = { ...this.doors[doorIndex], ...savedDoor };
				restoredCount++;
				console.log('[DOOR-MANAGER] Restored door state:', savedDoor.id, 'state:', savedDoor.state);
			} else {
				skippedCount++;
				console.log('[DOOR-MANAGER] Skipped missing door:', savedDoor.id);
			}
		}

		console.log(`[DOOR-MANAGER] Door restoration complete: ${restoredCount} restored, ${skippedCount} skipped`);

		// Re-render doors to reflect state changes
		this.renderAll();
	}

	/**
	 * Get door restriction information
	 */
	getDoorRestrictions(): { doorId: string; restricted: boolean; cleared: boolean }[] {
		return this.doors.map(door => ({
			doorId: door.id,
			restricted: door.restricted || false,
			cleared: door.cleared || false,
		}));
	}

	/**
	 * Clear all rendered doors
	 */
	clear(): void {
		if (this.doorsLayer) {
			this.doorsLayer.removeChildren();
		}
		// Also clear the doors data array
		this.doors = [];
		console.log('[DOOR-MANAGER] Cleared all door graphics');
	}

	/**
	 * Show/hide door layer
	 */
	setVisible(visible: boolean): void {
		this.layerManager.setLayerVisibility('doors', visible);
		console.log(`[DOOR-MANAGER] Set doors layer visibility: ${visible}`);
	}

	/**
	 * Get door management statistics
	 */
	getStats(): {
		totalDoors: number;
		doorsByState: Record<string, number>;
		doorsLayer: string;
		config: typeof DoorManager.prototype.config;
		} {
		const doorsByState: Record<string, number> = {};
		for (const door of this.doors) {
			doorsByState[door.state] = (doorsByState[door.state] || 0) + 1;
		}

		return {
			totalDoors: this.doors.length,
			doorsByState,
			doorsLayer: this.doorsLayer ? 'available' : 'missing',
			config: { ...this.config },
		};
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.clear();
		this.doors = [];
		this.rooms = [];
		this.callbacks = {};
		console.log('[DOOR-MANAGER] Door manager destroyed');
	}
}
