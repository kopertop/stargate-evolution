import { describe, it, expect, beforeEach } from 'vitest';

import { ElevatorManager } from '../elevator-manager';

// Mock room and furniture data for testing
const mockRooms = [
	{
		id: 'room-1',
		name: 'Main Elevator',
		floor: 0,
		startX: 100,
		startY: 100,
		endX: 200,
		endY: 200,
	},
	{
		id: 'room-2', 
		name: 'Bridge',
		floor: 1,
		startX: 300,
		startY: 300,
		endX: 500,
		endY: 500,
	},
	{
		id: 'room-3',
		name: 'Elevator Shaft',
		floor: 1,
		startX: 150,
		startY: 150,
		endX: 250,
		endY: 250,
	},
	{
		id: 'room-4',
		name: 'Engineering',
		floor: 2,
		startX: 400,
		startY: 400,
		endX: 600,
		endY: 600,
	},
];

const mockFurniture = [
	{
		id: 'elevator-1',
		furniture_type: 'elevator_console',
		room_id: 'room-1',
		x: 150,
		y: 150,
		width: 20,
		height: 20,
		rotation: 0,
		name: 'Elevator Console',
	},
	{
		id: 'elevator-2', 
		furniture_type: 'elevator-console',
		room_id: 'room-3',
		x: 200,
		y: 200,
		width: 20,
		height: 20,
		rotation: 0,
		name: 'Elevator Console 2',
	},
];

describe('ElevatorManager', () => {
	let elevatorManager: ElevatorManager;

	beforeEach(() => {
		elevatorManager = new ElevatorManager();
		elevatorManager.updateData(mockRooms as any, mockFurniture as any);
	});

	describe('elevator detection', () => {
		it('should detect elevators by furniture', () => {
			const floorsWithElevators = elevatorManager.getFloorsWithElevators();
			expect(floorsWithElevators).toContain(0); // Has elevator furniture in room-1
			expect(floorsWithElevators).toContain(1); // Has elevator furniture in room-3
		});

		it('should detect elevators by room name', () => {
			// Room 3 is named "Elevator Shaft" so should be detected even without this test since it has furniture
			// Let's test with just room names
			const roomOnlyManager = new ElevatorManager();
			const roomsWithoutFurniture = mockRooms.slice(); // Copy rooms
			const emptyFurniture: any[] = [];
			
			roomOnlyManager.updateData(roomsWithoutFurniture as any, emptyFurniture);
			
			const floors = roomOnlyManager.getFloorsWithElevators();
			expect(floors).toContain(1); // Should detect "Elevator Shaft" on floor 1
		});

		it('should check if floors have elevators', () => {
			expect(elevatorManager.hasElevatorOnFloor(0)).toBe(true);
			expect(elevatorManager.hasElevatorOnFloor(1)).toBe(true);
			expect(elevatorManager.hasElevatorOnFloor(2)).toBe(false); // No elevator on floor 2
		});
	});

	describe('elevator positioning', () => {
		it('should find best elevator position for existing floors', () => {
			const floor0Position = elevatorManager.findBestElevatorPosition(0);
			expect(floor0Position).not.toBeNull();
			expect(floor0Position?.roomName).toBe('Main Elevator');
			expect(typeof floor0Position?.x).toBe('number');
			expect(typeof floor0Position?.y).toBe('number');

			const floor1Position = elevatorManager.findBestElevatorPosition(1);
			expect(floor1Position).not.toBeNull();
			expect(floor1Position?.roomName).toBe('Elevator Shaft');
		});

		it('should provide fallback position for floors without elevators', () => {
			const floor2Position = elevatorManager.findBestElevatorPosition(2);
			expect(floor2Position).not.toBeNull();
			expect(floor2Position?.roomName).toBe('Engineering'); // Largest room as fallback
			expect(typeof floor2Position?.x).toBe('number');
			expect(typeof floor2Position?.y).toBe('number');
		});

		it('should prefer rooms with elevator in the name', () => {
			const floor1Position = elevatorManager.findBestElevatorPosition(1);
			// Should prefer "Elevator Shaft" over other rooms even if both have elevators
			expect(floor1Position?.roomName).toBe('Elevator Shaft');
		});
	});

	describe('elevator info', () => {
		it('should provide debug information', () => {
			const debugInfo = elevatorManager.getDebugInfo();
			expect(debugInfo).toHaveProperty('0');
			expect(debugInfo).toHaveProperty('1');
			
			expect(debugInfo[0]).toHaveLength(1);
			expect(debugInfo[0][0]).toHaveProperty('roomName', 'Main Elevator');
			expect(debugInfo[0][0]).toHaveProperty('position');
			expect(debugInfo[0][0]).toHaveProperty('isPreferred');
			expect(debugInfo[0][0]).toHaveProperty('furnitureId');
		});

		it('should get elevators on specific floor', () => {
			const floor0Elevators = elevatorManager.getElevatorsOnFloor(0);
			expect(floor0Elevators).toHaveLength(1);
			expect(floor0Elevators[0].roomName).toBe('Main Elevator');
			expect(floor0Elevators[0].floor).toBe(0);

			const floor1Elevators = elevatorManager.getElevatorsOnFloor(1); 
			expect(floor1Elevators).toHaveLength(1);
			expect(floor1Elevators[0].roomName).toBe('Elevator Shaft');
		});

		it('should return empty array for floors without elevators', () => {
			const floor2Elevators = elevatorManager.getElevatorsOnFloor(2);
			expect(floor2Elevators).toHaveLength(0);
		});
	});

	describe('safe positioning', () => {
		it('should provide safe positions within room bounds', () => {
			const floor0Position = elevatorManager.findBestElevatorPosition(0);
			const room = mockRooms.find(r => r.name === 'Main Elevator')!;
			
			// Position should be within room bounds
			expect(floor0Position!.x).toBeGreaterThanOrEqual(room.startX);
			expect(floor0Position!.x).toBeLessThanOrEqual(room.endX);
			expect(floor0Position!.y).toBeGreaterThanOrEqual(room.startY);
			expect(floor0Position!.y).toBeLessThanOrEqual(room.endY);
		});
	});
});