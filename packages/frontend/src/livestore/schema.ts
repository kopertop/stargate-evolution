import { Events, makeSchema, Schema, SessionIdSymbol, State } from '@livestore/livestore';
import { DestinyStatus } from '@stargate/common';

// Core game tables
export const tables = {
	// Game management
	games: State.SQLite.table({
		name: 'games',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			name: State.SQLite.text(),
			total_time_progressed: State.SQLite.real({ default: 0 }),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			last_played: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Universe structure
	galaxies: State.SQLite.table({
		name: 'galaxies',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			name: State.SQLite.text(),
			x: State.SQLite.real(),
			y: State.SQLite.real(),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	starSystems: State.SQLite.table({
		name: 'star_systems',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			galaxy_id: State.SQLite.text(),
			name: State.SQLite.text(),
			x: State.SQLite.real(),
			y: State.SQLite.real(),
			description: State.SQLite.text({ nullable: true }),
			image: State.SQLite.text({ nullable: true }),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	stars: State.SQLite.table({
		name: 'stars',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			star_system_id: State.SQLite.text(),
			name: State.SQLite.text(),
			type: State.SQLite.text(),
			description: State.SQLite.text({ nullable: true }),
			image: State.SQLite.text({ nullable: true }),
			radius: State.SQLite.real(),
			mass: State.SQLite.real(),
			temperature: State.SQLite.real(),
			luminosity: State.SQLite.real(),
			age: State.SQLite.real(),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	planets: State.SQLite.table({
		name: 'planets',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			star_system_id: State.SQLite.text(),
			name: State.SQLite.text(),
			type: State.SQLite.text(),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Civilizations and people
	races: State.SQLite.table({
		name: 'races',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			name: State.SQLite.text(),
			description: State.SQLite.text({ nullable: true }),
			default_technology: State.SQLite.text({ nullable: true }),
			default_ships: State.SQLite.text({ nullable: true }),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	people: State.SQLite.table({
		name: 'people',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			race_template_id: State.SQLite.text({ nullable: true }),
			name: State.SQLite.text(),
			role: State.SQLite.text(),
			skills: State.SQLite.text(),
			description: State.SQLite.text({ nullable: true }),
			image: State.SQLite.text({ nullable: true }),
			default_location: State.SQLite.text({ nullable: true }),
			assigned_to: State.SQLite.text({ nullable: true }),
			conditions: State.SQLite.text({ nullable: true }),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Technology and ships
	technology: State.SQLite.table({
		name: 'technology',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			name: State.SQLite.text(),
			description: State.SQLite.text(),
			unlocked: State.SQLite.boolean({ default: false }),
			cost: State.SQLite.real(),
			image: State.SQLite.text({ nullable: true }),
			number_on_destiny: State.SQLite.real({ nullable: true }),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	ships: State.SQLite.table({
		name: 'ships',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			race_id: State.SQLite.text(),
			name: State.SQLite.text(),
			power: State.SQLite.real(),
			maxPower: State.SQLite.real(),
			shields: State.SQLite.real(),
			max_shields: State.SQLite.real(),
			hull: State.SQLite.real(),
			max_hull: State.SQLite.real(),
			crew: State.SQLite.text(),
			location: State.SQLite.text(),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Stargate network
	stargates: State.SQLite.table({
		name: 'stargates',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			address: State.SQLite.text(),
			type: State.SQLite.text(),
			location_id: State.SQLite.text({ nullable: true }),
			connected_to: State.SQLite.text(),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	chevrons: State.SQLite.table({
		name: 'chevrons',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			stargate_id: State.SQLite.text(),
			symbol: State.SQLite.text(),
			description: State.SQLite.text({ nullable: true }),
			image: State.SQLite.text({ nullable: true }),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Ship rooms and layout
	rooms: State.SQLite.table({
		name: 'rooms',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			template_id: State.SQLite.text(),
			layout_id: State.SQLite.text(),
			type: State.SQLite.text(),
			name: State.SQLite.text(),
			description: State.SQLite.text({ nullable: true }),
			start_x: State.SQLite.real(),
			start_y: State.SQLite.real(),
			end_x: State.SQLite.real(),
			end_y: State.SQLite.real(),
			floor: State.SQLite.real(),
			image: State.SQLite.text({ nullable: true }),
			base_exploration_time: State.SQLite.real({ nullable: true }),
			connection_north: State.SQLite.text({ nullable: true }),
			connection_south: State.SQLite.text({ nullable: true }),
			connection_east: State.SQLite.text({ nullable: true }),
			connection_west: State.SQLite.text({ nullable: true }),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			// Runtime/game fields (optional)
			found: State.SQLite.boolean({ nullable: true }),
			locked: State.SQLite.boolean({ nullable: true }),
			explored: State.SQLite.boolean({ nullable: true }),
			status: State.SQLite.text({ nullable: true }),
			connected_rooms: State.SQLite.text({ nullable: true }),
			doors: State.SQLite.text({ nullable: true }),
			exploration_data: State.SQLite.text({ nullable: true }),
		},
	}),

	// Destiny ship status
	destinyStatus: State.SQLite.table({
		name: 'destiny_status',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			name: State.SQLite.text(),
			power: State.SQLite.real(), // JSON stored as text
			max_power: State.SQLite.real(),
			shields: State.SQLite.real(),
			max_shields: State.SQLite.real(),
			hull: State.SQLite.real(), // JSON stored as text
			max_hull: State.SQLite.real(),
			race_id: State.SQLite.text(),
			location: State.SQLite.text(), // JSON stored as text
			stargate_id: State.SQLite.text({ nullable: true }),

			// Atmosphere
			co2: State.SQLite.real(),
			o2: State.SQLite.real(),
			co2Scrubbers: State.SQLite.real(),

			weapons: State.SQLite.text(), // JSON stored as text
			shuttles: State.SQLite.text(), // JSON stored as text
			notes: State.SQLite.text({ nullable: true }), // JSON array stored as text
			game_days: State.SQLite.real(),
			game_hours: State.SQLite.real(),
			ftl_status: State.SQLite.text({ default: 'normal_space' }), // 'ftl' or 'normal_space'
			next_ftl_transition: State.SQLite.real(),

			// History
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Inventory management
	inventory: State.SQLite.table({
		name: 'inventory',
		columns: {
			id: State.SQLite.text({ primaryKey: true }),
			game_id: State.SQLite.text(),
			resource_type: State.SQLite.text(),
			amount: State.SQLite.real(),
			location: State.SQLite.text({ nullable: true }), // e.g., 'ship', 'room_id', etc.
			description: State.SQLite.text({ nullable: true }),
			created_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
			updated_at: State.SQLite.integer({ schema: Schema.DateFromNumber }),
		},
	}),

	// Client-side UI state
	uiState: State.SQLite.clientDocument({
		name: 'uiState',
		schema: Schema.Struct({
			selected_game_id: Schema.optional(Schema.String),
			current_view: Schema.String,
			selected_room_id: Schema.optional(Schema.String),
			map_zoom: Schema.Number,
			map_center_x: Schema.Number,
			map_center_y: Schema.Number,
		}),
		default: {
			id: SessionIdSymbol,
			value: {
				current_view: 'menu',
				map_zoom: 1,
				map_center_x: 0,
				map_center_y: 0,
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
		}),
	}),

	gameUpdated: Events.synced({
		name: 'v1.GameUpdated',
		schema: Schema.Struct({
			id: Schema.String,
			total_time_progressed: Schema.optional(Schema.Number),
			last_played: Schema.optional(Schema.Date),
		}),
	}),

	gameDeleted: Events.synced({
		name: 'v1.GameDeleted',
		schema: Schema.Struct({
			id: Schema.String,
		}),
	}),

	// Room exploration events
	roomExplorationStarted: Events.synced({
		name: 'v1.RoomExplorationStarted',
		schema: Schema.Struct({
			room_id: Schema.String,
			crew_assigned: Schema.Array(Schema.String),
			start_time: Schema.Number,
		}),
	}),

	roomExplorationCompleted: Events.synced({
		name: 'v1.RoomExplorationCompleted',
		schema: Schema.Struct({
			room_id: Schema.String,
			completed_at: Schema.Date,
			discovered: Schema.Array(Schema.String),
		}),
	}),

	// Destiny status updates
	destinyStatusCreated: Events.synced({
		name: 'v1.DestinyStatusCreated',
		schema: Schema.Struct({
			id: Schema.String, // Game ID
			name: Schema.String,
			power: Schema.Number,
			max_power: Schema.Number,
			shields: Schema.Number,
			max_shields: Schema.Number,
			hull: Schema.Number,
			max_hull: Schema.Number,
			race_id: Schema.String,
			location: Schema.String,
			stargate_id: Schema.optional(Schema.String),
			weapons: Schema.String,
			shuttles: Schema.String,
			notes: Schema.optional(Schema.String),
			game_days: Schema.Number,
			game_hours: Schema.Number,
			ftl_status: Schema.String,
			next_ftl_transition: Schema.Number,

			// Atmosphere
			co2: Schema.Number,
			o2: Schema.Number,
			co2Scrubbers: Schema.Number,
		}),
	}),

	destinyStatusUpdated: Events.synced({
		name: 'v1.DestinyStatusUpdated',
		schema: Schema.Struct({
			game_id: Schema.String,
			power: Schema.optional(Schema.Number),
			shields: Schema.optional(Schema.Number),
			hull: Schema.optional(Schema.Number),
			game_days: Schema.optional(Schema.Number),
			game_hours: Schema.optional(Schema.Number),
			ftl_status: Schema.optional(Schema.String),
		}),
	}),

	// Universe structure events
	galaxyCreated: Events.synced({
		name: 'v1.GalaxyCreated',
		schema: Schema.Struct({
			id: Schema.String,
			game_id: Schema.String,
			name: Schema.String,
			x: Schema.Number,
			y: Schema.Number,
		}),
	}),

	starSystemCreated: Events.synced({
		name: 'v1.StarSystemCreated',
		schema: Schema.Struct({
			id: Schema.String,
			game_id: Schema.String,
			galaxy_id: Schema.String,
			name: Schema.String,
			x: Schema.Number,
			y: Schema.Number,
			description: Schema.optional(Schema.String),
			image: Schema.optional(Schema.String),
			created_at: Schema.Date,
			updated_at: Schema.Date,
		}),
	}),

	// Civilization events
	raceCreated: Events.synced({
		name: 'v1.RaceCreated',
		schema: Schema.Struct({
			id: Schema.String,
			game_id: Schema.String,
			name: Schema.String,
			description: Schema.optional(Schema.String),
			default_technology: Schema.optional(Schema.String),
			default_ships: Schema.optional(Schema.String),
		}),
	}),

	personCreated: Events.synced({
		name: 'v1.PersonCreated',
		schema: Schema.Struct({
			id: Schema.String,
			game_id: Schema.String,
			race_template_id: Schema.optional(Schema.String),
			name: Schema.String,
			role: Schema.String,
			skills: Schema.String,
			description: Schema.optional(Schema.String),
			image: Schema.optional(Schema.String),
			default_location: Schema.optional(Schema.String),
			assigned_to: Schema.optional(Schema.String),
			conditions: Schema.optional(Schema.String),
		}),
	}),

	personUpdated: Events.synced({
		name: 'v1.PersonUpdated',
		schema: Schema.Struct({
			id: Schema.String,
			assigned_to: Schema.optional(Schema.String),
			updated_at: Schema.Date,
		}),
	}),

	// Ship structure events
	roomCreated: Events.synced({
		name: 'v1.RoomCreated',
		schema: Schema.Struct({
			id: Schema.String,
			game_id: Schema.String,
			layout_id: Schema.String,
			template_id: Schema.String,
			type: Schema.String,
			name: Schema.String,
			description: Schema.optional(Schema.String),
			start_x: Schema.Number,
			start_y: Schema.Number,
			end_x: Schema.Number,
			end_y: Schema.Number,
			floor: Schema.Number,
			image: Schema.optional(Schema.String),
			base_exploration_time: Schema.optional(Schema.Number),
			connection_north: Schema.optional(Schema.String),
			connection_south: Schema.optional(Schema.String),
			connection_east: Schema.optional(Schema.String),
			connection_west: Schema.optional(Schema.String),
			// Runtime/game fields (optional)
			found: Schema.optional(Schema.Boolean),
			locked: Schema.optional(Schema.Boolean),
			explored: Schema.optional(Schema.Boolean),
			status: Schema.optional(Schema.String),
			connected_rooms: Schema.optional(Schema.String),
			doors: Schema.optional(Schema.String),
			exploration_data: Schema.optional(Schema.String),
		}),
	}),

	// Inventory events
	inventoryAdded: Events.synced({
		name: 'v1.InventoryAdded',
		schema: Schema.Struct({
			id: Schema.String,
			game_id: Schema.String,
			resource_type: Schema.String,
			amount: Schema.Number,
			location: Schema.optional(Schema.String),
			description: Schema.optional(Schema.String),
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
			game_id: Schema.String,
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
			connected_rooms: Schema.optional(Schema.String),
			doors: Schema.optional(Schema.String),
			exploration_data: Schema.optional(Schema.String),
		}),
	}),
};

// Materializers map events to state changes
const materializers = State.SQLite.materializers(events, {
	'v1.GameCreated': (fields) =>
		tables.games.insert({
			...fields,
			created_at: new Date(),
			updated_at: new Date(),
			last_played: new Date(),
		}),

	'v1.GameUpdated': (fields) =>
		tables.games.update({
			...fields,
			updated_at: new Date(),
		}).where({ id: fields.id }),

	'v1.GameDeleted': ({ id }) => Object.entries(tables)
		.map(([tableName, tableInstance]) => {
			if (
				tableName === 'games'
				|| tableName === 'destinyStatus'
				|| tableName === 'uiState'
			) {
				return (tableInstance as any).delete().where({ id });
			} else {
				return (tableInstance as any).delete().where({ game_id: id });
			}
		}),

	'v1.RoomExplorationStarted': (fields) =>
		tables.rooms.update({
			exploration_data: JSON.stringify({
				status: 'in_progress',
				crew_assigned: fields.crew_assigned,
				start_time: fields.start_time,
			}),
		}).where({ id: fields.room_id }),

	'v1.RoomExplorationCompleted': (fields) =>
		tables.rooms.update({
			explored: true,
			exploration_data: JSON.stringify({
				status: 'completed',
				completed_at: Date.now(),
				discovered: fields.discovered,
			}),
		}).where({ id: fields.room_id }),

	'v1.DestinyStatusCreated': (fields) => tables.destinyStatus.insert({
		 ...fields,
		created_at: new Date(),
		updated_at: new Date(),
	 }),

	'v1.GalaxyCreated': (fields) => tables.galaxies.insert({
		...fields,
		created_at: new Date(),
		updated_at: new Date(),
	}),

	'v1.StarSystemCreated': (fields) => tables.starSystems.insert({
		...fields,
		created_at: new Date(),
		updated_at: new Date(),
	}),

	'v1.RaceCreated': (fields) => tables.races.insert({
		...fields,
		created_at: new Date(),
		updated_at: new Date(),
	}),

	'v1.PersonCreated': (fields) => tables.people.insert({
		...fields,
		created_at: new Date(),
		updated_at: new Date(),
	}),

	'v1.RoomCreated': (fields) => tables.rooms.insert({
		...fields,
		created_at: new Date(),
		updated_at: new Date(),
	}),

	'v1.DestinyStatusUpdated': ({ game_id, ...updates }) =>
		tables.destinyStatus.update({
			...updates,
		}).where({ id: game_id }),

	'v1.TechnologyUnlocked': ({ id }) =>
		tables.technology.update({ unlocked: true }).where({ id }),

	'v1.InventoryAdded': (fields) =>
		tables.inventory.insert({
			...fields,
			created_at: new Date(),
			updated_at: new Date(),
		}),

	'v1.InventoryUpdated': ({ id, ...updates }) =>
		tables.inventory.update({
			...updates,
			updated_at: new Date(),
		}).where({ id }),

	'v1.InventoryRemoved': ({ id }) =>
		tables.inventory.delete().where({ id }),

	'v1.RoomUpdated': ({ id, ...updates }) =>
		tables.rooms.update({
			...updates,
			updated_at: new Date(),
		}).where({ id }),

	'v1.PersonUpdated': (fields) =>
		tables.people.update({
			...fields,
		}).where({ id: fields.id }),
});

const state = State.SQLite.makeState({ tables, materializers });

export const schema = makeSchema({ events, state });
