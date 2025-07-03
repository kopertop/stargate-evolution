import { RoomTemplate } from '@stargate/common';
import { describe, it, expect } from 'vitest';


import {
	calculateRoomPositions,
	getConnectionSide,
	areRoomsAdjacent,
	getRoomGridBounds,
} from './grid-system';

describe('Grid System with Coordinate-based Rooms', () => {
	// Helper function to create coordinate-based room templates
	function createRoom(
		id: string,
		startX: number,
		endX: number,
		startY: number,
		endY: number,
		connections: Partial<{
			north: string;
			south: string;
			east: string;
			west: string;
		}> = {},
	): RoomTemplate {
		return {
			id,
			layout_id: 'destiny',
			type: 'corridor',
			name: id.replace('_', ' ').toUpperCase(),
			description: `Test room ${id}`,
			startX,
			endX,
			startY,
			endY,
			width: endX - startX,
			height: endY - startY,
			floor: 0,
			found: true,
			locked: false,
			explored: true,
			exploration_data: '',
			image: null,
			base_exploration_time: 2,
			status: 'ok',
			connection_north: connections.north || null,
			connection_south: connections.south || null,
			connection_east: connections.east || null,
			connection_west: connections.west || null,
			created_at: Date.now(),
			updated_at: Date.now(),
		};
	}

	describe('calculateRoomPositions', () => {
		it('should position rooms correctly based on coordinates', () => {
			const rooms: RoomTemplate[] = [
				createRoom('room_a', 0, 100, 0, 100, { east: 'room_b' }),
				createRoom('room_b', 100, 200, 0, 100, { west: 'room_a', east: 'room_c' }),
				createRoom('room_c', 200, 300, 0, 100, { west: 'room_b' }),
			];

			const positions = calculateRoomPositions(rooms, 'room_a');

			// Room A should be at origin
			expect(positions['room_a']).toEqual({ gridX: 0, gridY: 0 });

			// Room B should be to the east of Room A
			expect(positions['room_b'].gridX).toBeGreaterThan(positions['room_a'].gridX);
			expect(positions['room_b'].gridY).toBe(positions['room_a'].gridY);

			// Room C should be to the east of Room B
			expect(positions['room_c'].gridX).toBeGreaterThan(positions['room_b'].gridX);
			expect(positions['room_c'].gridY).toBe(positions['room_b'].gridY);
		});

		it('should handle vertical room arrangements', () => {
			const rooms: RoomTemplate[] = [
				createRoom('center', 0, 100, 0, 100, { north: 'north_room', south: 'south_room' }),
				createRoom('north_room', 0, 100, 100, 200, { south: 'center' }),
				createRoom('south_room', 0, 100, -100, 0, { north: 'center' }),
			];

			const positions = calculateRoomPositions(rooms, 'center');

			// Center room at origin
			expect(positions['center']).toEqual({ gridX: 0, gridY: 0 });

			// North room should be above center
			expect(positions['north_room'].gridY).toBeGreaterThan(positions['center'].gridY);
			expect(positions['north_room'].gridX).toBe(positions['center'].gridX);

			// South room should be below center
			expect(positions['south_room'].gridY).toBeLessThan(positions['center'].gridY);
			expect(positions['south_room'].gridX).toBe(positions['center'].gridX);
		});
	});

	describe('areRoomsAdjacent', () => {
		it('should detect adjacent rooms sharing an edge', () => {
			const room1 = createRoom('room1', 0, 100, 0, 100);
			const room2 = createRoom('room2', 100, 200, 0, 100); // Adjacent to the east

			expect(areRoomsAdjacent(room1, room2)).toBe(true);
		});

		it('should detect non-adjacent rooms', () => {
			const room1 = createRoom('room1', 0, 100, 0, 100);
			const room2 = createRoom('room2', 150, 250, 0, 100); // Gap between rooms

			expect(areRoomsAdjacent(room1, room2)).toBe(false);
		});

		it('should detect vertically adjacent rooms', () => {
			const room1 = createRoom('room1', 0, 100, 0, 100);
			const room2 = createRoom('room2', 0, 100, 100, 200); // Adjacent to the north

			expect(areRoomsAdjacent(room1, room2)).toBe(true);
		});
	});

	describe('getConnectionSide', () => {
		it('should detect east connection', () => {
			const room1 = createRoom('room1', 0, 100, 0, 100);
			const room2 = createRoom('room2', 100, 200, 0, 100);

			expect(getConnectionSide(room1, room2)).toBe('right');
		});

		it('should detect west connection', () => {
			const room1 = createRoom('room1', 100, 200, 0, 100);
			const room2 = createRoom('room2', 0, 100, 0, 100);

			expect(getConnectionSide(room1, room2)).toBe('left');
		});

		it('should detect north connection', () => {
			const room1 = createRoom('room1', 0, 100, 0, 100);
			const room2 = createRoom('room2', 0, 100, 100, 200);

			expect(getConnectionSide(room1, room2)).toBe('top');
		});

		it('should detect south connection', () => {
			const room1 = createRoom('room1', 0, 100, 100, 200);
			const room2 = createRoom('room2', 0, 100, 0, 100);

			expect(getConnectionSide(room1, room2)).toBe('bottom');
		});

		it('should return null for non-adjacent rooms', () => {
			const room1 = createRoom('room1', 0, 100, 0, 100);
			const room2 = createRoom('room2', 200, 300, 200, 300);

			expect(getConnectionSide(room1, room2)).toBeNull();
		});
	});

	describe('getRoomGridBounds', () => {
		it('should calculate correct grid bounds for rooms', () => {
			const rooms: RoomTemplate[] = [
				createRoom('room1', 0, 100, 0, 100),
				createRoom('room2', 100, 250, 50, 150),
				createRoom('room3', -50, 50, -100, 0),
			];

			const positions = {
				room1: { gridX: 0, gridY: 0 },
				room2: { gridX: 1, gridY: 0 },
				room3: { gridX: -1, gridY: -1 },
			};

			const bounds = getRoomGridBounds(rooms[0], positions);

			// For room1: width=100, height=100, so halfWidth=50, halfHeight=50
			// At gridX=0, gridY=0: left=-50, right=50, top=50, bottom=-50
			expect(bounds.left).toBe(-50);
			expect(bounds.right).toBe(50);
			expect(bounds.top).toBe(50);
			expect(bounds.bottom).toBe(-50);
		});
	});
});
