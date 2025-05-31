import type { RoomTemplate } from '@stargate/common';
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

	it('should layout the Destiny ship from seed and prevent overlaps', () => {
		const rooms: RoomTemplate[] = [
			{
				id: 'gate_room', layout_id: 'destiny', type: 'gate_room', name: 'Gate Room', description: '', width: 4, height: 4, floor: 0, found: true, locked: false, explored: true, exploration_data: '', image: null, base_exploration_time: 2, status: 'ok', connection_north: 'south_corridor', connection_south: null, connection_east: 'control_interface', connection_west: 'north_corridor', created_at: 0, updated_at: 0,
			},
			{ id: 'north_corridor', layout_id: 'destiny', type: 'corridor_basic', name: 'North Corridor', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 0, status: 'ok', connection_north: null, connection_south: null, connection_east: 'gate_room', connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'south_corridor', layout_id: 'destiny', type: 'corridor_basic', name: 'South Corridor', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 0, status: 'ok', connection_north: null, connection_south: 'gate_room', connection_east: null, connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'control_interface', layout_id: 'destiny', type: 'control_room', name: 'Control Interface', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 4, status: 'ok', connection_north: null, connection_south: null, connection_east: 'kino_room', connection_west: 'gate_room', created_at: 0, updated_at: 0 },
			{ id: 'kino_room', layout_id: 'destiny', type: 'kino_room', name: 'Kino Room', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 2, status: 'ok', connection_north: null, connection_south: null, connection_east: null, connection_west: 'control_interface', created_at: 0, updated_at: 0 },
			{ id: 'bridge', layout_id: 'destiny', type: 'bridge_command', name: 'Bridge', description: '', width: 2, height: 2, floor: 0, found: false, locked: true, explored: false, exploration_data: '', image: null, base_exploration_time: 48, status: 'ok', connection_north: null, connection_south: 'south_corridor', connection_east: null, connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'medical_bay', layout_id: 'destiny', type: 'medical_bay_standard', name: 'Medical Bay', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 4, status: 'ok', connection_north: null, connection_south: null, connection_east: null, connection_west: 'kino_room', created_at: 0, updated_at: 0 },
			{ id: 'mess_hall', layout_id: 'destiny', type: 'mess_hall_standard', name: 'Mess Hall', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 2, status: 'ok', connection_north: null, connection_south: 'north_corridor', connection_east: null, connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'crew_corridor_1', layout_id: 'destiny', type: 'corridor_basic', name: 'Crew Corridor 1', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 2, status: 'ok', connection_north: 'crew_quarters_1', connection_south: 'control_interface', connection_east: 'control_interface', connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'crew_quarters_1', layout_id: 'destiny', type: 'crew_quarters', name: 'Crew Quarters 1', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 4, status: 'ok', connection_north: null, connection_south: 'crew_corridor_1', connection_east: null, connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'crew_corridor_2', layout_id: 'destiny', type: 'corridor_basic', name: 'Crew Corridor 2', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 6, status: 'ok', connection_north: 'crew_quarters_2', connection_south: 'crew_corridor_1', connection_east: 'crew_corridor_1', connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'crew_quarters_2', layout_id: 'destiny', type: 'crew_quarters', name: 'Crew Quarters 2', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 8, status: 'ok', connection_north: null, connection_south: 'crew_corridor_2', connection_east: null, connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'crew_corridor_3', layout_id: 'destiny', type: 'corridor_basic', name: 'Crew Corridor 3', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 10, status: 'ok', connection_north: 'crew_quarters_3', connection_south: 'crew_corridor_2', connection_east: 'crew_corridor_2', connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'crew_quarters_3', layout_id: 'destiny', type: 'crew_quarters', name: 'Crew Quarters 3', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 12, status: 'ok', connection_north: null, connection_south: 'crew_corridor_3', connection_east: null, connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'crew_corridor_4', layout_id: 'destiny', type: 'corridor_basic', name: 'Crew Corridor 4', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 14, status: 'ok', connection_north: 'crew_quarters_4', connection_south: 'crew_corridor_3', connection_east: 'crew_corridor_3', connection_west: null, created_at: 0, updated_at: 0 },
			{ id: 'crew_quarters_4', layout_id: 'destiny', type: 'crew_quarters', name: 'Crew Quarters 4', description: '', width: 2, height: 2, floor: 0, found: false, locked: false, explored: false, exploration_data: '', image: null, base_exploration_time: 16, status: 'ok', connection_north: null, connection_south: 'crew_corridor_4', connection_east: null, connection_west: null, created_at: 0, updated_at: 0 },
		];

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
