// Room table schema
const roomTable = {
	id: 'string',
	gameId: 'string',
	type: 'string',
	name: 'string',
	description: 'string?',
	gridX: 'number',
	gridY: 'number',
	gridWidth: 'number',
	gridHeight: 'number',
	floor: 'number',
	technology: 'string', // JSON stringified array
	image: 'string?',
	status: 'string', // 'ok' | 'damaged' | 'destroyed'
	found: 'boolean',
	locked: 'boolean',
	explored: 'boolean',
	connectedRooms: 'string', // JSON stringified array of room IDs
	doors: 'string', // JSON stringified array of door info
	baseExplorationTime: 'number?', // Optional base exploration time in hours
	createdAt: 'number',
	updatedAt: 'number',
};

// Crew table schema
const crewTable = {
	id: 'string',
	gameId: 'string',
	raceId: 'string?',
	name: 'string',
	role: 'string',
	location: 'string', // JSON stringified location
	assignedTo: 'string?',
	skills: 'string', // JSON stringified array
	description: 'string?',
	image: 'string?',
	conditions: 'string', // JSON stringified array
	createdAt: 'number',
	updatedAt: 'number',
};

// Ship layout table schema
const shipLayoutTable = {
	id: 'string',
	name: 'string',
	description: 'string?',
	layoutData: 'string', // JSON stringified layout object
	createdAt: 'number',
	updatedAt: 'number',
};

// Game table schema
const gameTable = {
	id: 'string',
	name: 'string',
	totalTimeProgressed: 'number',
	lastPlayed: 'number?',
	createdAt: 'number',
	updatedAt: 'number',
};

// Race table schema
const raceTable = {
	id: 'string',
	gameId: 'string',
	name: 'string',
	technology: 'string', // JSON stringified array/object
	ships: 'string', // JSON stringified array/object
	createdAt: 'number',
	updatedAt: 'number',
};

// Define the full schema as a plain object
export const stargateSchema = {
	rooms: roomTable,
	crew: crewTable,
	shipLayouts: shipLayoutTable,
	games: gameTable,
	races: raceTable,
};

export type StargateSchema = typeof stargateSchema;
