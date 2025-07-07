import type { RoomTemplate, DoorTemplate, RoomFurniture } from '@stargate/common';
import { describe, it, expect, beforeEach } from 'vitest';

import { CollisionSystem } from '../collision-system';

describe('CollisionSystem', () => {
	let collisionSystem: CollisionSystem;
	let mockRooms: RoomTemplate[];
	let mockDoors: DoorTemplate[];
	let mockFurniture: RoomFurniture[];

	beforeEach(() => {
		collisionSystem = new CollisionSystem();

		// Create mock rooms
		mockRooms = [
			{
				id: 'room1',
				layout_id: 'layout1',
				name: 'Room 1',
				type: 'standard',
				startX: 0,
				startY: 0,
				endX: 100,
				endY: 100,
				floor: 1,
				description: 'Test room 1',
				image: null,
				found: true,
				locked: false,
				explored: false,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
			{
				id: 'room2',
				layout_id: 'layout1',
				name: 'Room 2',
				type: 'standard',
				startX: 100,
				startY: 0,
				endX: 200,
				endY: 100,
				floor: 1,
				description: 'Test room 2',
				image: null,
				found: true,
				locked: false,
				explored: false,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
		];

		// Create mock doors
		mockDoors = [
			{
				id: 'door1',
				from_room_id: 'room1',
				to_room_id: 'room2',
				x: 100,
				y: 50,
				width: 10,
				height: 30,
				rotation: 0,
				state: 'closed',
				is_automatic: false,
				open_direction: 'inward',
				style: 'standard',
				color: '#808080',
				requirements: null,
				power_required: 0,
				cleared: false,
				restricted: false,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
		];

		// Create mock furniture
		mockFurniture = [
			{
				id: 'furniture1',
				room_id: 'room1',
				name: 'Table',
				type: 'table',
				x: 25,
				y: 25,
				width: 20,
				height: 15,
				rotation: 0,
				interactive: false,
				blocks_movement: true,
				active: false,
				image: null,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
		];
	});

	describe('room collision detection', () => {
		it('should find room containing a point', () => {
			const room = collisionSystem.findRoomContainingPoint(50, 50, mockRooms);
			expect(room).toBeDefined();
			expect(room?.id).toBe('room1');
		});

		it('should return null for point outside all rooms', () => {
			const room = collisionSystem.findRoomContainingPoint(300, 300, mockRooms);
			expect(room).toBeNull();
		});

		it('should find room with threshold', () => {
			const room = collisionSystem.findRoomContainingPointWithThreshold(10, 10, 5, mockRooms);
			expect(room).toBeDefined();
			expect(room?.id).toBe('room1');
		});

		it('should return null when point is too close to walls', () => {
			const room = collisionSystem.findRoomContainingPointWithThreshold(5, 5, 10, mockRooms);
			expect(room).toBeNull();
		});

		it('should handle edge of room boundaries', () => {
			// Test exact boundaries
			const roomOnEdge = collisionSystem.findRoomContainingPoint(100, 50, mockRooms);
			expect(roomOnEdge?.id).toBe('room1'); // Should be in room1 (at endX)

			const roomJustInside = collisionSystem.findRoomContainingPoint(99, 50, mockRooms);
			expect(roomJustInside?.id).toBe('room1');

			const roomJustOutside = collisionSystem.findRoomContainingPoint(101, 50, mockRooms);
			expect(roomJustOutside?.id).toBe('room2');
		});
	});

	describe('door collision detection', () => {
		it('should find door between rooms', () => {
			const door = collisionSystem.findDoorBetweenRooms('room1', 'room2', mockDoors);
			expect(door).toBeDefined();
			expect(door?.id).toBe('door1');
		});

		it('should find door regardless of room order', () => {
			const door = collisionSystem.findDoorBetweenRooms('room2', 'room1', mockDoors);
			expect(door).toBeDefined();
			expect(door?.id).toBe('door1');
		});

		it('should return null for rooms with no connecting door', () => {
			const door = collisionSystem.findDoorBetweenRooms('room1', 'nonexistent', mockDoors);
			expect(door).toBeNull();
		});

		it('should detect collision with door', () => {
			const playerRadius = 5;
			const collidingDoor = collisionSystem.findCollidingDoor(100, 50, playerRadius, mockDoors);
			expect(collidingDoor).toBeDefined();
			expect(collidingDoor?.id).toBe('door1');
		});

		it('should not detect collision when player is far from door', () => {
			const playerRadius = 5;
			const collidingDoor = collisionSystem.findCollidingDoor(50, 50, playerRadius, mockDoors);
			expect(collidingDoor).toBeNull();
		});

		it('should handle rotated doors', () => {
			const rotatedDoor = { ...mockDoors[0], rotation: 90 };
			const doors = [rotatedDoor];

			const playerRadius = 5;
			const collidingDoor = collisionSystem.findCollidingDoor(100, 50, playerRadius, doors);
			expect(collidingDoor).toBeDefined();
		});

		it('should find nearby open doors', () => {
			const openDoor = { ...mockDoors[0], state: 'opened' as const };
			const doors = [openDoor];

			const nearbyDoor = collisionSystem.findNearbyOpenDoor(100, 50, 20, doors);
			expect(nearbyDoor).toBeDefined();
			expect(nearbyDoor?.id).toBe('door1');
		});

		it('should not find nearby closed doors', () => {
			const nearbyDoor = collisionSystem.findNearbyOpenDoor(100, 50, 20, mockDoors);
			expect(nearbyDoor).toBeNull();
		});

		it('should check if player is passing through door', () => {
			const isPassingThrough = collisionSystem.isPassingThroughDoor(
				95, 50, // current position
				105, 50, // new position
				mockDoors[0],
			);
			expect(isPassingThrough).toBe(true);
		});

		it('should detect when player is not passing through door', () => {
			const isPassingThrough = collisionSystem.isPassingThroughDoor(
				50, 50, // current position
				60, 50, // new position
				mockDoors[0],
			);
			expect(isPassingThrough).toBe(false);
		});

		it('should check if point is near door', () => {
			const tolerance = 10;
			const isNear = collisionSystem.isPointNearDoor(105, 50, mockDoors[0], tolerance);
			expect(isNear).toBe(true);
		});

		it('should handle door rotation in point-near-door check', () => {
			const rotatedDoor = { ...mockDoors[0], rotation: 45 };
			const tolerance = 10;
			const isNear = collisionSystem.isPointNearDoor(105, 50, rotatedDoor, tolerance);
			expect(isNear).toBe(true);
		});
	});

	describe('furniture collision detection', () => {
		it('should find colliding furniture', () => {
			const playerRadius = 5;
			// Player at furniture position (room center + furniture offset)
			const roomCenterX = 50; // (0 + 100) / 2
			const roomCenterY = 50; // (0 + 100) / 2
			const furnitureWorldX = roomCenterX + 25; // 75
			const furnitureWorldY = roomCenterY + 25; // 75

			const collidingFurniture = collisionSystem.findCollidingFurniture(
				furnitureWorldX, furnitureWorldY, playerRadius, mockFurniture, mockRooms,
			);
			expect(collidingFurniture).toBeDefined();
			expect(collidingFurniture?.id).toBe('furniture1');
		});

		it('should not find furniture when player is far away', () => {
			const playerRadius = 5;
			const collidingFurniture = collisionSystem.findCollidingFurniture(
				10, 10, playerRadius, mockFurniture, mockRooms,
			);
			expect(collidingFurniture).toBeNull();
		});

		it('should ignore non-blocking furniture', () => {
			const nonBlockingFurniture = [{ ...mockFurniture[0], blocks_movement: false }];
			const playerRadius = 5;
			const roomCenterX = 50;
			const roomCenterY = 50;
			const furnitureWorldX = roomCenterX + 25;
			const furnitureWorldY = roomCenterY + 25;

			const collidingFurniture = collisionSystem.findCollidingFurniture(
				furnitureWorldX, furnitureWorldY, playerRadius, nonBlockingFurniture, mockRooms,
			);
			expect(collidingFurniture).toBeNull();
		});

		it('should handle furniture in different rooms', () => {
			const furnitureInRoom2 = [{
				...mockFurniture[0],
				id: 'furniture2',
				room_id: 'room2',
			}];

			const playerRadius = 5;
			// Room 2 center would be at (150, 50)
			const room2CenterX = 150;
			const room2CenterY = 50;
			const furnitureWorldX = room2CenterX + 25; // 175
			const furnitureWorldY = room2CenterY + 25; // 75

			const collidingFurniture = collisionSystem.findCollidingFurniture(
				furnitureWorldX, furnitureWorldY, playerRadius, furnitureInRoom2, mockRooms,
			);
			expect(collidingFurniture).toBeDefined();
			expect(collidingFurniture?.id).toBe('furniture2');
		});

		it('should handle furniture with invalid room_id', () => {
			const furnitureWithInvalidRoom = [{
				...mockFurniture[0],
				room_id: 'nonexistent-room',
			}];

			const playerRadius = 5;
			const collidingFurniture = collisionSystem.findCollidingFurniture(
				50, 50, playerRadius, furnitureWithInvalidRoom, mockRooms,
			);
			expect(collidingFurniture).toBeNull();
		});
	});

	describe('collision check integration', () => {
		it('should allow movement within same room', () => {
			const result = collisionSystem.checkCollisionSimple(
				50, 50, // current position (center of room1)
				60, 60, // new position (still in room1)
				{ rooms: mockRooms, doors: mockDoors, furniture: mockFurniture },
			);
			expect(result).toEqual({ x: 60, y: 60 });
		});

		it('should block movement outside room boundaries', () => {
			const result = collisionSystem.checkCollision(
				50, 50, // current position (center of room1)
				-10, -10, // new position (outside room)
				{ rooms: mockRooms, doors: mockDoors, furniture: mockFurniture },
			);
			expect(result).toEqual({ x: 50, y: 50, blocked: true, reason: 'outside_room' }); // Should stay at current position
		});

		it('should block movement between rooms without open door', () => {
			const result = collisionSystem.checkCollision(
				50, 50, // current position (room1)
				150, 50, // new position (room2)
				5, // player radius
				mockRooms,
				mockDoors,
				mockFurniture,
			);
			expect(result).toEqual({ x: 50, y: 50 }); // Should stay at current position
		});

		it('should allow movement between rooms with open door', () => {
			const openDoors = [{ ...mockDoors[0], state: 'opened' as const }];
			const result = collisionSystem.checkCollision(
				95, 50, // current position (near door in room1)
				105, 50, // new position (near door in room2)
				5, // player radius
				mockRooms,
				openDoors,
				mockFurniture,
			);
			expect(result).toEqual({ x: 105, y: 50 }); // Should allow movement
		});

		it('should block movement into furniture', () => {
			const roomCenterX = 50;
			const roomCenterY = 50;
			const furnitureWorldX = roomCenterX + 25; // 75
			const furnitureWorldY = roomCenterY + 25; // 75

			const result = collisionSystem.checkCollision(
				50, 50, // current position
				furnitureWorldX, furnitureWorldY, // new position (on furniture)
				5, // player radius
				mockRooms,
				mockDoors,
				mockFurniture,
			);
			expect(result).toEqual({ x: 50, y: 50 }); // Should stay at current position
		});

		it('should block movement into closed door', () => {
			const result = collisionSystem.checkCollision(
				95, 50, // current position (near door)
				100, 50, // new position (on door)
				5, // player radius
				mockRooms,
				mockDoors,
				mockFurniture,
			);
			expect(result).toEqual({ x: 95, y: 50 }); // Should stay at current position
		});

		it('should allow movement near open door', () => {
			const openDoors = [{ ...mockDoors[0], state: 'opened' as const }];
			const result = collisionSystem.checkCollision(
				95, 50, // current position
				100, 50, // new position (on open door)
				5, // player radius
				mockRooms,
				openDoors,
				mockFurniture,
			);
			expect(result).toEqual({ x: 100, y: 50 }); // Should allow movement
		});

		it('should handle movement too close to walls', () => {
			const result = collisionSystem.checkCollision(
				50, 50, // current position
				2, 2, // new position (too close to wall)
				5, // player radius
				mockRooms,
				mockDoors,
				mockFurniture,
				10, // wall threshold
			);
			expect(result).toEqual({ x: 50, y: 50 }); // Should stay at current position
		});

		it('should allow movement near open door even when close to walls', () => {
			const nearWallDoor = {
				...mockDoors[0],
				x: 5, // Near wall
				y: 50,
				state: 'opened' as const,
			};
			const doorsNearWall = [nearWallDoor];

			const result = collisionSystem.checkCollision(
				50, 50, // current position
				5, 50, // new position (near wall but also near open door)
				5, // player radius
				mockRooms,
				doorsNearWall,
				mockFurniture,
				10, // wall threshold
			);
			expect(result).toEqual({ x: 5, y: 50 }); // Should allow movement due to nearby open door
		});
	});

	describe('edge cases and error handling', () => {
		it('should handle empty arrays gracefully', () => {
			const result = collisionSystem.checkCollision(
				50, 50, // current position
				60, 60, // new position
				5, // player radius
				[], // no rooms
				[], // no doors
				[], // no furniture
			);
			expect(result).toEqual({ x: 50, y: 50 }); // Should block movement when no rooms
		});

		it('should handle very large player radius', () => {
			const result = collisionSystem.checkCollision(
				50, 50, // current position
				60, 60, // new position
				50, // very large player radius
				mockRooms,
				mockDoors,
				mockFurniture,
			);
			expect(result).toEqual({ x: 50, y: 50 }); // Should block movement
		});

		it('should handle zero player radius', () => {
			const result = collisionSystem.checkCollision(
				50, 50, // current position
				60, 60, // new position
				0, // zero player radius
				mockRooms,
				mockDoors,
				mockFurniture,
			);
			expect(result).toEqual({ x: 60, y: 60 }); // Should allow movement
		});

		it('should handle negative coordinates', () => {
			const negativeRooms = [{
				...mockRooms[0],
				startX: -100,
				startY: -100,
				endX: 0,
				endY: 0,
			}];

			const result = collisionSystem.checkCollision(
				-50, -50, // current position
				-40, -40, // new position
				5, // player radius
				negativeRooms,
				[],
				[],
			);
			expect(result).toEqual({ x: -40, y: -40 }); // Should allow movement
		});
	});
});
