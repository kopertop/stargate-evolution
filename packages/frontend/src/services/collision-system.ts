import type { RoomTemplate, DoorTemplate, RoomFurniture } from '@stargate/common';

import type { Position, CollisionResult } from '../types/game-types';

export interface CollisionConfig {
	playerRadius: number;
	wallThreshold: number;
	doorTolerance: number;
}

export interface CollisionContext {
	rooms: RoomTemplate[];
	doors: DoorTemplate[];
	furniture: RoomFurniture[];
}

/**
 * CollisionSystem handles all collision detection in the game.
 * This includes room boundaries, doors, furniture, and safe position calculations.
 */
export class CollisionSystem {
	private config: CollisionConfig;
	private rooms: RoomTemplate[] = [];
	private doors: DoorTemplate[] = [];
	private furniture: RoomFurniture[] = [];

	constructor(config: Partial<CollisionConfig> = {}) {
		this.config = {
			playerRadius: 5,
			wallThreshold: 8,
			doorTolerance: 15,
			...config,
		};
		console.log('[COLLISION] Initialized with player radius:', this.config.playerRadius, 'wall threshold:', this.config.wallThreshold);
	}

	/**
	 * Update the game entities used for collision detection
	 */
	updateEntities(rooms: RoomTemplate[], doors: DoorTemplate[], furniture: RoomFurniture[]): void {
		this.rooms = rooms;
		this.doors = doors;
		this.furniture = furniture;
		console.log(`[COLLISION] Updated entities: ${rooms.length} rooms, ${doors.length} doors, ${furniture.length} furniture`);
	}

	/**
	 * Update collision configuration
	 */
	updateConfig(config: Partial<CollisionConfig>): void {
		this.config = { ...this.config, ...config };
		console.log('[COLLISION] Updated config - player radius:', this.config.playerRadius, 'wall threshold:', this.config.wallThreshold);
	}

	/**
	 * Main collision detection method - supports both internal entities and external context
	 * @param currentX - Current player X position
	 * @param currentY - Current player Y position
	 * @param newX - Intended new X position
	 * @param newY - Intended new Y position
	 * @param playerRadius - Optional player radius override
	 * @param rooms - Optional rooms array override
	 * @param doors - Optional doors array override 
	 * @param furniture - Optional furniture array override
	 * @param wallThreshold - Optional wall threshold override
	 * @returns Final allowed position after collision checks
	 */
	checkCollision(
		currentX: number,
		currentY: number,
		newX: number,
		newY: number,
		playerRadius?: number,
		rooms?: RoomTemplate[],
		doors?: DoorTemplate[],
		furniture?: RoomFurniture[],
		wallThreshold?: number,
	): Position;
	checkCollision(
		currentX: number,
		currentY: number,
		newX: number,
		newY: number,
		context?: CollisionContext,
	): CollisionResult;
	checkCollision(
		currentX: number,
		currentY: number,
		newX: number,
		newY: number,
		playerRadiusOrContext?: number | CollisionContext,
		rooms?: RoomTemplate[],
		doors?: DoorTemplate[],
		furniture?: RoomFurniture[],
		wallThreshold?: number,
	): Position | CollisionResult {
		// Handle different parameter signatures
		let context: CollisionContext | undefined;
		let effectivePlayerRadius = this.config.playerRadius;
		let effectiveWallThreshold = this.config.wallThreshold;
		let returnFullResult = false;

		if (typeof playerRadiusOrContext === 'object') {
			// Called with CollisionContext - return full result
			context = playerRadiusOrContext;
			returnFullResult = true;
		} else {
			// Called with individual parameters - return simple position
			if (typeof playerRadiusOrContext === 'number') {
				effectivePlayerRadius = playerRadiusOrContext;
			}
			if (wallThreshold !== undefined) {
				effectiveWallThreshold = wallThreshold;
			}
			context = {
				rooms: rooms || this.rooms,
				doors: doors || this.doors,
				furniture: furniture || this.furniture,
			};
		}

		// Use provided context or internal entities
		const roomsToUse = context?.rooms || this.rooms;
		const doorsToUse = context?.doors || this.doors;
		const furnitureToUse = context?.furniture || this.furniture;

		// Special case: if there are no rooms at all, block all movement
		if (roomsToUse.length === 0) {
			console.log('[COLLISION] Blocked movement - no rooms available');
			const blockedResult = { x: currentX, y: currentY, blocked: true, reason: 'no_rooms' };
			return returnFullResult ? blockedResult : { x: currentX, y: currentY };
		}

		// Check room boundaries - player must stay within accessible rooms with wall threshold
		const currentRoom = this.findRoomContainingPoint(currentX, currentY, roomsToUse);
		const targetRoom = this.findRoomContainingPoint(newX, newY, roomsToUse);
		const targetRoomSafe = this.findRoomContainingPointWithThreshold(newX, newY, effectiveWallThreshold, roomsToUse);

		// If moving between rooms, check if there's a valid door passage
		if (currentRoom && targetRoom && currentRoom.id !== targetRoom.id) {
			const doorBetweenRooms = this.findDoorBetweenRooms(currentRoom.id, targetRoom.id, doorsToUse);
			if (!doorBetweenRooms || doorBetweenRooms.state !== 'opened') {
				// No open door between rooms - block movement
				console.log('[COLLISION] Blocked movement between rooms - no open door');
				const blockedResult = { x: currentX, y: currentY, blocked: true, reason: 'no_door_between_rooms' };
				return returnFullResult ? blockedResult : { x: currentX, y: currentY };
			}

			// Check if the player is actually passing through the door opening
			if (!this.isPassingThroughDoor(currentX, currentY, newX, newY, doorBetweenRooms)) {
				// Player is trying to cross room boundary outside of door - block movement
				console.log('[COLLISION] Blocked movement - not passing through door opening');
				const blockedResult = { x: currentX, y: currentY, blocked: true, reason: 'not_through_door' };
				return returnFullResult ? blockedResult : { x: currentX, y: currentY };
			}
		}

		// If moving completely outside any room, block movement
		if (currentRoom && !targetRoom) {
			console.log('[COLLISION] Blocked movement - completely outside room boundaries');
			const blockedResult = { x: currentX, y: currentY, blocked: true, reason: 'outside_room' };
			return returnFullResult ? blockedResult : { x: currentX, y: currentY };
		}

		// If moving to an area that's too close to walls (outside safe zone), block movement
		if (currentRoom && targetRoom && !targetRoomSafe) {
			// Check if we're near an open door - doors allow closer approach to walls
			const nearbyOpenDoor = this.findNearbyOpenDoor(newX, newY, effectivePlayerRadius + 10, doorsToUse);
			if (!nearbyOpenDoor) {
				// Not near an open door and too close to walls - hard stop at current position
				console.log('[COLLISION] Blocked movement - too close to walls (within', effectiveWallThreshold, 'px threshold)');
				const blockedResult = { x: currentX, y: currentY, blocked: true, reason: 'too_close_to_walls' };
				return returnFullResult ? blockedResult : { x: currentX, y: currentY };
			}
		}

		// Check furniture collisions
		const collidingFurniture = this.findCollidingFurniture(newX, newY, effectivePlayerRadius, furnitureToUse, roomsToUse);
		if (collidingFurniture) {
			console.log('[COLLISION] Blocked by furniture:', collidingFurniture.name);
			const blockedResult = { x: currentX, y: currentY, blocked: true, reason: 'furniture_collision', entity: collidingFurniture };
			return returnFullResult ? blockedResult : { x: currentX, y: currentY };
		}

		// Check door collisions (closed doors block movement)
		const collidingDoor = this.findCollidingDoor(newX, newY, effectivePlayerRadius, doorsToUse);
		if (collidingDoor && collidingDoor.state !== 'opened') {
			console.log('[COLLISION] Blocked by closed door');
			const blockedResult = { x: currentX, y: currentY, blocked: true, reason: 'door_collision', entity: collidingDoor };
			return returnFullResult ? blockedResult : { x: currentX, y: currentY };
		}

		// No collision detected
		const successResult = { x: newX, y: newY, blocked: false };
		return returnFullResult ? successResult : { x: newX, y: newY };
	}

	/**
	 * Find the room containing a specific point
	 */
	findRoomContainingPoint(x: number, y: number, rooms?: RoomTemplate[]): RoomTemplate | null {
		const roomsToSearch = rooms || this.rooms;
		return roomsToSearch.find(room =>
			x >= room.startX && x <= room.endX &&
			y >= room.startY && y <= room.endY,
		) || null;
	}

	/**
	 * Find room containing point with wall threshold buffer
	 */
	findRoomContainingPointWithThreshold(x: number, y: number, threshold: number, rooms?: RoomTemplate[]): RoomTemplate | null {
		const roomsToSearch = rooms || this.rooms;
		return roomsToSearch.find(room =>
			x >= room.startX + threshold && x <= room.endX - threshold &&
			y >= room.startY + threshold && y <= room.endY - threshold,
		) || null;
	}

	/**
	 * Find door between two rooms
	 */
	findDoorBetweenRooms(roomId1: string, roomId2: string, doors?: DoorTemplate[]): DoorTemplate | null {
		const doorsToSearch = doors || this.doors;
		return doorsToSearch.find(door =>
			(door.from_room_id === roomId1 && door.to_room_id === roomId2) ||
			(door.from_room_id === roomId2 && door.to_room_id === roomId1),
		) || null;
	}

	/**
	 * Check if movement path passes through a door opening
	 */
	isPassingThroughDoor(currentX: number, currentY: number, newX: number, newY: number, door: DoorTemplate): boolean {
		const { playerRadius, doorTolerance } = this.config;

		// Check if either current position or new position is within the door area
		const currentNearDoor = this.isPointNearDoor(currentX, currentY, door, playerRadius + doorTolerance);
		const newNearDoor = this.isPointNearDoor(newX, newY, door, playerRadius + doorTolerance);

		// Player must be moving through the door area (either starting near it or ending near it)
		return currentNearDoor || newNearDoor;
	}

	/**
	 * Check if a point is near a door (accounting for rotation)
	 */
	isPointNearDoor(x: number, y: number, door: DoorTemplate, tolerance: number): boolean {
		// Transform point to door's local coordinate system to handle rotation
		const dx = x - door.x;
		const dy = y - door.y;

		// Convert door rotation from degrees to radians
		const rotationRad = (door.rotation * Math.PI) / 180;

		// Rotate the point by the negative door rotation to get local coordinates
		const cos = Math.cos(-rotationRad);
		const sin = Math.sin(-rotationRad);
		const localX = dx * cos - dy * sin;
		const localY = dx * sin + dy * cos;

		// Check if point is within the door's local bounding box plus tolerance
		const halfWidth = door.width / 2 + tolerance;
		const halfHeight = door.height / 2 + tolerance;

		return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
	}

	/**
	 * Find nearby open door within radius
	 */
	findNearbyOpenDoor(x: number, y: number, radius: number, doors?: DoorTemplate[]): DoorTemplate | null {
		const doorsToSearch = doors || this.doors;
		return doorsToSearch.find(door => {
			if (door.state !== 'opened') return false;
			const distance = Math.sqrt((x - door.x) ** 2 + (y - door.y) ** 2);
			return distance <= radius;
		}) || null;
	}

	/**
	 * Find furniture that collides with a position
	 */
	findCollidingFurniture(x: number, y: number, playerRadius: number, furnitureItems?: RoomFurniture[], rooms?: RoomTemplate[]): RoomFurniture | null {
		const roomsToSearch = rooms || this.rooms;
		const furnitureToSearch = furnitureItems || this.furniture;
		for (const furniture of furnitureToSearch) {
			if (!furniture.blocks_movement) continue;

			// Find the room this furniture belongs to
			const room = roomsToSearch.find(r => r.id === furniture.room_id);
			if (!room) continue;

			// Calculate furniture world position
			const roomCenterX = room.startX + (room.endX - room.startX) / 2;
			const roomCenterY = room.startY + (room.endY - room.startY) / 2;
			const furnitureWorldX = roomCenterX + furniture.x;
			const furnitureWorldY = roomCenterY + furniture.y;

			// Check collision with furniture bounding box
			const furnitureLeft = furnitureWorldX - furniture.width / 2;
			const furnitureRight = furnitureWorldX + furniture.width / 2;
			const furnitureTop = furnitureWorldY - furniture.height / 2;
			const furnitureBottom = furnitureWorldY + furniture.height / 2;

			// Check if player circle intersects with furniture rectangle
			const closestX = Math.max(furnitureLeft, Math.min(x, furnitureRight));
			const closestY = Math.max(furnitureTop, Math.min(y, furnitureBottom));
			const distance = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);

			if (distance <= playerRadius) {
				return furniture;
			}
		}
		return null;
	}

	/**
	 * Find door that collides with a position (accounting for rotation)
	 */
	findCollidingDoor(x: number, y: number, playerRadius: number, doors?: DoorTemplate[]): DoorTemplate | null {
		const doorsToSearch = doors || this.doors;
		for (const door of doorsToSearch) {
			// Transform player position to door's local coordinate system to handle rotation
			const dx = x - door.x;
			const dy = y - door.y;

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

			if (distance <= playerRadius) {
				return door;
			}
		}
		return null;
	}

	/**
	 * Find a safe position within a room (used for emergency player placement)
	 * @param originalX - Current player X position
	 * @param originalY - Current player Y position
	 * @returns Safe position coordinates or null if none found
	 */
	findSafePositionInRoom(originalX: number, originalY: number): Position | null {
		const currentRoom = this.findRoomContainingPoint(originalX, originalY);
		if (!currentRoom) return null;

		const safeThreshold = 15; // Larger threshold for safety
		const stepSize = 10; // Grid step size for testing positions

		// Calculate safe bounds within the room
		const safeStartX = currentRoom.startX + safeThreshold;
		const safeEndX = currentRoom.endX - safeThreshold;
		const safeStartY = currentRoom.startY + safeThreshold;
		const safeEndY = currentRoom.endY - safeThreshold;

		// Try positions in a spiral pattern starting from room center
		const roomCenterX = currentRoom.startX + (currentRoom.endX - currentRoom.startX) / 2;
		const roomCenterY = currentRoom.startY + (currentRoom.endY - currentRoom.startY) / 2;

		// Test positions in expanding rings around the center
		const maxRadius = Math.max(currentRoom.endX - currentRoom.startX, currentRoom.endY - currentRoom.startY) / 2;

		for (let radius = 0; radius < maxRadius; radius += stepSize) {
			const testPositions = [];

			if (radius === 0) {
				// Test center position first
				testPositions.push({ x: roomCenterX, y: roomCenterY });
			} else {
				// Test positions in a circle around the center
				const numSteps = Math.max(8, Math.floor(radius / stepSize * 2));
				for (let i = 0; i < numSteps; i++) {
					const angle = (i / numSteps) * 2 * Math.PI;
					const testX = roomCenterX + Math.cos(angle) * radius;
					const testY = roomCenterY + Math.sin(angle) * radius;

					// Keep within room bounds
					if (testX >= safeStartX && testX <= safeEndX && testY >= safeStartY && testY <= safeEndY) {
						testPositions.push({ x: testX, y: testY });
					}
				}
			}

			// Test each position
			for (const testPos of testPositions) {
				const collisionResult = this.checkCollision(originalX, originalY, testPos.x, testPos.y);

				// If no collision, this position is safe
				if (!collisionResult.blocked &&
					Math.abs(collisionResult.x - testPos.x) < 0.1 &&
					Math.abs(collisionResult.y - testPos.y) < 0.1) {

					console.log(`[COLLISION] Found safe position at radius ${radius}:`, testPos.x.toFixed(1), testPos.y.toFixed(1));
					return { x: testPos.x, y: testPos.y };
				}
			}
		}

		console.log('[COLLISION] No safe position found in room');
		return null;
	}

	/**
	 * Check if a position is safe (no collisions)
	 */
	isPositionSafe(x: number, y: number): boolean {
		// Check if point is in a safe area of a room
		const room = this.findRoomContainingPointWithThreshold(x, y, this.config.wallThreshold);
		if (!room) return false;

		// Check furniture collisions
		if (this.findCollidingFurniture(x, y, this.config.playerRadius)) return false;

		// Check door collisions
		const collidingDoor = this.findCollidingDoor(x, y, this.config.playerRadius);
		if (collidingDoor && collidingDoor.state !== 'opened') return false;

		return true;
	}

	/**
	 * Get collision system debug information
	 */
	getDebugInfo(): {
		entityCounts: { rooms: number; doors: number; furniture: number };
		config: { playerRadius: number; wallThreshold: number };
		} {
		return {
			entityCounts: {
				rooms: this.rooms.length,
				doors: this.doors.length,
				furniture: this.furniture.length,
			},
			config: {
				playerRadius: this.config.playerRadius,
				wallThreshold: this.config.wallThreshold,
			},
		};
	}

	/**
	 * Get current collision configuration
	 */
	getConfig(): CollisionConfig {
		return { ...this.config };
	}

	/**
	 * Convenience method for simple collision checking that only returns position
	 * This maintains backward compatibility with the original Game class API
	 */
	checkCollisionSimple(
		currentX: number,
		currentY: number,
		newX: number,
		newY: number,
		context?: CollisionContext,
	): Position {
		const result = this.checkCollision(currentX, currentY, newX, newY, context);
		return { x: result.x, y: result.y };
	}
}
