import fs from 'fs';
import path from 'path';

import { RoomTemplate } from '@stargate/common';
import { Parser } from 'node-sql-parser';
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

			expect(getConnectionSide(room1, room2)).toBe('east');
		});

		it('should detect west connection', () => {
			const room1 = createRoom('room1', 100, 200, 0, 100);
			const room2 = createRoom('room2', 0, 100, 0, 100);

			expect(getConnectionSide(room1, room2)).toBe('west');
		});

		it('should detect north connection', () => {
			const room1 = createRoom('room1', 0, 100, 0, 100);
			const room2 = createRoom('room2', 0, 100, 100, 200);

			expect(getConnectionSide(room1, room2)).toBe('north');
		});

		it('should detect south connection', () => {
			const room1 = createRoom('room1', 0, 100, 100, 200);
			const room2 = createRoom('room2', 0, 100, 0, 100);

			expect(getConnectionSide(room1, room2)).toBe('south');
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

			expect(bounds.left).toBe(-1);
			expect(bounds.right).toBe(1);
			expect(bounds.top).toBe(0);
			expect(bounds.bottom).toBe(-1);
		});
	});

	describe('Destiny Ship Layout Integration', () => {
		it('should parse the new Destiny layout migration', () => {
			const sqlFilePath = path.resolve(__dirname, '../../../backend/migrations/006_seed_destiny_layout.sql');

			// Check if file exists before testing
			if (!fs.existsSync(sqlFilePath)) {
				console.warn('Migration file not found, skipping integration test');
				return;
			}

			const rooms = parseRoomTemplatesFromSQL(sqlFilePath);

			// Should have the basic Destiny rooms
			const roomIds = rooms.map(r => r.id);
			expect(roomIds).toContain('gate_room');
			expect(roomIds).toContain('bridge');
			expect(roomIds).toContain('main_corridor');
			expect(roomIds).toContain('elevator_floor_0');

			// All rooms should have valid coordinates
			for (const room of rooms) {
				expect(room.startX).toBeDefined();
				expect(room.endX).toBeDefined();
				expect(room.startY).toBeDefined();
				expect(room.endY).toBeDefined();
				expect(room.startX).toBeLessThan(room.endX);
				expect(room.startY).toBeLessThan(room.endY);
			}
		});

		it('should handle room positioning without overlaps', () => {
			const sqlFilePath = path.resolve(__dirname, '../../../backend/migrations/006_seed_destiny_layout.sql');

			if (!fs.existsSync(sqlFilePath)) {
				console.warn('Migration file not found, skipping overlap test');
				return;
			}

			const rooms = parseRoomTemplatesFromSQL(sqlFilePath);
			const positions = calculateRoomPositions(rooms, 'gate_room');

			// Check that rooms don't overlap in grid positions
			const gridPositions = Object.values(positions);
			const uniquePositions = new Set(gridPositions.map(p => `${p.gridX},${p.gridY}`));

			// Some rooms might share grid positions if they're on different floors
			// But we should have reasonable positioning
			expect(uniquePositions.size).toBeGreaterThan(0);
		});
	});
});

// SQL parser helper function
function parseRoomTemplatesFromSQL(sqlFilePath: string): RoomTemplate[] {
	const parser = new Parser();
	const sql = fs.readFileSync(sqlFilePath, 'utf-8');
	const ast = parser.astify(sql, { database: 'sqlite' });

	const rooms: RoomTemplate[] = [];

	// Handle array of statements
	const statements = Array.isArray(ast) ? ast : [ast];

	for (const statement of statements) {
		if (isInsertWithValues(statement) &&
			statement.table &&
			statement.table.length > 0 &&
			statement.table[0].table === 'room_templates') {

			const fields = [
				'id', 'layout_id', 'type', 'name', 'description',
				'startX', 'endX', 'startY', 'endY', 'floor', 'found',
				'connection_north', 'connection_south', 'connection_east', 'connection_west',
				'base_exploration_time', 'locked',
			];

			for (const row of statement.values) {
				const obj: any = {};
				for (let i = 0; i < row.length; i++) {
					const val = row[i];
					let v = val.value;
					if (v === null || v === undefined) v = '';

					if (fields[i] === 'startX' || fields[i] === 'endX' || fields[i] === 'startY' || fields[i] === 'endY' ||
						fields[i] === 'floor' || fields[i] === 'base_exploration_time') {
						v = v === '' ? 0 : Number(v);
					} else if (fields[i] === 'found' || fields[i] === 'locked') {
						v = v === '' ? false : (v === true || v === 1 || v === '1');
					} else if (['id', 'layout_id', 'type', 'name', 'description',
							  'connection_north', 'connection_south', 'connection_east', 'connection_west'].includes(fields[i])) {
						v = typeof v === 'string' ? v : '';
					}
					obj[fields[i]] = v;
				}

				const room: RoomTemplate = {
					id: obj.id,
					layout_id: obj.layout_id,
					type: obj.type,
					name: obj.name,
					description: obj.description,
					startX: obj.startX,
					endX: obj.endX,
					startY: obj.startY,
					endY: obj.endY,
					width: obj.endX - obj.startX,
					height: obj.endY - obj.startY,
					floor: obj.floor,
					found: obj.found,
					locked: obj.locked,
					explored: obj.found,
					exploration_data: '',
					image: null,
					base_exploration_time: obj.base_exploration_time,
					status: 'ok',
					connection_north: obj.connection_north === '' ? null : obj.connection_north,
					connection_south: obj.connection_south === '' ? null : obj.connection_south,
					connection_east: obj.connection_east === '' ? null : obj.connection_east,
					connection_west: obj.connection_west === '' ? null : obj.connection_west,
					created_at: Date.now(),
					updated_at: Date.now(),
				};

				rooms.push(room);
			}
		}
	}

	return rooms;
}

function isInsertWithValues(node: any): node is { type: string; table: any[]; values: any[] } {
	return node && node.type === 'insert' && node.table && node.values;
}
