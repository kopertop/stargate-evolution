import Dexie from 'dexie';
import { Room, createRoom, RoomType } from '../types/room';

// Define the database
export class RoomDatabase extends Dexie {
	rooms!: Dexie.Table<Room, string>;

	constructor() {
		super('StargateEvolutionRooms');

		// Define the schema
		this.version(1).stores({
			rooms: 'id, planetId, type, isDiscovered'
		});
	}
}

// Create a single instance of the database
export const roomDb = new RoomDatabase();

// Helper function to get all rooms for a planet
export async function getRoomsForPlanet(planetId: string): Promise<Room[]> {
	return await roomDb.rooms.where('planetId').equals(planetId).toArray();
}

// Helper function to get a specific room by ID
export async function getRoomById(roomId: string): Promise<Room | undefined> {
	return await roomDb.rooms.get(roomId);
}

// Helper function to create a new room
export async function addRoom(roomData: Room): Promise<string> {
	return await roomDb.rooms.add(roomData);
}

// Helper function to update a room
export async function updateRoom(roomId: string, roomData: Partial<Room>): Promise<number> {
	return await roomDb.rooms.update(roomId, roomData);
}

// Helper function to discover a room (mark as discovered)
export async function discoverRoom(roomId: string): Promise<number> {
	return await roomDb.rooms.update(roomId, { isDiscovered: true });
}

// Helper functions to create standard room templates

// Create a standard stargate room
export function createStargateRoom(planetId: string, connections: Array<{ targetRoomId: string; }>): Room {
	return createRoom({
		id: `${planetId}-stargate-room`,
		name: 'Stargate Room',
		type: 'STARGATE_ROOM',
		description: 'A room containing the stargate.',
		position: { x: 0, y: 0, z: 0, rotation: 0 },
		planetId,
		connections: connections.map(connection => ({
			targetRoomId: connection.targetRoomId,
			position: { x: 0, y: 0, z: 5, rotation: Math.PI },
			isLocked: false
		})),
		isDiscovered: true // Stargate rooms are always discovered first
	});
}

// Create a standard corridor room
export function createCorridorRoom(planetId: string, id: string, connections: Array<{ targetRoomId: string; }>): Room {
	return createRoom({
		id,
		name: 'Corridor',
		type: 'CORRIDOR',
		description: 'A corridor connecting different rooms.',
		position: { x: 0, y: 0, z: 10, rotation: 0 }, // This will be overridden when placed
		planetId,
		connections: connections.map(connection => ({
			targetRoomId: connection.targetRoomId,
			position: { x: 0, y: 0, z: 5, rotation: Math.PI },
			isLocked: false
		})),
		isDiscovered: false
	});
}

// Create a command center room
export function createCommandRoom(planetId: string, id: string, connections: Array<{ targetRoomId: string; }>): Room {
	return createRoom({
		id,
		name: 'Command Center',
		type: 'COMMAND_CENTER',
		description: 'A control room with monitoring systems.',
		position: { x: 10, y: 0, z: 10, rotation: 0 }, // This will be overridden when placed
		planetId,
		connections: connections.map(connection => ({
			targetRoomId: connection.targetRoomId,
			position: { x: 0, y: 0, z: 5, rotation: Math.PI },
			isLocked: false
		})),
		isDiscovered: false
	});
}
