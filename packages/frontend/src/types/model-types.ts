// TypeScript utility types for LiveStore data models

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
	name?: string;
	game_id: string;
	templateId: string; // Reference to the room template ID
	type: string;
	// New rectangle positioning (preferred)
	startX?: number;
	startY?: number;
	endX?: number;
	endY?: number;
	// Legacy grid positioning (fallback)
	gridX?: number;
	gridY?: number;
	gridWidth?: number;
	gridHeight?: number;
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
	baseExplorationTime: number;
};

// DestinyStatus type with parsed JSON fields
export type DestinyStatusType = {
	id: string;
	game_id: string;
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
	game_id: string;
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

// Utility functions to convert LiveStore data to typed objects
export function roomDataToType(room: any): RoomType {
	let explorationData: ExplorationProgress | undefined;
	if (room.explorationData) {
		try {
			explorationData = JSON.parse(room.explorationData);
		} catch (error) {
			console.error('Failed to parse exploration data:', error);
		}
	}

	return {
		id: room.id,
		game_id: room.game_id,
		templateId: room.templateId,
		type: room.type,
		// New rectangle positioning (if available)
		startX: room.startX,
		startY: room.startY,
		endX: room.endX,
		endY: room.endY,
		// Legacy grid positioning (fallback)
		gridX: room.gridX,
		gridY: room.gridY,
		gridWidth: room.gridWidth,
		gridHeight: room.gridHeight,
		floor: room.floor,
		technology: room.technology ? JSON.parse(room.technology) : [],
		image: room.image,
		found: room.found || false,
		locked: room.locked,
		explored: room.explored || false,
		status: room.status || 'ok',
		connectedRooms: room.connectedRooms ? JSON.parse(room.connectedRooms) : [],
		doors: room.doors ? JSON.parse(room.doors) : [],
		explorationData,
		createdAt: room.createdAt,
		baseExplorationTime: room.baseExplorationTime || 2,
	};
}

export function destinyStatusDataToType(status: any): DestinyStatusType {
	return {
		id: status.id,
		game_id: status.game_id,
		name: status.name,
		power: status.power,
		maxPower: status.maxPower,
		shields: status.shields,
		maxShields: status.maxShields,
		hull: status.hull,
		maxHull: status.maxHull,
		raceId: status.raceId,
		crew: status.crew ? JSON.parse(status.crew) : [],
		location: status.location ? JSON.parse(status.location) : {},
		stargateId: status.stargateId,
		shield: status.shield ? JSON.parse(status.shield) : {},
		crewStatus: status.crewStatus ? JSON.parse(status.crewStatus) : {},
		atmosphere: status.atmosphere ? JSON.parse(status.atmosphere) : {},
		weapons: status.weapons ? JSON.parse(status.weapons) : {},
		shuttles: status.shuttles ? JSON.parse(status.shuttles) : {},
		notes: status.notes ? JSON.parse(status.notes) : undefined,
		gameDays: status.gameDays,
		gameHours: status.gameHours,
		ftlStatus: status.ftlStatus,
		nextFtlTransition: status.nextFtlTransition,
		createdAt: status.createdAt,
	};
}

export function personDataToType(person: any): PersonType {
	return {
		id: person.id,
		game_id: person.game_id,
		raceId: person.raceId,
		name: person.name,
		role: person.role,
		location: person.location ? JSON.parse(person.location) : {},
		assignedTo: person.assignedTo,
		skills: person.skills ? JSON.parse(person.skills) : [],
		description: person.description,
		image: person.image,
		conditions: person.conditions ? JSON.parse(person.conditions) : [],
		createdAt: person.createdAt,
	};
}

// Keep the old function names for backward compatibility (deprecated)
/** @deprecated Use destinyStatusDataToType instead */
export const destinyStatusModelToType = destinyStatusDataToType;

/** @deprecated Use roomDataToType instead */
export const roomModelToType = roomDataToType;

/** @deprecated Use personDataToType instead */
export const personModelToType = personDataToType;
