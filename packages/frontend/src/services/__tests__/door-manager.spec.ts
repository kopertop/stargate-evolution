import type { DoorTemplate } from '@stargate/common';
import * as PIXI from 'pixi.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DoorManager } from '../door-manager';

// Mock LayerManager
const mockLayerManager = {
	getLayer: vi.fn().mockReturnValue({
		addChild: vi.fn(),
		removeChild: vi.fn(),
		removeChildren: vi.fn(),
		children: [],
	}),
	createLayer: vi.fn().mockReturnValue({
		addChild: vi.fn(),
		removeChild: vi.fn(),
		removeChildren: vi.fn(),
		children: [],
	}),
	setLayerVisibility: vi.fn(),
} as any;

describe('DoorManager', () => {
	let doorManager: DoorManager;
	let mockDoors: DoorTemplate[];

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		doorManager = new DoorManager(mockLayerManager);

		// Create mock doors matching the actual DoorTemplate schema
		mockDoors = [
			{
				id: 'door1',
				name: 'Door 1',
				from_room_id: 'room1',
				to_room_id: 'room2',
				x: 100,
				y: 50,
				width: 32,
				height: 8,
				rotation: 0,
				state: 'closed',
				is_automatic: false,
				open_direction: 'inward',
				style: 'standard',
				color: '#808080',
				requirements: null,
				power_required: 0,
				sound_effect: null,
				cleared: false,
				restricted: false,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
			{
				id: 'door2',
				name: 'Door 2',
				from_room_id: 'room2',
				to_room_id: 'room3',
				x: 200,
				y: 100,
				width: 32,
				height: 8,
				rotation: 90,
				state: 'opened',
				is_automatic: true,
				open_direction: 'outward',
				style: 'standard',
				color: '#606060',
				requirements: null,
				power_required: 5,
				sound_effect: 'door_beep',
				cleared: true,
				restricted: false,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
			{
				id: 'door3',
				name: 'Door 3',
				from_room_id: 'room3',
				to_room_id: 'room4',
				x: 300,
				y: 150,
				width: 32,
				height: 8,
				rotation: 0,
				state: 'locked',
				is_automatic: false,
				open_direction: 'sliding',
				style: 'blast_door',
				color: '#ff0000',
				requirements: [
					{
						type: 'keycard',
						value: 1,
						description: 'Red keycard required',
						met: false,
					},
				],
				power_required: 0,
				sound_effect: null,
				cleared: false,
				restricted: true,
				created_at: Date.now(),
				updated_at: Date.now(),
			},
		];
	});

	describe('initialization', () => {
		it('should initialize with layer manager', () => {
			expect(doorManager).toBeDefined();
			expect(mockLayerManager.getLayer).toHaveBeenCalledWith('doors');
		});

		it('should handle data updates', () => {
			expect(() => doorManager.updateData(mockDoors, [])).not.toThrow();
		});
	});

	describe('door rendering', () => {
		it('should render all doors', () => {
			doorManager.updateData(mockDoors, []);
			doorManager.renderAll();

			// Should have called removeChildren and addChild for each door
			expect(mockLayerManager.getLayer().removeChildren).toHaveBeenCalled();
		});

		it('should handle empty door array', () => {
			doorManager.updateData([], []);
			expect(() => doorManager.renderAll()).not.toThrow();
		});

		it('should handle doors with different styles', () => {
			const styledDoors = mockDoors.map((door, index) => ({
				...door,
				style: ['standard', 'blast_door', 'airlock'][index],
			}));

			doorManager.updateData(styledDoors, []);
			expect(() => doorManager.renderAll()).not.toThrow();
		});
	});

	describe('door state management', () => {
		beforeEach(() => {
			doorManager.updateData(mockDoors, []);
		});

		it('should get door by ID', () => {
			const door = doorManager.getDoorById('door1');
			expect(door).toBeDefined();
			expect(door?.id).toBe('door1');
		});

		it('should return null for non-existent door', () => {
			const door = doorManager.getDoorById('nonexistent');
			expect(door).toBeNull();
		});

		it('should get door states', () => {
			const states = doorManager.getDoorStates();
			expect(states).toHaveLength(mockDoors.length);
			expect(states[0].id).toBe('door1');
			expect(states[0].state).toBe('closed');
		});

		it('should restore door states', () => {
			const newStates = [
				{
					id: 'door1',
					state: 'opened' as const,
					from_room_id: 'room1',
					to_room_id: 'room2',
					x: 100,
					y: 50,
					width: 32,
					height: 8,
					rotation: 0,
					is_automatic: false,
					open_direction: 'inward' as const,
					style: 'standard',
					color: '#808080',
					requirements: null,
					power_required: 0,
					cleared: false,
					restricted: false,
				},
				{
					id: 'door2',
					state: 'closed' as const,
					from_room_id: 'room2',
					to_room_id: 'room3',
					x: 200,
					y: 100,
					width: 32,
					height: 8,
					rotation: 90,
					is_automatic: true,
					open_direction: 'outward' as const,
					style: 'standard',
					color: '#606060',
					requirements: null,
					power_required: 5,
					cleared: true,
					restricted: false,
				},
			];

			doorManager.restoreDoorStates(newStates);

			const door1 = doorManager.getDoorById('door1');
			const door2 = doorManager.getDoorById('door2');

			expect(door1?.state).toBe('opened');
			expect(door2?.state).toBe('closed');
		});
	});

	describe('door interactions', () => {
		beforeEach(() => {
			doorManager.updateData(mockDoors, []);
		});

		it('should activate door when player is nearby', () => {
			const playerX = 100; // Near door1
			const playerY = 50;

			const result = doorManager.handlePlayerActivation(playerX, playerY);
			expect(result).toBe(true);
		});

		it('should not activate door when player is far away', () => {
			const playerX = 1000; // Far from all doors
			const playerY = 1000;

			const result = doorManager.handlePlayerActivation(playerX, playerY);
			expect(result).toBe(false);
		});

		it('should activate specific door by ID', () => {
			const result = doorManager.activateDoor('door1');
			expect(result).toBe(true);

			const door = doorManager.getDoorById('door1');
			expect(door?.state).toBe('opened');
		});

		it('should not activate locked doors', () => {
			const result = doorManager.activateDoor('door3'); // locked door
			expect(result).toBe(false);

			const door = doorManager.getDoorById('door3');
			expect(door?.state).toBe('locked');
		});

		it('should mark doors as cleared when user opens them', () => {
			const result = doorManager.activateDoor('door1', false); // user activation
			expect(result).toBe(true);

			const door = doorManager.getDoorById('door1');
			expect(door?.cleared).toBe(true);
		});

		it('should handle NPC access control', () => {
			// NPC tries to open uncleared door
			const result = doorManager.activateDoor('door1', true); // NPC activation
			expect(result).toBe(false);

			// NPC tries to open cleared door
			const door2Result = doorManager.activateDoor('door2', true); // door2 is cleared
			expect(door2Result).toBe(true);
		});
	});

	describe('door restrictions', () => {
		beforeEach(() => {
			doorManager.updateData(mockDoors, []);
		});

		it('should set door restriction', () => {
			const result = doorManager.setDoorRestricted('door1', true);
			expect(result).toBe(true);

			const door = doorManager.getDoorById('door1');
			expect(door?.restricted).toBe(true);
		});

		it('should get door restrictions', () => {
			const restrictions = doorManager.getDoorRestrictions();
			expect(restrictions).toHaveLength(mockDoors.length);
			expect(restrictions[2].restricted).toBe(true); // door3 is restricted
		});

		it('should handle non-existent door restriction', () => {
			const result = doorManager.setDoorRestricted('nonexistent', true);
			expect(result).toBe(false);
		});
	});

	describe('door collision detection', () => {
		beforeEach(() => {
			doorManager.updateData(mockDoors, []);
		});

		it('should detect player collision with door', () => {
			const playerX = 100;
			const playerY = 50;
			const playerRadius = 5;
			const door = mockDoors[0];

			const isColliding = doorManager.isPlayerCollidingWithDoor(playerX, playerY, playerRadius, door);
			expect(isColliding).toBe(true);
		});

		it('should not detect collision when player is far away', () => {
			const playerX = 1000;
			const playerY = 1000;
			const playerRadius = 5;
			const door = mockDoors[0];

			const isColliding = doorManager.isPlayerCollidingWithDoor(playerX, playerY, playerRadius, door);
			expect(isColliding).toBe(false);
		});

		it('should push player out of door', () => {
			const playerX = 100;
			const playerY = 50;
			const playerRadius = 5;
			const door = mockDoors[0];

			const newPosition = doorManager.pushPlayerOutOfDoor(door, playerX, playerY, playerRadius);
			expect(newPosition).toBeDefined();
			expect(newPosition?.x).toBeDefined();
			expect(newPosition?.y).toBeDefined();
		});
	});

	describe('door lookup functions', () => {
		beforeEach(() => {
			doorManager.updateData(mockDoors, []);
		});

		it('should find door between rooms', () => {
			const door = doorManager.findDoorBetweenRooms('room1', 'room2');
			expect(door).toBeDefined();
			expect(door?.id).toBe('door1');
		});

		it('should return null when no door exists between rooms', () => {
			const door = doorManager.findDoorBetweenRooms('room1', 'room4');
			expect(door).toBeNull();
		});
	});

	describe('configuration and callbacks', () => {
		beforeEach(() => {
			doorManager.updateData(mockDoors, []);
		});

		it('should update configuration', () => {
			const newConfig = {
				colors: {
					opened: 0x00ff00,
					closed: 0xff0000,
					locked: 0x800000,
				},
			};

			expect(() => doorManager.updateConfig(newConfig)).not.toThrow();
		});

		it('should set callbacks', () => {
			const callbacks = {
				onDoorStateChange: vi.fn(),
				onDoorInteraction: vi.fn(),
			};

			expect(() => doorManager.setCallbacks(callbacks)).not.toThrow();
		});
	});

	describe('utility functions', () => {
		beforeEach(() => {
			doorManager.updateData(mockDoors, []);
		});

		it('should get door statistics', () => {
			const stats = doorManager.getStats();
			expect(stats.totalDoors).toBe(mockDoors.length);
			expect(stats.doorsByState.closed).toBe(1);
			expect(stats.doorsByState.opened).toBe(1);
			expect(stats.doorsByState.locked).toBe(1);
		});

		it('should clear all doors', () => {
			doorManager.clear();
			const stats = doorManager.getStats();
			expect(stats.totalDoors).toBe(0);
		});

		it('should set visibility', () => {
			expect(() => doorManager.setVisible(false)).not.toThrow();
			expect(() => doorManager.setVisible(true)).not.toThrow();
		});

		it('should destroy cleanly', () => {
			expect(() => doorManager.destroy()).not.toThrow();
		});
	});

	describe('edge cases and error handling', () => {
		it('should handle empty door arrays', () => {
			expect(() => doorManager.updateData([], [])).not.toThrow();
			expect(() => doorManager.renderAll()).not.toThrow();
		});

		it('should handle doors with invalid properties', () => {
			const invalidDoor = {
				...mockDoors[0],
				width: -1,
				height: 0,
			};

			expect(() => doorManager.updateData([invalidDoor], [])).not.toThrow();
		});

		it('should handle operations on non-existent doors gracefully', () => {
			doorManager.updateData(mockDoors, []);

			expect(() => doorManager.activateDoor('nonexistent')).not.toThrow();
			expect(() => doorManager.setDoorRestricted('nonexistent', true)).not.toThrow();
		});

		it('should handle invalid coordinates', () => {
			const doorWithNaN = {
				...mockDoors[0],
				x: NaN,
				y: Infinity,
			};

			expect(() => doorManager.updateData([doorWithNaN], [])).not.toThrow();
		});
	});
});
