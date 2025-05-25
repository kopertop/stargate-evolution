// TypeScript utility types to infer types from WatermelonDB models
import type DestinyStatusModel from '@stargate/db/models/destiny-status';
import type PersonModel from '@stargate/db/models/person';
import type RoomModel from '@stargate/db/models/room';

// Door types for Room model
export interface DoorInfo {
	toRoomId: string;
	state: 'closed' | 'opened' | 'locked';
	requirements: DoorRequirement[];
	description?: string;
}

export interface DoorRequirement {
	type: 'code' | 'item' | 'technology' | 'crew_skill' | 'power_level' | 'story_progress';
	value: string;
	description: string;
	met: boolean;
}

// Room type with parsed JSON fields
export type RoomType = {
	id: string;
	gameId: string;
	type: string;
	gridX: number;
	gridY: number;
	gridWidth: number;
	gridHeight: number;
	floor: number;
	technology: string[]; // Parse JSON string to array
	image?: string;
	found: boolean;
	locked: boolean;
	status: 'damaged' | 'destroyed' | 'ok';
	connectedRooms: string[]; // Parse JSON string to array
	doors: DoorInfo[]; // Parse JSON string to array
	createdAt: Date;
	unlocked?: boolean; // Add computed property
};

// DestinyStatus type with parsed JSON fields
export type DestinyStatusType = {
	id: string;
	gameId: string;
	name: string;
	power: number;
	maxPower: number;
	shields: number;
	maxShields: number;
	hull: number;
	maxHull: number;
	raceId: string;
	crew: string[]; // Parse JSON string to array
	location: { [key: string]: any }; // Parse JSON string to object
	stargateId?: string;
	shield: { [key: string]: any }; // Parse JSON string to object
	inventory: { [key: string]: number }; // Parse JSON string to object
	crewStatus: { [key: string]: any }; // Parse JSON string to object
	atmosphere: { [key: string]: any }; // Parse JSON string to object
	weapons: { [key: string]: any }; // Parse JSON string to object
	shuttles: { [key: string]: any }; // Parse JSON string to object
	notes?: string[]; // Parse JSON string to array
	gameDays: number;
	gameHours: number;
	ftlStatus: string;
	nextFtlTransition: number;
	createdAt: Date;
};

// Person type with parsed JSON fields
export type PersonType = {
	id: string;
	gameId: string;
	raceId: string;
	name: string;
	role: string;
	location: { [key: string]: any }; // Parse JSON string to object
	assignedTo?: string;
	skills: string[]; // Parse JSON string to array
	description?: string;
	image?: string;
	conditions: string[]; // Parse JSON string to array
	createdAt: Date;
};

// Utility functions to convert model instances to typed objects
export function roomModelToType(room: RoomModel): RoomType {
	return {
		id: room.id,
		gameId: room.gameId,
		type: room.type,
		gridX: room.gridX,
		gridY: room.gridY,
		gridWidth: room.gridWidth,
		gridHeight: room.gridHeight,
		floor: room.floor,
		technology: JSON.parse(room.technology || '[]'),
		image: room.image,
		found: room.found,
		locked: room.locked,
		status: room.status,
		connectedRooms: JSON.parse(room.connectedRooms || '[]'),
		doors: JSON.parse(room.doors || '[]'),
		createdAt: room.createdAt,
		unlocked: !room.locked && room.found, // Computed property
	};
}

export function destinyStatusModelToType(status: DestinyStatusModel): DestinyStatusType {
	return {
		id: status.id,
		gameId: status.gameId,
		name: status.name,
		power: status.power,
		maxPower: status.maxPower,
		shields: status.shields,
		maxShields: status.maxShields,
		hull: status.hull,
		maxHull: status.maxHull,
		raceId: status.raceId,
		crew: JSON.parse(status.crew || '[]'),
		location: JSON.parse(status.location || '{}'),
		stargateId: status.stargateId,
		shield: JSON.parse(status.shield || '{}'),
		inventory: JSON.parse(status.inventory || '{}'),
		crewStatus: JSON.parse(status.crewStatus || '{}'),
		atmosphere: JSON.parse(status.atmosphere || '{}'),
		weapons: JSON.parse(status.weapons || '{}'),
		shuttles: JSON.parse(status.shuttles || '{}'),
		notes: status.notes ? JSON.parse(status.notes) : undefined,
		gameDays: status.gameDays,
		gameHours: status.gameHours,
		ftlStatus: status.ftlStatus,
		nextFtlTransition: status.nextFtlTransition,
		createdAt: status.createdAt,
	};
}

export function personModelToType(person: PersonModel): PersonType {
	return {
		id: person.id,
		gameId: person.gameId,
		raceId: person.raceId,
		name: person.name,
		role: person.role,
		location: JSON.parse(person.location || '{}'),
		assignedTo: person.assignedTo,
		skills: JSON.parse(person.skills || '[]'),
		description: person.description,
		image: person.image,
		conditions: JSON.parse(person.conditions || '[]'),
		createdAt: person.createdAt,
	};
}
