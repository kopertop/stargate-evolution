import type { RoomTemplate, RoomFurniture } from '@stargate/common';

export interface ElevatorInfo {
	floor: number;
	roomId: string;
	roomName: string;
	elevatorFurnitureId: string;
	safePosition: { x: number; y: number };
	isPreferred: boolean; // True if this is the main elevator shaft, false for secondary
}

export class ElevatorManager {
	private elevators: Map<number, ElevatorInfo[]> = new Map(); // Floor -> ElevatorInfo[]
	private rooms: RoomTemplate[] = [];
	private furniture: RoomFurniture[] = [];

	/**
	 * Update the rooms and furniture data and rebuild elevator mapping
	 */
	public updateData(rooms: RoomTemplate[], furniture: RoomFurniture[]): void {
		this.rooms = rooms;
		this.furniture = furniture;
		this.buildElevatorMapping();
	}

	/**
	 * Build a complete mapping of elevators across all floors
	 */
	private buildElevatorMapping(): void {
		this.elevators.clear();
		console.log('[ELEVATOR-MGR] Building elevator mapping...');

		// Find all elevator consoles/furniture
		const elevatorFurniture = this.furniture.filter(f =>
			f.furniture_type === 'elevator_console' ||
			f.furniture_type === 'elevator-console' ||
			f.furniture_type === 'elevator',
		);

		console.log('[ELEVATOR-MGR] Found', elevatorFurniture.length, 'elevator furniture items');

		// Group elevators by floor
		for (const elevator of elevatorFurniture) {
			const room = this.rooms.find(r => r.id === elevator.room_id);
			if (!room) {
				console.warn('[ELEVATOR-MGR] Elevator furniture has no room:', elevator);
				continue;
			}

			const floor = room.floor;
			if (!this.elevators.has(floor)) {
				this.elevators.set(floor, []);
			}

			// Calculate safe spawn position in the elevator room
			const safePosition = this.findSafeSpawnPositionInRoom(room, floor);

			// Determine if this is a preferred elevator (main shaft vs secondary)
			const isPreferred = this.isPreferredElevator(room, elevator);

			const elevatorInfo: ElevatorInfo = {
				floor,
				roomId: room.id,
				roomName: room.name,
				elevatorFurnitureId: elevator.id,
				safePosition,
				isPreferred,
			};

			this.elevators.get(floor)!.push(elevatorInfo);
			console.log('[ELEVATOR-MGR] Mapped elevator on floor', floor, ':', elevatorInfo);
		}

		// Also find rooms that might be elevator shafts without explicit furniture
		this.findElevatorRoomsByName();

		console.log('[ELEVATOR-MGR] Elevator mapping complete. Floors with elevators:', Array.from(this.elevators.keys()).sort());
	}

	/**
	 * Find rooms that are likely elevator shafts based on naming patterns
	 */
	private findElevatorRoomsByName(): void {
		const elevatorNamePatterns = [
			/elevator/i,
			/lift/i,
			/shaft/i,
			/transport/i,
		];

		for (const room of this.rooms) {
			// Skip if we already have an elevator on this floor
			const existingElevators = this.elevators.get(room.floor) || [];
			if (existingElevators.length > 0) continue;

			// Check if room name suggests it's an elevator
			const isElevatorRoom = elevatorNamePatterns.some(pattern => pattern.test(room.name));
			if (isElevatorRoom) {
				const floor = room.floor;
				if (!this.elevators.has(floor)) {
					this.elevators.set(floor, []);
				}

				const safePosition = this.findSafeSpawnPositionInRoom(room, floor);
				const elevatorInfo: ElevatorInfo = {
					floor,
					roomId: room.id,
					roomName: room.name,
					elevatorFurnitureId: '', // No specific furniture
					safePosition,
					isPreferred: true, // Assume elevator rooms are preferred
				};

				this.elevators.get(floor)!.push(elevatorInfo);
				console.log('[ELEVATOR-MGR] Found elevator room by name on floor', floor, ':', elevatorInfo);
			}
		}
	}

	/**
	 * Determine if an elevator is preferred (main shaft vs secondary)
	 */
	private isPreferredElevator(room: RoomTemplate, elevator: RoomFurniture): boolean {
		// Prefer rooms with "elevator" in the name
		if (/elevator/i.test(room.name)) return true;

		// Prefer larger rooms (main elevator shafts are usually bigger)
		const roomArea = (room.endX - room.startX) * (room.endY - room.startY);
		return roomArea > 10000; // Arbitrary threshold for "large" rooms
	}

	/**
	 * Find the best elevator position for a target floor
	 */
	public findBestElevatorPosition(targetFloor: number): { x: number; y: number; roomName: string } | null {
		const elevatorsOnFloor = this.elevators.get(targetFloor);
		if (!elevatorsOnFloor || elevatorsOnFloor.length === 0) {
			console.warn('[ELEVATOR-MGR] No elevators found on floor', targetFloor);
			return this.findFallbackPosition(targetFloor);
		}

		// Prefer main elevators over secondary ones
		const preferredElevators = elevatorsOnFloor.filter(e => e.isPreferred);
		const elevator = preferredElevators.length > 0 ? preferredElevators[0] : elevatorsOnFloor[0];

		console.log('[ELEVATOR-MGR] Selected elevator on floor', targetFloor, ':', elevator);
		return {
			x: elevator.safePosition.x,
			y: elevator.safePosition.y,
			roomName: elevator.roomName,
		};
	}

	/**
	 * Find a fallback position if no elevator is found
	 */
	private findFallbackPosition(targetFloor: number): { x: number; y: number; roomName: string } | null {
		const floorRooms = this.rooms.filter(room => room.floor === targetFloor);
		if (floorRooms.length === 0) {
			console.warn('[ELEVATOR-MGR] No rooms found on floor', targetFloor);
			return null;
		}

		// First, try to find rooms that might be elevator-related by name
		const elevatorNamePatterns = [/elevator/i, /lift/i, /shaft/i, /transport/i, /access/i];
		const elevatorRooms = floorRooms.filter(room =>
			elevatorNamePatterns.some(pattern => pattern.test(room.name)),
		);

		if (elevatorRooms.length > 0) {
			// Use the first elevator-related room found
			const landingRoom = elevatorRooms[0];
			const safePosition = this.findSafeSpawnPositionInRoom(landingRoom, targetFloor);
			console.log('[ELEVATOR-MGR] Using elevator-related room as fallback on floor', targetFloor, 'in room:', landingRoom.name);

			return {
				x: safePosition.x,
				y: safePosition.y,
				roomName: landingRoom.name,
			};
		}

		// If no elevator-related rooms, find the largest room as the safest landing spot
		const landingRoom = floorRooms.reduce((largest, current) => {
			const currentArea = (current.endX - current.startX) * (current.endY - current.startY);
			const largestArea = (largest.endX - largest.startX) * (largest.endY - largest.startY);
			return currentArea > largestArea ? current : largest;
		});

		const safePosition = this.findSafeSpawnPositionInRoom(landingRoom, targetFloor);
		console.log('[ELEVATOR-MGR] Using largest room as fallback on floor', targetFloor, 'in room:', landingRoom.name);

		return {
			x: safePosition.x,
			y: safePosition.y,
			roomName: landingRoom.name,
		};
	}

	/**
	 * Find a safe spawn position within a room, avoiding furniture
	 */
	private findSafeSpawnPositionInRoom(room: RoomTemplate, targetFloor: number): { x: number; y: number } {
		// Get all furniture in this room on this floor to avoid
		const roomFurniture = this.furniture.filter(f => {
			const furnitureRoom = this.rooms.find(r => r.id === f.room_id);
			return furnitureRoom?.id === room.id && furnitureRoom?.floor === targetFloor;
		});

		// Try to find a safe spot in the center-ish area, avoiding furniture
		const roomCenterX = room.startX + (room.endX - room.startX) / 2;
		const roomCenterY = room.startY + (room.endY - room.startY) / 2;
		const safeMargin = 100; // pixels

		// Check if center is safe (no furniture nearby)
		const isCenterSafe = !roomFurniture.some(f => {
			const distance = Math.sqrt((f.x - roomCenterX) ** 2 + (f.y - roomCenterY) ** 2);
			return distance < safeMargin;
		});

		if (isCenterSafe) {
			return { x: roomCenterX, y: roomCenterY };
		}

		// If center is not safe, try different positions
		const positions = [
			{ x: room.startX + safeMargin, y: room.startY + safeMargin }, // Top-left
			{ x: room.endX - safeMargin, y: room.startY + safeMargin },   // Top-right
			{ x: room.startX + safeMargin, y: room.endY - safeMargin },   // Bottom-left
			{ x: room.endX - safeMargin, y: room.endY - safeMargin },     // Bottom-right
		];

		for (const pos of positions) {
			const isSafe = !roomFurniture.some(f => {
				const distance = Math.sqrt((f.x - pos.x) ** 2 + (f.y - pos.y) ** 2);
				return distance < safeMargin;
			});

			if (isSafe) {
				return pos;
			}
		}

		// Fallback: use room center even if not ideal
		console.warn('[ELEVATOR-MGR] Could not find safe position in room', room.name, '- using center');
		return { x: roomCenterX, y: roomCenterY };
	}

	/**
	 * Get all available floors with elevators
	 */
	public getFloorsWithElevators(): number[] {
		return Array.from(this.elevators.keys()).sort((a, b) => a - b);
	}

	/**
	 * Get elevator info for a specific floor
	 */
	public getElevatorsOnFloor(floor: number): ElevatorInfo[] {
		return this.elevators.get(floor) || [];
	}

	/**
	 * Check if a floor has elevators
	 */
	public hasElevatorOnFloor(floor: number): boolean {
		const elevators = this.elevators.get(floor);
		return elevators !== undefined && elevators.length > 0;
	}

	/**
	 * Get debug info about all elevators
	 */
	public getDebugInfo(): any {
		const result: any = {};
		for (const [floor, elevators] of this.elevators.entries()) {
			result[floor] = elevators.map(e => ({
				roomName: e.roomName,
				position: e.safePosition,
				isPreferred: e.isPreferred,
				furnitureId: e.elevatorFurnitureId,
			}));
		}
		return result;
	}
}
