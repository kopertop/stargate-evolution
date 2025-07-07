import type { RoomFurniture, DoorTemplate } from '@stargate/common';

import type { Position } from '../types/game-types';
import type { InputCallbacks } from '../types/input-types';

// Import the service types - these would normally be imports but we'll define interfaces for now
interface DoorManager {
	findNearbyDoor(playerX: number, playerY: number, radius: number): DoorTemplate | null;
	activateDoor(door: DoorTemplate): boolean;
}

interface FurnitureRenderer {
	handlePlayerActivation(playerX: number, playerY: number): boolean;
	getFurnitureById(furnitureId: string): RoomFurniture | null;
}

/**
 * InteractionManager handles player interactions with game objects including
 * doors, furniture, and other interactable elements.
 */
export class InteractionManager {
	private doorManager: DoorManager | null = null;
	private furnitureRenderer: FurnitureRenderer | null = null;

	// Interaction configuration
	private config = {
		interactionRadius: 25, // Default interaction range
		maxInteractionDistance: 50, // Maximum distance for any interaction
		interactionPriority: ['doors', 'furniture', 'npcs'], // Priority order for interactions

		// Feedback settings
		showInteractionHints: true,
		hintDisplayDuration: 2000, // ms

		// Interaction types
		interactionTypes: {
			door: { radius: 25, priority: 1 },
			furniture: { radius: 25, priority: 2 },
			npc: { radius: 30, priority: 3 },
			item: { radius: 20, priority: 4 },
		},
	};

	// Interaction state
	private nearbyInteractables: Array<{
		type: string;
		id: string;
		object: any;
		distance: number;
		position: Position;
	}> = [];

	private lastInteractionTime: number = 0;
	private interactionCooldown: number = 200; // ms between interactions

	// Callbacks
	private callbacks: {
		onInteractionStart?: (type: string, id: string, object: any) => void;
		onInteractionEnd?: (type: string, id: string, success: boolean) => void;
		onInteractablesChanged?: (interactables: any[]) => void;
		onInteractionHint?: (message: string, position: Position) => void;
	} = {};

	constructor() {
		console.log('[INTERACTION-MANAGER] Initialized interaction manager');
	}

	/**
	 * Set system references
	 */
	setSystemReferences(systems: {
		doorManager?: DoorManager;
		furnitureRenderer?: FurnitureRenderer;
	}): void {
		this.doorManager = systems.doorManager || null;
		this.furnitureRenderer = systems.furnitureRenderer || null;

		console.log('[INTERACTION-MANAGER] Updated system references');
	}

	/**
	 * Set callbacks for interaction events
	 */
	setCallbacks(callbacks: Partial<typeof InteractionManager.prototype.callbacks>): void {
		this.callbacks = { ...this.callbacks, ...callbacks };
		console.log('[INTERACTION-MANAGER] Updated interaction callbacks');
	}

	/**
	 * Update interaction configuration
	 */
	updateConfig(newConfig: Partial<typeof InteractionManager.prototype.config>): void {
		this.config = { ...this.config, ...newConfig };
		console.log('[INTERACTION-MANAGER] Updated interaction configuration');
	}

	/**
	 * Handle player activation attempt
	 */
	handlePlayerActivation(playerPosition: Position): boolean {
		const now = Date.now();

		// Check interaction cooldown
		if (now - this.lastInteractionTime < this.interactionCooldown) {
			console.log('[INTERACTION-MANAGER] Interaction on cooldown');
			return false;
		}

		// Find the closest interactable
		const closestInteractable = this.findClosestInteractable(playerPosition);

		if (!closestInteractable) {
			console.log('[INTERACTION-MANAGER] No interactables in range');
			return false;
		}

		this.lastInteractionTime = now;

		// Attempt interaction based on type
		return this.performInteraction(closestInteractable, playerPosition);
	}

	/**
	 * Find the closest interactable object
	 */
	private findClosestInteractable(playerPosition: Position): {
		type: string;
		id: string;
		object: any;
		distance: number;
		position: Position;
	} | null {
		// Update nearby interactables first
		this.updateNearbyInteractables(playerPosition);

		if (this.nearbyInteractables.length === 0) {
			return null;
		}

		// Sort by priority and distance
		this.nearbyInteractables.sort((a, b) => {
			const aPriority = (this.config.interactionTypes as any)[a.type]?.priority || 999;
			const bPriority = (this.config.interactionTypes as any)[b.type]?.priority || 999;

			if (aPriority !== bPriority) {
				return aPriority - bPriority; // Lower priority number = higher priority
			}

			return a.distance - b.distance; // Closer = higher priority
		});

		return this.nearbyInteractables[0];
	}

	/**
	 * Update list of nearby interactables
	 */
	updateNearbyInteractables(playerPosition: Position): void {
		const previousCount = this.nearbyInteractables.length;
		this.nearbyInteractables = [];

		// Check doors
		if (this.doorManager) {
			const nearbyDoor = this.doorManager.findNearbyDoor(
				playerPosition.x,
				playerPosition.y,
				this.config.interactionTypes.door.radius,
			);

			if (nearbyDoor) {
				const doorPosition = { x: nearbyDoor.x, y: nearbyDoor.y };
				const distance = this.calculateDistance(playerPosition, doorPosition);

				this.nearbyInteractables.push({
					type: 'door',
					id: nearbyDoor.id,
					object: nearbyDoor,
					distance,
					position: doorPosition,
				});
			}
		}

		// Check furniture - we'll need to implement this when we have access to furniture data
		// For now, we'll use the furnitureRenderer's existing method
		// Note: This is a simplified approach - in a full implementation, we'd scan all furniture

		// Notify if interactables changed
		if (this.nearbyInteractables.length !== previousCount) {
			this.callbacks.onInteractablesChanged?.(this.nearbyInteractables);

			// Show interaction hint for the closest interactable
			if (this.nearbyInteractables.length > 0 && this.config.showInteractionHints) {
				const closest = this.nearbyInteractables[0];
				this.showInteractionHint(closest);
			}
		}
	}

	/**
	 * Perform interaction with an object
	 */
	private performInteraction(interactable: {
		type: string;
		id: string;
		object: any;
		distance: number;
		position: Position;
	}, playerPosition: Position): boolean {
		console.log(`[INTERACTION-MANAGER] Attempting ${interactable.type} interaction with ${interactable.id}`);

		// Notify interaction start
		this.callbacks.onInteractionStart?.(interactable.type, interactable.id, interactable.object);

		let success = false;

		try {
			switch (interactable.type) {
			case 'door': {
				const door = interactable.object as DoorTemplate;
				if (door.state === 'locked') {
					success = this.interactWithDoor(door, playerPosition);
				} else if (door.state === 'closed') {
					success = this.interactWithDoor(door, playerPosition);
				} else {
					success = this.interactWithDoor(door, playerPosition);
				}
				break;
			}

			case 'furniture': {
				const furniture = interactable.object as RoomFurniture;
				success = this.interactWithFurniture(furniture, playerPosition);
				break;
			}

			default:
				console.warn(`[INTERACTION-MANAGER] Unknown interaction type: ${interactable.type}`);
				success = false;
				break;
			}
		} catch (error) {
			console.error(`[INTERACTION-MANAGER] Error during ${interactable.type} interaction:`, error);
			success = false;
		}

		// Notify interaction end
		this.callbacks.onInteractionEnd?.(interactable.type, interactable.id, success);

		return success;
	}

	/**
	 * Interact with a door
	 */
	private interactWithDoor(door: DoorTemplate, playerPosition: Position): boolean {
		if (!this.doorManager) {
			console.warn('[INTERACTION-MANAGER] No door manager available');
			return false;
		}

		const success = this.doorManager.activateDoor(door);

		if (success) {
			console.log(`[INTERACTION-MANAGER] Successfully activated door: ${door.id}`);
		} else {
			console.log(`[INTERACTION-MANAGER] Failed to activate door: ${door.id}`);
		}

		return success;
	}

	/**
	 * Interact with furniture
	 */
	private interactWithFurniture(furniture: RoomFurniture, playerPosition: Position): boolean {
		if (!this.furnitureRenderer) {
			console.warn('[INTERACTION-MANAGER] No furniture renderer available');
			return false;
		}

		const success = this.furnitureRenderer.handlePlayerActivation(playerPosition.x, playerPosition.y);

		if (success) {
			console.log(`[INTERACTION-MANAGER] Successfully activated furniture: ${furniture.id}`);
		} else {
			console.log(`[INTERACTION-MANAGER] Failed to activate furniture: ${furniture.id}`);
		}

		return success;
	}

	/**
	 * Show interaction hint
	 */
	private showInteractionHint(interactable: {
		type: string;
		id: string;
		object: any;
		distance: number;
		position: Position;
	}): void {
		let message = '';

		switch (interactable.type) {
		case 'door': {
			const door = interactable.object as DoorTemplate;
			if (door.state === 'locked') {
				message = `Press E to unlock ${door.id}`;
			} else if (door.state === 'closed') {
				message = `Press E to open ${door.id}`;
			} else {
				message = `Press E to close ${door.id}`;
			}
			break;
		}

		case 'furniture': {
			const furniture = interactable.object as RoomFurniture;
			if (furniture.interactive) {
				message = `Press E to interact with ${furniture.name}`;
			}
			break;
		}

		default:
			message = 'Press E to interact';
			break;
		}

		if (message) {
			this.callbacks.onInteractionHint?.(message, interactable.position);
		}
	}

	/**
	 * Calculate distance between two positions
	 */
	private calculateDistance(pos1: Position, pos2: Position): number {
		return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2);
	}

	/**
	 * Get nearby interactables for external systems
	 */
	getNearbyInteractables(): Array<{
		type: string;
		id: string;
		object: any;
		distance: number;
		position: Position;
	}> {
		return [...this.nearbyInteractables];
	}

	/**
	 * Check if player can interact with anything
	 */
	hasNearbyInteractables(playerPosition: Position): boolean {
		this.updateNearbyInteractables(playerPosition);
		return this.nearbyInteractables.length > 0;
	}

	/**
	 * Get the closest interactable info without performing interaction
	 */
	getClosestInteractable(playerPosition: Position): {
		type: string;
		id: string;
		object: any;
		distance: number;
		position: Position;
	} | null {
		return this.findClosestInteractable(playerPosition);
	}

	/**
	 * Check if interaction is on cooldown
	 */
	isOnCooldown(): boolean {
		const now = Date.now();
		return (now - this.lastInteractionTime) < this.interactionCooldown;
	}

	/**
	 * Get interaction statistics
	 */
	getStats(): {
		nearbyInteractables: number;
		lastInteractionTime: number;
		isOnCooldown: boolean;
		config: typeof InteractionManager.prototype.config;
		} {
		return {
			nearbyInteractables: this.nearbyInteractables.length,
			lastInteractionTime: this.lastInteractionTime,
			isOnCooldown: this.isOnCooldown(),
			config: { ...this.config },
		};
	}

	/**
	 * Clear interaction state
	 */
	clear(): void {
		this.nearbyInteractables = [];
		this.lastInteractionTime = 0;
		console.log('[INTERACTION-MANAGER] Cleared interaction state');
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		this.clear();
		this.doorManager = null;
		this.furnitureRenderer = null;
		this.callbacks = {};
		console.log('[INTERACTION-MANAGER] Interaction manager destroyed');
	}
}
