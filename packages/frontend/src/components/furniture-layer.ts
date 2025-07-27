import type { RoomFurniture, RoomTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';

import { ElevatorManager } from '../services/elevator-manager';
import { debugLogger } from '../utils/debug-logger';

export interface FurnitureLayerOptions {
    onFurnitureStateChange?: (furnitureId: string, newState: string) => void;
    onElevatorActivation?: (elevatorConfig: ElevatorConfig, currentFloor: number) => void;
}

export interface ElevatorConfig {
    accessibleFloors: number[];
    currentFloor: number;
    targetFloor?: number;
}

export class FurnitureLayer extends PIXI.Container {
	private furniture: RoomFurniture[] = [];
	private rooms: RoomTemplate[] = [];
	private furnitureTextureCache: Record<string, PIXI.Texture> = {};
	private options: FurnitureLayerOptions;
	private renderGeneration: number = 0;
	private elevatorManager: ElevatorManager = new ElevatorManager();

	constructor(options: FurnitureLayerOptions = {}) {
		super();
		this.options = options;
	}

	public setFurniture(furniture: RoomFurniture[]): void {
		this.furniture = furniture;
		this.renderGeneration++; // Invalidate any pending async operations
		this.elevatorManager.updateData(this.rooms, this.furniture);
		this.render();
	}

	/**
	 * Update the elevator manager with all furniture for proper elevator positioning
	 * This ensures elevator positioning works even when only current floor furniture is rendered
	 */
	public updateElevatorManagerWithAllFurniture(allFurniture: RoomFurniture[]): void {
		console.log('[FURNITURE] Updating elevator manager with all furniture:', allFurniture.length, 'items');
		this.elevatorManager.updateData(this.rooms, allFurniture);
	}

	public getFurniture(): RoomFurniture[] {
		return this.furniture;
	}

	public setRooms(rooms: RoomTemplate[]): void {
		this.rooms = rooms;
		this.elevatorManager.updateData(this.rooms, this.furniture);
		this.render();
	}

	public handleFurnitureActivation(playerX: number, playerY: number, currentFloor?: number): void {
		console.log('[FURNITURE] Handling furniture activation at:', { playerX, playerY, currentFloor });
		console.log('[FURNITURE] Available furniture count:', this.furniture.length);

		let closestFurniture: RoomFurniture | null = null;
		let closestDistance = Infinity;
		const interactionRadius = 25;

		for (const furniture of this.furniture) {
			console.log('[FURNITURE] Checking furniture:', furniture.id, 'type:', furniture.furniture_type, 'interactive:', furniture.interactive);
			if (!furniture.interactive) continue;

			const room = this.rooms.find(r => r.id === furniture.room_id);
			if (!room) continue;

			const worldX = (room.startX + (room.endX - room.startX) / 2) + furniture.x;
			const worldY = (room.startY + (room.endY - room.startY) / 2) + furniture.y;

			// Calculate furniture bounding box
			const furnitureLeft = worldX - furniture.width / 2;
			const furnitureRight = worldX + furniture.width / 2;
			const furnitureTop = worldY - furniture.height / 2;
			const furnitureBottom = worldY + furniture.height / 2;

			// Calculate distance from player to furniture bounding box (not center)
			const closestX = Math.max(furnitureLeft, Math.min(playerX, furnitureRight));
			const closestY = Math.max(furnitureTop, Math.min(playerY, furnitureBottom));
			const distance = Math.sqrt(
				Math.pow(playerX - closestX, 2) + Math.pow(playerY - closestY, 2),
			);

			console.log('[FURNITURE] Distance to', furniture.id, ':', distance, 'at position:', { worldX, worldY }, 'bbox:', { left: furnitureLeft, right: furnitureRight, top: furnitureTop, bottom: furnitureBottom });

			if (distance < interactionRadius && distance < closestDistance) {
				closestDistance = distance;
				closestFurniture = furniture;
			}
		}

		if (closestFurniture) {
			console.log('[FURNITURE] Activating furniture:', closestFurniture.id, 'type:', closestFurniture.furniture_type);

			// Handle elevator console activation (support both naming conventions)
			if (closestFurniture.furniture_type === 'elevator_console' || closestFurniture.furniture_type === 'elevator-console') {
				console.log('[FURNITURE] This is an elevator console! Handling elevation activation...');
				this.handleElevatorConsoleActivation(closestFurniture, currentFloor || 0);
				return;
			}

			// Handle other interactive furniture
			if (closestFurniture.interactive) {
				closestFurniture.active = !closestFurniture.active;
				console.log('[FURNITURE] Furniture active state:', closestFurniture.active);
				this.render();

				if (this.options.onFurnitureStateChange) {
					this.options.onFurnitureStateChange(
						closestFurniture.id,
						closestFurniture.active ? 'active' : 'inactive',
					);
				}
			}
		} else {
			console.log('[FURNITURE] No furniture close enough to activate (radius:', interactionRadius + ')');
		}
	}

	public findCollidingFurniture(x: number, y: number, playerRadius: number): RoomFurniture | null {
		for (const furniture of this.furniture) {
			if (!furniture.blocks_movement) continue;

			const room = this.rooms.find(r => r.id === furniture.room_id);
			if (!room) continue;

			const worldX = (room.startX + (room.endX - room.startX) / 2) + furniture.x;
			const worldY = (room.startY + (room.endY - room.startY) / 2) + furniture.y;

			const furnitureLeft = worldX - furniture.width / 2;
			const furnitureRight = worldX + furniture.width / 2;
			const furnitureTop = worldY - furniture.height / 2;
			const furnitureBottom = worldY + furniture.height / 2;

			const circleLeft = x - playerRadius;
			const circleRight = x + playerRadius;
			const circleTop = y - playerRadius;
			const circleBottom = y + playerRadius;

			if (
				circleLeft < furnitureRight &&
                circleRight > furnitureLeft &&
                circleTop < furnitureBottom &&
                circleBottom > furnitureTop
			) {
				return furniture;
			}
		}

		return null;
	}

	private handleElevatorConsoleActivation(elevatorConsole: RoomFurniture, currentFloor: number): void {
		console.log('[ELEVATOR] Activating elevator console:', elevatorConsole.id);

		// Parse elevator configuration from description field
		const elevatorConfig = this.parseElevatorConfiguration(elevatorConsole);
		if (!elevatorConfig) {
			console.warn('[ELEVATOR] No valid elevator configuration found for console:', elevatorConsole.id);
			return;
		}

		// Validate accessibility for all configured floors
		console.log('[ELEVATOR] Before validation - configured floors:', elevatorConfig.accessibleFloors);
		const accessibleFloors = this.validateElevatorAccessibility(elevatorConfig.accessibleFloors);
		console.log('[ELEVATOR] After validation - accessible floors:', accessibleFloors);

		if (accessibleFloors.length === 0) {
			console.warn('[ELEVATOR] No accessible floors found for elevator console:', elevatorConsole.id);
			return;
		}

		// Update configuration with validated accessible floors
		elevatorConfig.accessibleFloors = accessibleFloors;
		elevatorConfig.currentFloor = currentFloor;

		console.log('[ELEVATOR] Opening elevator console with final config:', elevatorConfig);

		// Trigger elevator console modal opening
		if (this.options.onElevatorActivation) {
			this.options.onElevatorActivation(elevatorConfig, currentFloor);
		}
	}

	private parseElevatorConfiguration(elevatorFurniture: RoomFurniture): ElevatorConfig | null {
		try {
			// Debug: Log all rooms and their floor values
			console.log('[ELEVATOR] All rooms in FurnitureLayer:', this.rooms.map(room => ({ id: room.id, name: room.name, floor: room.floor })));

			// Get all available floors from rooms as default accessible floors
			const allFloors = Array.from(new Set(this.rooms.map(room => room.floor))).sort((a, b) => a - b);
			console.log('[ELEVATOR] Default accessible floors (all floors):', allFloors);

			// Try to parse configuration from description field if it exists (optional override)
			if (elevatorFurniture.description) {
				try {
					const config = JSON.parse(elevatorFurniture.description);

					if (config.accessibleFloors && Array.isArray(config.accessibleFloors)) {
						// Validate floor numbers are integers and exist in the game
						const validFloors = config.accessibleFloors.filter((floor: any) =>
							Number.isInteger(floor) && floor >= 0 && allFloors.includes(floor),
						);

						if (validFloors.length > 0) {
							console.log('[ELEVATOR] Using custom accessible floors from description:', validFloors);
							return {
								accessibleFloors: validFloors,
								currentFloor: 0, // Will be set by caller
							};
						}
					}
				} catch (parseError) {
					console.log('[ELEVATOR] Description is not valid JSON, using default floors:', parseError instanceof Error ? parseError.message : String(parseError));
				}
			}

			// Default behavior: all floors are accessible
			console.log('[ELEVATOR] Using default configuration - all floors accessible');
			return {
				accessibleFloors: allFloors,
				currentFloor: 0, // Will be set by caller
			};
		} catch (error) {
			console.error('[ELEVATOR] Failed to create elevator configuration:', error);
			return null;
		}
	}

	private validateElevatorAccessibility(configuredFloors: number[]): number[] {
		// Get all available floors from rooms
		const availableFloors = Array.from(new Set(this.rooms.map(room => room.floor))).sort((a, b) => a - b);

		console.log('[ELEVATOR] Available floors in game:', availableFloors);
		console.log('[ELEVATOR] Configured elevator floors:', configuredFloors);

		// Filter configured floors to only include those that exist in the game
		// Note: We don't require every floor to have its own elevator - you can travel to any existing floor
		const accessibleFloors = configuredFloors.filter(floor => {
			// Check if floor exists
			if (!availableFloors.includes(floor)) {
				console.warn('[ELEVATOR] Floor', floor, 'does not exist in the game');
				return false;
			}

			console.log('[ELEVATOR] Floor', floor, 'is accessible');
			return true;
		});

		console.log('[ELEVATOR] Accessible floors after validation:', accessibleFloors);
		return accessibleFloors;
	}

	public findElevatorPosition(targetFloor: number): { x: number; y: number } | null {
		debugLogger.elevator(`Finding elevator position for floor ${targetFloor} using ElevatorManager`);

		// Use the new elevator manager for more robust positioning
		const elevatorPosition = this.elevatorManager.findBestElevatorPosition(targetFloor);

		if (elevatorPosition) {
			console.log('[ELEVATOR] ElevatorManager found position on floor', targetFloor, 'in room:', elevatorPosition.roomName, 'at:', { x: elevatorPosition.x, y: elevatorPosition.y });
			return { x: elevatorPosition.x, y: elevatorPosition.y };
		}

		console.warn('[ELEVATOR] ElevatorManager could not find position for floor', targetFloor);
		return null;
	}

	private findSafeSpawnPositionInRoom(room: RoomTemplate, targetFloor: number): { x: number; y: number } {
		// Get all furniture in this room on this floor to avoid
		const roomFurniture = this.furniture.filter(f => {
			const furnitureRoom = this.rooms.find(r => r.id === f.room_id);
			return furnitureRoom?.id === room.id && furnitureRoom?.floor === targetFloor;
		});

		const roomWidth = room.endX - room.startX;
		const roomHeight = room.endY - room.startY;
		const margin = 25; // Stay away from walls
		const furnitureBuffer = 15; // Stay away from furniture

		// Try multiple spawn positions in the room
		const candidatePositions = [
			// Center of room
			{ x: (room.startX + room.endX) / 2, y: (room.startY + room.endY) / 2 },
			// Corners with margin
			{ x: room.startX + margin, y: room.startY + margin },
			{ x: room.endX - margin, y: room.startY + margin },
			{ x: room.startX + margin, y: room.endY - margin },
			{ x: room.endX - margin, y: room.endY - margin },
			// Sides
			{ x: room.startX + roomWidth * 0.25, y: room.startY + roomHeight * 0.5 },
			{ x: room.startX + roomWidth * 0.75, y: room.startY + roomHeight * 0.5 },
			{ x: room.startX + roomWidth * 0.5, y: room.startY + roomHeight * 0.25 },
			{ x: room.startX + roomWidth * 0.5, y: room.startY + roomHeight * 0.75 },
		];

		// Find the first position that doesn't conflict with furniture
		for (const position of candidatePositions) {
			let isPositionSafe = true;

			// Check if position conflicts with any furniture
			for (const furniture of roomFurniture) {
				const furnitureWorldX = (room.startX + (room.endX - room.startX) / 2) + furniture.x;
				const furnitureWorldY = (room.startY + (room.endY - room.startY) / 2) + furniture.y;

				const furnitureLeft = furnitureWorldX - furniture.width / 2 - furnitureBuffer;
				const furnitureRight = furnitureWorldX + furniture.width / 2 + furnitureBuffer;
				const furnitureTop = furnitureWorldY - furniture.height / 2 - furnitureBuffer;
				const furnitureBottom = furnitureWorldY + furniture.height / 2 + furnitureBuffer;

				if (position.x >= furnitureLeft && position.x <= furnitureRight &&
					position.y >= furnitureTop && position.y <= furnitureBottom) {
					isPositionSafe = false;
					break;
				}
			}

			if (isPositionSafe) {
				console.log('[ELEVATOR] Found safe spawn position in room', room.name, 'avoiding', roomFurniture.length, 'furniture items');
				return position;
			}
		}

		// Fallback: use room center if no safe position found
		console.log('[ELEVATOR] No completely safe position found, using room center');
		return { x: (room.startX + room.endX) / 2, y: (room.startY + room.endY) / 2 };
	}

	private render(): void {
		this.removeChildren();

		for (const furniture of this.furniture) {
			this.renderFurnitureItem(furniture);
		}
	}

	private renderFurnitureItem(furniture: RoomFurniture): void {
		const room = this.rooms.find(r => r.id === furniture.room_id);
		if (!room) return;

		const worldX = (room.startX + (room.endX - room.startX) / 2) + furniture.x;
		const worldY = (room.startY + (room.endY - room.startY) / 2) + furniture.y;

		let imagePath = '';
		if (furniture.image && typeof furniture.image === 'object') {
			if (furniture.active && furniture.image.active) {
				imagePath = furniture.image.active;
			} else if (furniture.image.default) {
				imagePath = furniture.image.default;
			} else {
				const fallbackKeys = ['broken', 'locked', 'danger'];
				for (const key of fallbackKeys) {
					if (furniture.image[key]) {
						imagePath = furniture.image[key];
						break;
					}
				}
			}
		} else if (typeof furniture.image === 'string') {
			imagePath = furniture.image;
		}

		if (!imagePath) {
			console.warn('[FURNITURE] No image path found for furniture:', furniture.id);
			this.renderFurnitureFallback(furniture, worldX, worldY);
			return;
		}

		if (this.furnitureTextureCache[imagePath]) {
			this.createFurnitureSprite(furniture, worldX, worldY, this.furnitureTextureCache[imagePath]);
		} else {
			// Capture current render generation to detect stale async operations
			const currentGeneration = this.renderGeneration;

			// Use PIXI.Assets.load like in the original code
			PIXI.Assets.load(imagePath).then(texture => {
				// Check if this async operation is still valid (not superseded by newer render)
				if (currentGeneration === this.renderGeneration) {
					this.furnitureTextureCache[imagePath] = texture;
					this.createFurnitureSprite(furniture, worldX, worldY, texture);
				}
			}).catch(error => {
				// Check if this async operation is still valid (not superseded by newer render)
				if (currentGeneration === this.renderGeneration) {
					console.warn(`[FURNITURE] Failed to load furniture image: ${imagePath}`, error);
					this.renderFurnitureFallback(furniture, worldX, worldY);
				}
			});
		}
	}

	private createFurnitureSprite(furniture: RoomFurniture, worldX: number, worldY: number, texture: PIXI.Texture): void {
		const sprite = new PIXI.Sprite(texture);
		sprite.anchor.set(0.5);
		sprite.width = furniture.width;
		sprite.height = furniture.height;
		sprite.x = worldX;
		sprite.y = worldY;
		sprite.rotation = (furniture.rotation * Math.PI) / 180;

		this.addChild(sprite);
		console.log(`[FURNITURE] Rendered furniture sprite: ${furniture.name} at (${worldX}, ${worldY})`);
	}

	private renderFurnitureFallback(furniture: RoomFurniture, worldX: number, worldY: number): void {
		const graphics = new PIXI.Graphics();

		// Create furniture graphics (bright color for visibility, like original code)
		graphics.rect(-furniture.width/2, -furniture.height/2, furniture.width, furniture.height).fill(0x00FF88); // Bright green color
		graphics.rect(-furniture.width/2, -furniture.height/2, furniture.width, furniture.height).stroke({ color: 0xFFFFFF, width: 2 }); // White border

		// Position furniture
		graphics.x = worldX;
		graphics.y = worldY;
		graphics.rotation = (furniture.rotation * Math.PI) / 180;

		this.addChild(graphics);
		console.log(`[FURNITURE] Rendered furniture fallback: ${furniture.name} at (${worldX}, ${worldY})`);
	}

	/**
	 * Get debug information about the elevator manager
	 */
	public getElevatorDebugInfo(): any {
		return this.elevatorManager.getDebugInfo();
	}

	/**
	 * Get floors with elevators
	 */
	public getFloorsWithElevators(): number[] {
		return this.elevatorManager.getFloorsWithElevators();
	}

	/**
	 * Check if a floor has elevators
	 */
	public hasElevatorOnFloor(floor: number): boolean {
		return this.elevatorManager.hasElevatorOnFloor(floor);
	}
}
