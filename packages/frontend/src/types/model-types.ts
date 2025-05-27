// TODO: Migrate all model types to use Zod types from @stargate/db
import type { DestinyStatus, Person, Room } from '@stargate/db';

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

// Exploration progress interface
export interface ExplorationProgress {
	roomId: string;
	progress: number; // 0-100
	crewAssigned: string[];
	timeRemaining: number; // in hours
	timeToComplete: number; // in hours
	startTime: number; // timestamp
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
	locked?: boolean;
	explored?: boolean;
	status: 'damaged' | 'destroyed' | 'ok';
	connectedRooms: string[]; // Parse JSON string to array
	doors: DoorInfo[]; // Parse JSON string to array
	explorationData?: ExplorationProgress; // Parse JSON string to object
	createdAt: Date;
	baseExplorationTime?: number;
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
export function roomModelToType(room: Room): RoomType {
	let explorationData: ExplorationProgress | undefined;
	if (room.explorationData) {
		try {
			explorationData = typeof room.explorationData === 'string' ? JSON.parse(room.explorationData) : room.explorationData;
		} catch {
			explorationData = undefined;
		}
	}
	return {
		...room,
		technology: typeof room.technology === 'string' ? JSON.parse(room.technology) : [],
		connectedRooms: typeof room.connectedRooms === 'string' ? JSON.parse(room.connectedRooms) : [],
		doors: typeof room.doors === 'string' ? JSON.parse(room.doors) : [],
		explorationData,
		baseExplorationTime: room.baseExplorationTime ?? 2,
	};
}

export function destinyStatusModelToType(status: DestinyStatus): DestinyStatusType {
	return {
		...status,
		shield: typeof status.shield === 'string' ? JSON.parse(status.shield) : undefined,
		inventory: typeof status.inventory === 'string' ? JSON.parse(status.inventory) : [],
		crewStatus: typeof status.crewStatus === 'string' ? JSON.parse(status.crewStatus) : [],
		atmosphere: typeof status.atmosphere === 'string' ? JSON.parse(status.atmosphere) : undefined,
		weapons: typeof status.weapons === 'string' ? JSON.parse(status.weapons) : [],
		shuttles: typeof status.shuttles === 'string' ? JSON.parse(status.shuttles) : [],
		notes: typeof status.notes === 'string' ? JSON.parse(status.notes) : [],
	};
}

export function personModelToType(person: Person): PersonType {
	return {
		...person,
		raceId: person.raceId || '',
		skills: typeof person.skills === 'string' ? JSON.parse(person.skills) : [],
		conditions: typeof person.conditions === 'string' ? JSON.parse(person.conditions) : [],
	};
}
