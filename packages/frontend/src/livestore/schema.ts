import { Events, makeSchema, Schema, SessionIdSymbol, State } from '@livestore/livestore';

// Core game tables
export const tables = {
	// Game management
	games: State.SQLite.table({
		name: 'games',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			name: State.SQLite.text(),
			totalTimeProgressed: State.SQLite.real({ default: 0 }),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			lastPlayed: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Universe structure
	galaxies: State.SQLite.table({
		name: 'galaxies',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			name: State.SQLite.text(),
			x: State.SQLite.real(),
			y: State.SQLite.real(),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	starSystems: State.SQLite.table({
		name: 'star_systems',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			galaxyId: State.SQLite.text(),
			name: State.SQLite.text(),
			x: State.SQLite.real(),
			y: State.SQLite.real(),
			description: State.SQLite.text({ nullable: true }),
			image: State.SQLite.text({ nullable: true }),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	stars: State.SQLite.table({
		name: 'stars',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			starSystemId: State.SQLite.text(),
			name: State.SQLite.text(),
			type: State.SQLite.text(),
			description: State.SQLite.text({ nullable: true }),
			image: State.SQLite.text({ nullable: true }),
			radius: State.SQLite.real(),
			mass: State.SQLite.real(),
			temperature: State.SQLite.real(),
			luminosity: State.SQLite.real(),
			age: State.SQLite.real(),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	planets: State.SQLite.table({
		name: 'planets',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			starSystemId: State.SQLite.text(),
			name: State.SQLite.text(),
			type: State.SQLite.text(),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Civilizations and people
	races: State.SQLite.table({
		name: 'races',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			name: State.SQLite.text(),
			technology: State.SQLite.text(),
			ships: State.SQLite.text(),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	people: State.SQLite.table({
		name: 'people',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			raceId: State.SQLite.text(),
			name: State.SQLite.text(),
			role: State.SQLite.text(),
			location: State.SQLite.text(),
			assignedTo: State.SQLite.text({ nullable: true }),
			skills: State.SQLite.text(),
			description: State.SQLite.text({ nullable: true }),
			image: State.SQLite.text({ nullable: true }),
			conditions: State.SQLite.text(),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Technology and ships
	technology: State.SQLite.table({
		name: 'technology',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			name: State.SQLite.text(),
			description: State.SQLite.text(),
			unlocked: State.SQLite.boolean({ default: false }),
			cost: State.SQLite.real(),
			image: State.SQLite.text({ nullable: true }),
			numberOnDestiny: State.SQLite.real({ nullable: true }),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	ships: State.SQLite.table({
		name: 'ships',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			raceId: State.SQLite.text(),
			name: State.SQLite.text(),
			power: State.SQLite.real(),
			maxPower: State.SQLite.real(),
			shields: State.SQLite.real(),
			maxShields: State.SQLite.real(),
			hull: State.SQLite.real(),
			maxHull: State.SQLite.real(),
			crew: State.SQLite.text(),
			location: State.SQLite.text(),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Stargate network
	stargates: State.SQLite.table({
		name: 'stargates',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			address: State.SQLite.text(),
			type: State.SQLite.text(),
			locationId: State.SQLite.text({ nullable: true }),
			connectedTo: State.SQLite.text(),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	chevrons: State.SQLite.table({
		name: 'chevrons',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			stargateId: State.SQLite.text(),
			symbol: State.SQLite.text(),
			description: State.SQLite.text({ nullable: true }),
			image: State.SQLite.text({ nullable: true }),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Ship rooms and layout
	rooms: State.SQLite.table({
		name: 'rooms',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			templateId: State.SQLite.text({ nullable: true }),
			type: State.SQLite.text(),
			// New rectangle positioning
			startX: State.SQLite.real({ nullable: true }),
			startY: State.SQLite.real({ nullable: true }),
			endX: State.SQLite.real({ nullable: true }),
			endY: State.SQLite.real({ nullable: true }),
			// Legacy grid positioning
			gridX: State.SQLite.real({ nullable: true }),
			gridY: State.SQLite.real({ nullable: true }),
			gridWidth: State.SQLite.real({ nullable: true }),
			gridHeight: State.SQLite.real({ nullable: true }),
			floor: State.SQLite.real(),
			technology: State.SQLite.text(), // JSON array stored as text
			image: State.SQLite.text({ nullable: true }),
			found: State.SQLite.boolean({ nullable: true }),
			locked: State.SQLite.boolean({ nullable: true }),
			explored: State.SQLite.boolean({ nullable: true }),
			status: State.SQLite.text({ default: 'ok' }), // 'damaged' | 'destroyed' | 'ok'
			connectedRooms: State.SQLite.text(), // JSON array stored as text
			doors: State.SQLite.text(), // JSON array stored as text
			explorationData: State.SQLite.text({ nullable: true }), // JSON stored as text
			baseExplorationTime: State.SQLite.real({ nullable: true }),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Destiny ship status
	destinyStatus: State.SQLite.table({
		name: 'destiny_status',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			name: State.SQLite.text(),
			power: State.SQLite.real(),
			maxPower: State.SQLite.real(),
			shields: State.SQLite.real(),
			maxShields: State.SQLite.real(),
			hull: State.SQLite.real(),
			maxHull: State.SQLite.real(),
			raceId: State.SQLite.text(),
			crew: State.SQLite.text(), // JSON array stored as text
			location: State.SQLite.text(), // JSON stored as text
			stargateId: State.SQLite.text({ nullable: true }),
			shield: State.SQLite.text(), // JSON stored as text
			crewStatus: State.SQLite.text(), // JSON stored as text
			atmosphere: State.SQLite.text(), // JSON stored as text
			weapons: State.SQLite.text(), // JSON stored as text
			shuttles: State.SQLite.text(), // JSON stored as text
			notes: State.SQLite.text({ nullable: true }), // JSON array stored as text
			gameDays: State.SQLite.real(),
			gameHours: State.SQLite.real(),
			ftlStatus: State.SQLite.text({ default: 'normal_space' }), // 'ftl' or 'normal_space'
			nextFtlTransition: State.SQLite.real(),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Inventory management
	inventory: State.SQLite.table({
		name: 'inventory',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			gameId: State.SQLite.text(),
			resourceType: State.SQLite.text(),
			amount: State.SQLite.real(),
			location: State.SQLite.text({ nullable: true }), // e.g., 'ship', 'room_id', etc.
			description: State.SQLite.text({ nullable: true }),
			createdAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updatedAt: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Client-side UI state
	uiState: State.SQLite.clientDocument({
		name: 'uiState',
		schema: Schema.Struct({
			selectedGameId: Schema.optional(Schema.String),
			currentView: Schema.String,
			selectedRoomId: Schema.optional(Schema.String),
			mapZoom: Schema.Number,
			mapCenterX: Schema.Number,
			mapCenterY: Schema.Number,
		}),
		default: {
			id: SessionIdSymbol,
			value: {
				currentView: 'menu',
				mapZoom: 1,
				mapCenterX: 0,
				mapCenterY: 0,
			},
		},
	}),
};

// Events describe data changes
export const events = {
	// Game management events
	gameCreated: Events.synced({
		name: 'v1.GameCreated',
		schema: Schema.Struct({
			id: Schema.String,
			name: Schema.String,
			createdAt: Schema.Date,
		}),
	}),

	gameUpdated: Events.synced({
		name: 'v1.GameUpdated',
		schema: Schema.Struct({
			id: Schema.String,
			totalTimeProgressed: Schema.optional(Schema.Number),
			lastPlayed: Schema.optional(Schema.Date),
		}),
	}),

	gameDeleted: Events.synced({
		name: 'v1.GameDeleted',
		schema: Schema.Struct({
			id: Schema.String,
			deletedAt: Schema.Date,
		}),
	}),

	// Room exploration events
	roomExplorationStarted: Events.synced({
		name: 'v1.RoomExplorationStarted',
		schema: Schema.Struct({
			roomId: Schema.String,
			crewAssigned: Schema.Array(Schema.String),
			startTime: Schema.Date,
		}),
	}),

	roomExplorationCompleted: Events.synced({
		name: 'v1.RoomExplorationCompleted',
		schema: Schema.Struct({
			roomId: Schema.String,
			completedAt: Schema.Date,
			discovered: Schema.Array(Schema.String),
		}),
	}),

	// Destiny status updates
	destinyStatusCreated: Events.synced({
		name: 'v1.DestinyStatusCreated',
		schema: Schema.Struct({
			id: Schema.String,
			gameId: Schema.String,
			name: Schema.String,
			power: Schema.Number,
			maxPower: Schema.Number,
			shields: Schema.Number,
			maxShields: Schema.Number,
			hull: Schema.Number,
			maxHull: Schema.Number,
			raceId: Schema.String,
			crew: Schema.String,
			location: Schema.String,
			stargateId: Schema.optional(Schema.String),
			shield: Schema.String,
			crewStatus: Schema.String,
			atmosphere: Schema.String,
			weapons: Schema.String,
			shuttles: Schema.String,
			notes: Schema.optional(Schema.String),
			gameDays: Schema.Number,
			gameHours: Schema.Number,
			ftlStatus: Schema.String,
			nextFtlTransition: Schema.Number,
			createdAt: Schema.Date,
		}),
	}),

	destinyStatusUpdated: Events.synced({
		name: 'v1.DestinyStatusUpdated',
		schema: Schema.Struct({
			gameId: Schema.String,
			power: Schema.optional(Schema.Number),
			shields: Schema.optional(Schema.Number),
			hull: Schema.optional(Schema.Number),
			gameDays: Schema.optional(Schema.Number),
			gameHours: Schema.optional(Schema.Number),
			ftlStatus: Schema.optional(Schema.String),
		}),
	}),

	// Universe structure events
	galaxyCreated: Events.synced({
		name: 'v1.GalaxyCreated',
		schema: Schema.Struct({
			id: Schema.String,
			gameId: Schema.String,
			name: Schema.String,
			x: Schema.Number,
			y: Schema.Number,
			createdAt: Schema.Date,
		}),
	}),

	starSystemCreated: Events.synced({
		name: 'v1.StarSystemCreated',
		schema: Schema.Struct({
			id: Schema.String,
			gameId: Schema.String,
			galaxyId: Schema.String,
			name: Schema.String,
			x: Schema.Number,
			y: Schema.Number,
			description: Schema.optional(Schema.String),
			image: Schema.optional(Schema.String),
			createdAt: Schema.Date,
		}),
	}),

	// Civilization events
	raceCreated: Events.synced({
		name: 'v1.RaceCreated',
		schema: Schema.Struct({
			id: Schema.String,
			gameId: Schema.String,
			name: Schema.String,
			technology: Schema.String,
			ships: Schema.String,
			createdAt: Schema.Date,
		}),
	}),

	personCreated: Events.synced({
		name: 'v1.PersonCreated',
		schema: Schema.Struct({
			id: Schema.String,
			gameId: Schema.String,
			raceId: Schema.String,
			name: Schema.String,
			role: Schema.String,
			location: Schema.String,
			assignedTo: Schema.optional(Schema.String),
			skills: Schema.String,
			description: Schema.optional(Schema.String),
			image: Schema.optional(Schema.String),
			conditions: Schema.String,
			createdAt: Schema.Date,
		}),
	}),

	// Ship structure events
	roomCreated: Events.synced({
		name: 'v1.RoomCreated',
		schema: Schema.Struct({
			id: Schema.String,
			gameId: Schema.String,
			templateId: Schema.optional(Schema.String),
			type: Schema.String,
			startX: Schema.optional(Schema.Number),
			startY: Schema.optional(Schema.Number),
			endX: Schema.optional(Schema.Number),
			endY: Schema.optional(Schema.Number),
			gridX: Schema.optional(Schema.Number),
			gridY: Schema.optional(Schema.Number),
			gridWidth: Schema.optional(Schema.Number),
			gridHeight: Schema.optional(Schema.Number),
			floor: Schema.Number,
			technology: Schema.String,
			image: Schema.optional(Schema.String),
			found: Schema.optional(Schema.Boolean),
			locked: Schema.optional(Schema.Boolean),
			explored: Schema.optional(Schema.Boolean),
			status: Schema.String,
			connectedRooms: Schema.String,
			doors: Schema.String,
			explorationData: Schema.optional(Schema.String),
			baseExplorationTime: Schema.optional(Schema.Number),
			createdAt: Schema.Date,
		}),
	}),

	// Inventory events
	inventoryAdded: Events.synced({
		name: 'v1.InventoryAdded',
		schema: Schema.Struct({
			id: Schema.String,
			gameId: Schema.String,
			resourceType: Schema.String,
			amount: Schema.Number,
			location: Schema.optional(Schema.String),
			description: Schema.optional(Schema.String),
			createdAt: Schema.Date,
		}),
	}),

	inventoryUpdated: Events.synced({
		name: 'v1.InventoryUpdated',
		schema: Schema.Struct({
			id: Schema.String,
			amount: Schema.optional(Schema.Number),
			location: Schema.optional(Schema.String),
			description: Schema.optional(Schema.String),
		}),
	}),

	inventoryRemoved: Events.synced({
		name: 'v1.InventoryRemoved',
		schema: Schema.Struct({
			id: Schema.String,
		}),
	}),

	// Technology events
	technologyUnlocked: Events.synced({
		name: 'v1.TechnologyUnlocked',
		schema: Schema.Struct({
			id: Schema.String,
			gameId: Schema.String,
			unlockedAt: Schema.Date,
		}),
	}),

	// UI state events (local only)
	uiStateSet: tables.uiState.set,

	roomUpdated: Events.synced({
		name: 'v1.RoomUpdated',
		schema: Schema.Struct({
			id: Schema.String,
			found: Schema.optional(Schema.Boolean),
			locked: Schema.optional(Schema.Boolean),
			explored: Schema.optional(Schema.Boolean),
			status: Schema.optional(Schema.String),
			connectedRooms: Schema.optional(Schema.String),
			doors: Schema.optional(Schema.String),
			explorationData: Schema.optional(Schema.String),
			updatedAt: Schema.Date,
		}),
	}),
};

// Materializers map events to state changes
const materializers = State.SQLite.materializers(events, {
	'v1.GameCreated': ({ id, name, createdAt }) =>
		tables.games.insert({
			id,
			name,
			totalTimeProgressed: 0,
			createdAt,
			updatedAt: createdAt,
			lastPlayed: createdAt,
		}),

	'v1.GameUpdated': ({ id, totalTimeProgressed, lastPlayed }) =>
		tables.games.update({
			...(totalTimeProgressed !== undefined && { totalTimeProgressed }),
			...(lastPlayed !== undefined && { lastPlayed }),
			updatedAt: new Date(),
		}).where({ id }),

	'v1.GameDeleted': ({ id }) =>
		tables.games.delete().where({ id }),

	'v1.RoomExplorationStarted': ({ roomId, crewAssigned, startTime }) =>
		tables.rooms.update({
			explorationData: JSON.stringify({
				status: 'in_progress',
				crewAssigned,
				startTime: startTime.getTime(),
			}),
		}).where({ id: roomId }),

	'v1.RoomExplorationCompleted': ({ roomId, completedAt, discovered }) =>
		tables.rooms.update({
			explored: true,
			explorationData: JSON.stringify({
				status: 'completed',
				completedAt: completedAt.getTime(),
				discovered,
			}),
		}).where({ id: roomId }),

	'v1.DestinyStatusCreated': ({ id, gameId, name, power, maxPower, shields, maxShields, hull, maxHull, raceId, crew, location, stargateId, shield, crewStatus, atmosphere, weapons, shuttles, notes, gameDays, gameHours, ftlStatus, nextFtlTransition, createdAt }) =>
		tables.destinyStatus.insert({
			id,
			gameId,
			name,
			power,
			maxPower,
			shields,
			maxShields,
			hull,
			maxHull,
			raceId,
			crew,
			location,
			stargateId,
			shield,
			crewStatus,
			atmosphere,
			weapons,
			shuttles,
			notes,
			gameDays,
			gameHours,
			ftlStatus,
			nextFtlTransition,
			createdAt,
		}),

	'v1.GalaxyCreated': ({ id, gameId, name, x, y, createdAt }) =>
		tables.galaxies.insert({
			id,
			gameId,
			name,
			x,
			y,
			createdAt,
		}),

	'v1.StarSystemCreated': ({ id, gameId, galaxyId, name, x, y, description, image, createdAt }) =>
		tables.starSystems.insert({
			id,
			gameId,
			galaxyId,
			name,
			x,
			y,
			description,
			image,
			createdAt,
		}),

	'v1.RaceCreated': ({ id, gameId, name, technology, ships, createdAt }) =>
		tables.races.insert({
			id,
			gameId,
			name,
			technology,
			ships,
			createdAt,
		}),

	'v1.PersonCreated': ({ id, gameId, raceId, name, role, location, assignedTo, skills, description, image, conditions, createdAt }) =>
		tables.people.insert({
			id,
			gameId,
			raceId,
			name,
			role,
			location,
			assignedTo,
			skills,
			description,
			image,
			conditions,
			createdAt,
		}),

	'v1.RoomCreated': ({ id, gameId, templateId, type, startX, startY, endX, endY, gridX, gridY, gridWidth, gridHeight, floor, technology, image, found, locked, explored, status, connectedRooms, doors, explorationData, baseExplorationTime, createdAt }) =>
		tables.rooms.insert({
			id,
			gameId,
			templateId,
			type,
			startX,
			startY,
			endX,
			endY,
			gridX,
			gridY,
			gridWidth,
			gridHeight,
			floor,
			technology,
			image,
			found,
			locked,
			explored,
			status,
			connectedRooms,
			doors,
			explorationData,
			baseExplorationTime,
			createdAt,
		}),

	'v1.DestinyStatusUpdated': ({ gameId, ...updates }) =>
		tables.destinyStatus.update({
			...updates,
		}).where({ gameId }),

	'v1.TechnologyUnlocked': ({ id }) =>
		tables.technology.update({ unlocked: true }).where({ id }),

	'v1.InventoryAdded': ({ id, gameId, resourceType, amount, location, description, createdAt }) =>
		tables.inventory.insert({
			id,
			gameId,
			resourceType,
			amount,
			location,
			description,
			createdAt,
			updatedAt: createdAt,
		}),

	'v1.InventoryUpdated': ({ id, ...updates }) =>
		tables.inventory.update({
			...updates,
			updatedAt: new Date(),
		}).where({ id }),

	'v1.InventoryRemoved': ({ id }) =>
		tables.inventory.delete().where({ id }),

	'v1.RoomUpdated': ({ id, ...updates }) =>
		tables.rooms.update({
			...updates,
			updatedAt: new Date(),
		}).where({ id }),
});

const state = State.SQLite.makeState({ tables, materializers });

export const schema = makeSchema({ events, state });
