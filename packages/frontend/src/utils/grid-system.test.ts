import fs from 'fs';
import path from 'path';

import type { RoomTemplate } from '@stargate/common';
import { Parser } from 'node-sql-parser';
import { describe, it, expect } from 'vitest';

import {
	calculateRoomPositions,
	getConnectionSide,
	areRoomsAdjacent,
	getRoomGridBounds,
} from './grid-system';

describe('calculateRoomPositions', () => {
	/**
	 * Layout:
	 *
	 * [gate_room][corridor_1][control_interface][kino_room]
	 *
	 * All rooms are connected east-west in a line.
	 */
	it('should layout a simple eastward chain of rooms', () => {
		const rooms: RoomTemplate[] = [
			{
				id: 'gate_room',
				layout_id: 'test',
				type: 'gate_room',
				name: 'Gate Room',
				description: '',
				width: 2,
				height: 2,
				floor: 0,
				found: true,
				locked: false,
				explored: true,
				exploration_data: '',
				image: null,
				base_exploration_time: 2,
				status: 'ok',
				connection_north: null,
				connection_south: null,
				connection_east: 'corridor_1',
				connection_west: null,
				created_at: 0,
				updated_at: 0,
			},
			{
				id: 'corridor_1',
				layout_id: 'test',
				type: 'corridor',
				name: 'Corridor 1',
				description: '',
				width: 1,
				height: 2,
				floor: 0,
				found: true,
				locked: false,
				explored: true,
				exploration_data: '',
				image: null,
				base_exploration_time: 2,
				status: 'ok',
				connection_north: null,
				connection_south: null,
				connection_east: 'control_interface',
				connection_west: 'gate_room',
				created_at: 0,
				updated_at: 0,
			},
			{
				id: 'control_interface',
				layout_id: 'test',
				type: 'control_interface',
				name: 'Control Interface',
				description: '',
				width: 2,
				height: 2,
				floor: 0,
				found: true,
				locked: false,
				explored: true,
				exploration_data: '',
				image: null,
				base_exploration_time: 2,
				status: 'ok',
				connection_north: null,
				connection_south: null,
				connection_east: 'kino_room',
				connection_west: 'corridor_1',
				created_at: 0,
				updated_at: 0,
			},
			{
				id: 'kino_room',
				layout_id: 'test',
				type: 'kino_room',
				name: 'Kino Room',
				description: '',
				width: 1,
				height: 1,
				floor: 0,
				found: false,
				locked: true,
				explored: false,
				exploration_data: '',
				image: null,
				base_exploration_time: 2,
				status: 'ok',
				connection_north: null,
				connection_south: null,
				connection_east: null,
				connection_west: 'control_interface',
				created_at: 0,
				updated_at: 0,
			},
		];

		const positions = calculateRoomPositions(rooms, 'gate_room');
		// Gate room should be at 0,0
		expect(positions['gate_room']).toEqual({ gridX: 0, gridY: 0 });
		// Corridor 1 should be to the east of gate room
		expect(positions['corridor_1'].gridX).toBeGreaterThan(positions['gate_room'].gridX);
		// Control interface should be to the east of corridor 1
		expect(positions['control_interface'].gridX).toBeGreaterThan(positions['corridor_1'].gridX);
		// Kino room should be to the east of control interface
		expect(positions['kino_room'].gridX).toBeGreaterThan(positions['control_interface'].gridX);
	});

	/**
	 * Layout:
	 *
	 *   [north]
	 *     |
	 *  [center]
	 *     |
	 *  [south]
	 *
	 * All rooms are connected north-south in a line.
	 */
	it('should handle north/south connections', () => {
		const rooms: RoomTemplate[] = [
			{
				id: 'center',
				layout_id: 'test',
				type: 'center',
				name: 'Center',
				description: '',
				width: 2,
				height: 2,
				floor: 0,
				found: true,
				locked: false,
				explored: true,
				exploration_data: '',
				image: null,
				base_exploration_time: 2,
				status: 'ok',
				connection_north: 'north',
				connection_south: 'south',
				connection_east: null,
				connection_west: null,
				created_at: 0,
				updated_at: 0,
			},
			{
				id: 'north',
				layout_id: 'test',
				type: 'north',
				name: 'North',
				description: '',
				width: 2,
				height: 1,
				floor: 0,
				found: true,
				locked: false,
				explored: true,
				exploration_data: '',
				image: null,
				base_exploration_time: 2,
				status: 'ok',
				connection_north: null,
				connection_south: 'center',
				connection_east: null,
				connection_west: null,
				created_at: 0,
				updated_at: 0,
			},
			{
				id: 'south',
				layout_id: 'test',
				type: 'south',
				name: 'South',
				description: '',
				width: 2,
				height: 1,
				floor: 0,
				found: true,
				locked: false,
				explored: true,
				exploration_data: '',
				image: null,
				base_exploration_time: 2,
				status: 'ok',
				connection_north: 'center',
				connection_south: null,
				connection_east: null,
				connection_west: null,
				created_at: 0,
				updated_at: 0,
			},
		];
		const positions = calculateRoomPositions(rooms, 'center');
		expect(positions['center']).toEqual({ gridX: 0, gridY: 0 });
		expect(positions['north'].gridY).toBeGreaterThan(positions['center'].gridY);
		expect(positions['south'].gridY).toBeLessThan(positions['center'].gridY);
	});
});

describe('getConnectionSide and areRoomsAdjacent', () => {
	/**
	 * Layout:
	 *
	 *      [north]
	 *         |
	 * [west]-[center]-[east]
	 *         |
	 *      [south]
	 *
	 * Center room is connected in all four directions.
	 */
	const rooms: RoomTemplate[] = [
		{
			id: 'center',
			layout_id: 'test',
			type: 'center',
			name: 'Center',
			description: '',
			width: 2,
			height: 2,
			floor: 0,
			found: true,
			locked: false,
			explored: true,
			exploration_data: '',
			image: null,
			base_exploration_time: 2,
			status: 'ok',
			connection_north: 'north',
			connection_south: 'south',
			connection_east: 'east',
			connection_west: 'west',
			created_at: 0,
			updated_at: 0,
		},
		{
			id: 'north',
			layout_id: 'test',
			type: 'north',
			name: 'North',
			description: '',
			width: 2,
			height: 1,
			floor: 0,
			found: true,
			locked: false,
			explored: true,
			exploration_data: '',
			image: null,
			base_exploration_time: 2,
			status: 'ok',
			connection_north: null,
			connection_south: 'center',
			connection_east: null,
			connection_west: null,
			created_at: 0,
			updated_at: 0,
		},
		{
			id: 'south',
			layout_id: 'test',
			type: 'south',
			name: 'South',
			description: '',
			width: 2,
			height: 1,
			floor: 0,
			found: true,
			locked: false,
			explored: true,
			exploration_data: '',
			image: null,
			base_exploration_time: 2,
			status: 'ok',
			connection_north: 'center',
			connection_south: null,
			connection_east: null,
			connection_west: null,
			created_at: 0,
			updated_at: 0,
		},
		{
			id: 'east',
			layout_id: 'test',
			type: 'east',
			name: 'East',
			description: '',
			width: 1,
			height: 2,
			floor: 0,
			found: true,
			locked: false,
			explored: true,
			exploration_data: '',
			image: null,
			base_exploration_time: 2,
			status: 'ok',
			connection_north: null,
			connection_south: null,
			connection_east: null,
			connection_west: 'center',
			created_at: 0,
			updated_at: 0,
		},
		{
			id: 'west',
			layout_id: 'test',
			type: 'west',
			name: 'West',
			description: '',
			width: 1,
			height: 2,
			floor: 0,
			found: true,
			locked: false,
			explored: true,
			exploration_data: '',
			image: null,
			base_exploration_time: 2,
			status: 'ok',
			connection_north: null,
			connection_south: null,
			connection_east: 'center',
			connection_west: null,
			created_at: 0,
			updated_at: 0,
		},
	];

	it('should detect correct connection sides', () => {
		const center = rooms[0];
		const north = rooms[1];
		const south = rooms[2];
		const east = rooms[3];
		const west = rooms[4];
		expect(getConnectionSide(center, north)).toBe('top');
		expect(getConnectionSide(center, south)).toBe('bottom');
		expect(getConnectionSide(center, east)).toBe('right');
		expect(getConnectionSide(center, west)).toBe('left');
	});

	it('should detect adjacency', () => {
		const center = rooms[0];
		const north = rooms[1];
		const south = rooms[2];
		const east = rooms[3];
		const west = rooms[4];
		expect(areRoomsAdjacent(center, north)).toBe(true);
		expect(areRoomsAdjacent(center, south)).toBe(true);
		expect(areRoomsAdjacent(center, east)).toBe(true);
		expect(areRoomsAdjacent(center, west)).toBe(true);
		// Not adjacent to itself
		expect(areRoomsAdjacent(center, center)).toBe(false);
	});

	/**
	 * Layout:
	 *
	 * [center]   [far_east]
	 *    |           |
	 * [west]      [east]
	 *
	 * far_east is not adjacent to center.
	 */
	it('should not detect adjacency for non-adjacent rooms', () => {
		const center = rooms[0];
		const north = rooms[1];
		const east = rooms[3];
		// Move east far away
		const farEast = { ...east, id: 'far_east', connection_west: null };
		const farRooms = [...rooms, farEast];
		const farPositions = calculateRoomPositions(farRooms, 'center');
		expect(areRoomsAdjacent(center, farEast)).toBe(false);
	});

	// Utility to parse the SQL migration file and extract room templates
	function parseRoomTemplatesFromSQL(sqlFilePath: string): RoomTemplate[] {
		const parser = new Parser();
		const sql = fs.readFileSync(sqlFilePath, 'utf-8');
		const ast = parser.astify(sql, { database: 'sqlite' });
		// Find the insert statement for room_templates
		function isInsertWithValues(node: any): node is { type: string; table: any[]; values: any[] } {
			return node && node.type === 'insert' && Array.isArray(node.table) && node.table[0].table === 'room_templates' && Array.isArray(node.values);
		}
		const insert = Array.isArray(ast)
			? ast.find(isInsertWithValues)
			: (isInsertWithValues(ast) ? ast : null);
		if (!insert) throw new Error('Could not find room_templates insert statement');
		const values = (insert as { values: any[] }).values;
		const fields = [
			'id', 'layout_id', 'type', 'name', 'description', 'width', 'height', 'floor', 'found',
			'connection_north', 'connection_south', 'connection_east', 'connection_west',
			'base_exploration_time', 'locked',
		];
		return values.map((tuple) => {
			const obj: any = {};
			const row = Array.isArray(tuple.value) ? tuple.value : [tuple.value];
			for (let i = 0; i < row.length; i++) {
				const val = row[i];
				let v = val.value;
				if (v === null || v === undefined) v = '';
				if (fields[i] === 'width' || fields[i] === 'height' || fields[i] === 'floor' || fields[i] === 'base_exploration_time') v = v === '' ? 0 : Number(v);
				else if (fields[i] === 'found' || fields[i] === 'locked') v = v === '' ? false : (v === true || v === 1 || v === '1');
				else if (['id', 'layout_id', 'type', 'name', 'description', 'connection_north', 'connection_south', 'connection_east', 'connection_west'].includes(fields[i])) v = typeof v === 'string' ? v : '';
				obj[fields[i]] = v;
			}
			const room: RoomTemplate = {
				id: obj.id,
				layout_id: obj.layout_id,
				type: obj.type,
				name: obj.name,
				description: obj.description,
				width: obj.width,
				height: obj.height,
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
				created_at: 0,
				updated_at: 0,
			};
			return room;
		});
	}
	it('should parse the default Destiny ship layout', () => {
		const sqlFilePath = path.resolve(__dirname, '../../../backend/migrations/005_seed_ship_layouts.sql');
		const rooms: RoomTemplate[] = parseRoomTemplatesFromSQL(sqlFilePath);
		const roomIDs = rooms.map(r => r.id);
		expect(roomIDs).toContain('gate_room');
		expect(roomIDs).toContain('north_corridor');
		expect(roomIDs).toContain('south_corridor');
		expect(roomIDs).toContain('east_corridor');
		expect(roomIDs).toContain('west_corridor');
		expect(roomIDs).toContain('control_interface');
		expect(roomIDs).toContain('kino_room');
		expect(roomIDs).toContain('crew_corridor_1');
		expect(roomIDs).toContain('crew_quarters_1');
		expect(roomIDs).toContain('crew_corridor_2');
		expect(roomIDs).toContain('crew_quarters_2');
		expect(roomIDs).toContain('crew_corridor_3');
		for (const room of rooms) {
			expect(room.id).toBeDefined();
			expect(room.layout_id).toBeDefined();
			expect(room.type).toBeDefined();
			expect(room.name).toBeDefined();
			expect(room.description).toBeDefined();
			expect(room.width).toBeGreaterThan(0);
			expect(room.height).toBeGreaterThan(0);
		}
	});

	it('should layout the Destiny ship from seed and prevent overlaps', () => {
		const sqlFilePath = path.resolve(__dirname, '../../../backend/migrations/005_seed_ship_layouts.sql');
		const rooms: RoomTemplate[] = parseRoomTemplatesFromSQL(sqlFilePath);

		const positions = calculateRoomPositions(rooms, 'gate_room');

		// Check for overlaps: no two rooms should overlap
		for (let i = 0; i < rooms.length; i++) {
			for (let j = i + 1; j < rooms.length; j++) {
				const a = rooms[i];
				const b = rooms[j];
				if (a.floor !== b.floor) continue;
				const aBounds = getRoomGridBounds(a, positions);
				const bBounds = getRoomGridBounds(b, positions);
				const overlap =
					aBounds.left < bBounds.right &&
					aBounds.right > bBounds.left &&
					aBounds.top > bBounds.bottom &&
					aBounds.bottom < bBounds.top;
				expect(overlap, `Rooms ${a.id} and ${b.id} should not overlap`).toBe(false);
			}
		}

		// Check that all connections are valid (adjacent rooms)
		for (const room of rooms) {
			for (const dir of ['connection_north', 'connection_south', 'connection_east', 'connection_west'] as const) {
				const connId = room[dir];
				if (!connId) continue;
				const other = rooms.find(r => r.id === connId);
				if (!other) continue;
				expect(areRoomsAdjacent(room, other)).toBe(true);
			}
		}
	});
});
