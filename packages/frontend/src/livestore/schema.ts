import { Events, makeSchema, Schema, SessionIdSymbol, State } from '@livestore/livestore';
import omit from 'object.omit';
import {
	RoomTemplateSchema,
	GalaxySchema,
	StarSystemSchema,
	RaceTemplateSchema,
	PersonTemplateSchema,
	InventorySchema,
	PlanetSchema,
	ShipLayoutSchema,
} from '@stargate/common/zod-templates';
import {
	z,
	ZodObject,
	ZodTypeAny,
	ZodString,
	ZodNumber,
	ZodBoolean,
	ZodOptional,
	ZodNullable,
	ZodRawShape,
} from 'zod';

function isNullable(zodField: ZodTypeAny): boolean {
	// Walk through ZodOptional and ZodNullable wrappers to check for nullability
	let current = zodField;
	while (current instanceof ZodOptional || current instanceof ZodNullable) {
		if (current instanceof ZodNullable) return true;
		current = current._def.innerType;
	}
	return false;
}

// Utility: Convert Zod schema to LiveStore table columns
// Map Zod types to LiveStore column types
// This is a type-level mapping for better type inference
export type ZodToTableColumn<T extends ZodTypeAny> =
	T extends ZodString ? ReturnType<typeof State.SQLite.text> :
	T extends ZodNumber ? ReturnType<typeof State.SQLite.real> :
	T extends ZodBoolean ? ReturnType<typeof State.SQLite.boolean> :
	T extends ZodOptional<infer U> ? ZodToTableColumn<U> :
	T extends ZodNullable<infer U> ? ZodToTableColumn<U> :
	ReturnType<typeof State.SQLite.text>;

export type ZodToTableColumns<T extends ZodRawShape> = {
	[K in keyof T]: ZodToTableColumn<T[K]>;
};

export function zodToTable<T extends ZodRawShape>(
	zodSchema: ZodObject<T>,
): ZodToTableColumns<T> & {
	created_at: ReturnType<typeof State.SQLite.real>,
	updated_at: ReturnType<typeof State.SQLite.real>,
} {
	const columns: Partial<ZodToTableColumns<T>> = {};
	for (const [key, value] of Object.entries(zodSchema.shape)) {
		const zodField = value as ZodTypeAny;
		let col;
		if (zodField instanceof ZodString) {
			col = State.SQLite.text({ nullable: isNullable(zodField) });
		} else if (zodField instanceof ZodNumber) {
			col = State.SQLite.real();
		} else if (zodField instanceof ZodBoolean) {
			col = State.SQLite.boolean();
		} else if (zodField instanceof ZodOptional) {
			const inner = (zodField as ZodOptional<ZodTypeAny>)._def.innerType;
			col = zodToTable({ shape: { [key]: inner } } as any)[key];
		} else if (zodField instanceof ZodNullable) {
			const inner = (zodField as ZodNullable<ZodTypeAny>)._def.innerType;
			col = zodToTable({ shape: { [key]: inner } } as any)[key];
			if (typeof col === 'object') col.nullable = true;
		} else {
			col = State.SQLite.text({ nullable: isNullable(zodField) });
		}
		(columns as any)[key] = col;
	}
	return {
		...columns as ZodToTableColumns<T>,
		created_at: State.SQLite.real(),
		updated_at: State.SQLite.real(),
	};
}

// Utility: Convert Zod schema to LiveStore table schemas
// Map Zod types to LiveStore column types
// This is a type-level mapping for better type inference
export type ZodToSchemaColumn<T extends ZodTypeAny> =
	T extends ZodString ? typeof Schema.String :
	T extends ZodNumber ? typeof Schema.Number :
	T extends ZodBoolean ? typeof Schema.Boolean :
	T extends ZodOptional<infer U> ? ZodToSchemaColumn<U> :
	T extends ZodNullable<infer U> ? ZodToSchemaColumn<U> :
	typeof Schema.String;

export type ZodToSchemaColumns<T extends ZodRawShape> = {
	[K in keyof T]: ZodToSchemaColumn<T[K]>;
};

// Utility: Convert Zod schema to LiveStore event Schema.Struct (all required fields, type-safe)
function zodFieldToSchema(zodField: ZodTypeAny): typeof Schema[keyof typeof Schema] {
	if (zodField instanceof ZodString) {
		return Schema.String;
	} else if (zodField instanceof ZodNumber) {
		return Schema.Number;
	} else if (zodField instanceof ZodBoolean) {
		return Schema.Boolean;
	} else if (zodField instanceof ZodOptional) {
		const inner = (zodField as ZodOptional<ZodTypeAny>)._def.innerType;
		return zodFieldToSchema(inner);
	} else if (zodField instanceof ZodNullable) {
		const inner = (zodField as ZodNullable<ZodTypeAny>)._def.innerType;
		return zodFieldToSchema(inner);
	} else {
		return Schema.String;
	}
}

export function zodToSchema<T extends ZodRawShape>(
	zodSchema: ZodObject<T>,
): Schema.Struct<ZodToSchemaColumns<T>> {
	const struct: Record<string, any> = {};
	for (const [key, value] of Object.entries(zodSchema.shape)) {
		struct[key] = zodFieldToSchema(value as ZodTypeAny);
	}
	return Schema.Struct(struct) as any;
}

export function zodToUpdateSchema<T extends ZodRawShape>(
	zodSchema: ZodObject<T>,
): Schema.Struct<ZodToSchemaColumns<T>> {
	const struct: Record<string, any> = {};
	for (const [key, value] of Object.entries(zodSchema.shape)) {
		const zodField = value as ZodTypeAny;
		if (key === 'id') {
			struct[key] = zodFieldToSchema(zodField);
		} else {
			const base = zodFieldToSchema(zodField);
			struct[key] = Schema.optional(base);
		}
	}
	return Schema.Struct(struct) as any;
}

// Core game tables
import { GameSchema } from '@stargate/common/models/game';

export const tables = {
	// Game management
	games: State.SQLite.table({
		name: 'games',
		columns: zodToTable(GameSchema),
	}),

	// Universe structure
	galaxies: State.SQLite.table({
		name: 'galaxies',
		columns: zodToTable(GalaxySchema),
	}),

	starSystems: State.SQLite.table({
		name: 'star_systems',
		columns: zodToTable(StarSystemSchema),
	}),

	stars: State.SQLite.table({
		name: 'stars',
		columns: zodToTable(StarSystemSchema),
	}),

	planets: State.SQLite.table({
		name: 'planets',
		columns: zodToTable(PlanetSchema),
	}),

	// Civilizations and people
	races: State.SQLite.table({
		name: 'races',
		columns: zodToTable(RaceTemplateSchema),
	}),

	people: State.SQLite.table({
		name: 'people',
		columns: zodToTable(PersonTemplateSchema),
	}),

	// Technology and ships
	technology: State.SQLite.table({
		name: 'technology',
		columns: zodToTable(TechnologySchema),
	}),

	ships: State.SQLite.table({
		name: 'ships',
		columns: zodToTable(ShipLayoutSchema),
	}),

	// Stargate network
	stargates: State.SQLite.table({
		name: 'stargates',
		columns: zodToTable(StargateSchema),
	}),

	chevrons: State.SQLite.table({
		name: 'chevrons',
		columns: zodToTable(ChevronSchema),
	}),

	// Ship rooms and layout
	rooms: State.SQLite.table({
		name: 'rooms',
		columns: zodToTable(RoomTemplateSchema),
	}),

	// Destiny ship status
	destinyStatus: State.SQLite.table({
		name: 'destiny_status',
		columns: zodToTable(DestinyStatusSchema),
	}),

	// Inventory management
	inventory: State.SQLite.table({
		name: 'inventory',
		columns: zodToTable(InventorySchema),
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
		schema: zodToSchema(GameSchema),
	}),

	gameUpdated: Events.synced({
		name: 'v1.GameUpdated',
		schema: zodToUpdateSchema(GameSchema),
	}),

	gameDeleted: Events.synced({
		name: 'v1.GameDeleted',
		schema: Schema.Struct({ id: Schema.String }),
	}),

	// Universe structure events
	galaxyCreated: Events.synced({
		name: 'v1.GalaxyCreated',
		schema: zodToSchema(GalaxySchema),
	}),

	starSystemCreated: Events.synced({
		name: 'v1.StarSystemCreated',
		schema: zodToSchema(StarSystemSchema),
	}),

	starCreated: Events.synced({
		name: 'v1.StarCreated',
		schema: zodToSchema(StarSystemSchema),
	}),

	planetCreated: Events.synced({
		name: 'v1.PlanetCreated',
		schema: zodToSchema(PlanetSchema),
	}),

	// Civilization events
	raceCreated: Events.synced({
		name: 'v1.RaceCreated',
		schema: zodToSchema(RaceTemplateSchema), // <-- FIXED: use RaceTemplateSchema
	}),

	personCreated: Events.synced({
		name: 'v1.PersonCreated',
		schema: zodToSchema(PersonTemplateSchema),
	}),

	personUpdated: Events.synced({
		name: 'v1.PersonUpdated',
		schema: zodToUpdateSchema(PersonTemplateSchema),
	}),

	// Technology events
	technologyCreated: Events.synced({
		name: 'v1.TechnologyCreated',
		schema: zodToSchema(TechnologySchema),
	}),

	technologyUnlocked: Events.synced({
		name: 'v1.TechnologyUnlocked',
		schema: zodToUpdateSchema(TechnologySchema),
	}),

	// Ship structure events
	shipCreated: Events.synced({
		name: 'v1.ShipCreated',
		schema: zodToSchema(ShipSchema),
	}),

	stargateCreated: Events.synced({
		name: 'v1.StargateCreated',
		schema: zodToSchema(StargateSchema),
	}),

	chevronCreated: Events.synced({
		name: 'v1.ChevronCreated',
		schema: zodToSchema(ChevronSchema),
	}),

	roomCreated: Events.synced({
		name: 'v1.RoomCreated',
		schema: zodToSchema(RoomSchema),
	}),

	// Destiny status updates
	destinyStatusCreated: Events.synced({
		name: 'v1.DestinyStatusCreated',
		schema: zodToSchema(DestinyStatusSchema),
	}),

	destinyStatusUpdated: Events.synced({
		name: 'v1.DestinyStatusUpdated',
		schema: zodToUpdateSchema(DestinyStatusSchema),
	}),

	// Inventory events
	inventoryAdded: Events.synced({
		name: 'v1.InventoryAdded',
		schema: zodToSchema(InventorySchema),
	}),

	inventoryUpdated: Events.synced({
		name: 'v1.InventoryUpdated',
		schema: zodToUpdateSchema(InventorySchema),
	}),

	inventoryRemoved: Events.synced({
		name: 'v1.InventoryRemoved',
		schema: Schema.Struct({ id: Schema.String }),
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

	// UI state events (local only)
	uiStateSet: tables.uiState.set,

	roomUpdated: Events.synced({
		name: 'v1.RoomUpdated',
		schema: zodToUpdateSchema(RoomSchema),
	}),
};

// Materializers map events to state changes
const materializers = State.SQLite.materializers(events, {
	'v1.GameCreated': (fields) =>
		tables.games.insert({
			...fields,
			created_at: Date.now(),
			updated_at: Date.now(),
			last_played: Date.now(),
		}),

	'v1.GameUpdated': (fields) =>
		tables.games.update({
			...omit(fields, 'id'),
			updated_at: Date.now(),
		}).where({ id: fields.id }),

	'v1.GameDeleted': ({ id }: any) => Object.entries(tables)
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

	'v1.GalaxyCreated': (fields) => tables.galaxies.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.StarSystemCreated': (fields) => tables.starSystems.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.StarCreated': (fields) => tables.stars.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.PlanetCreated': (fields) => tables.planets.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.RaceCreated': (fields) => tables.races.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.PersonCreated': (fields) => tables.people.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.PersonUpdated': (fields) =>
		tables.people.update({
			...omit(fields, 'id'),
			updated_at: Date.now(),
		}).where({ id: fields.id }),

	'v1.TechnologyCreated': (fields) => tables.technology.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.TechnologyUnlocked': (fields) =>
		tables.technology.update({
			...omit(fields, 'id'),
			updated_at: Date.now(),
		}).where({ id: fields.id }),

	'v1.ShipCreated': (fields) => tables.ships.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.StargateCreated': (fields) => tables.stargates.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.ChevronCreated': (fields) => tables.chevrons.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.RoomCreated': (fields) => tables.rooms.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.RoomUpdated': (fields) =>
		tables.rooms.update({
			...omit(fields, 'id'),
			updated_at: Date.now(),
		}).where({ id: fields.id }),

	'v1.DestinyStatusCreated': (fields) => tables.destinyStatus.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.DestinyStatusUpdated': (fields) =>
		tables.destinyStatus.update({
			...omit(fields, 'id'),
			updated_at: Date.now(),
		}).where({ id: fields.game_id }),

	'v1.InventoryAdded': (fields) => tables.inventory.insert({
		...fields,
		created_at: Date.now(),
		updated_at: Date.now(),
	}),

	'v1.InventoryUpdated': (fields) =>
		tables.inventory.update({
			...fields,
			updated_at: Date.now(),
		}).where({ id: fields.id }),

	'v1.InventoryRemoved': (fields) =>
		tables.inventory.delete().where({ id: fields.id }),

	'v1.RoomExplorationStarted': (fields) =>
		tables.rooms.update({
			updated_at: Date.now(),
			exploration_data: JSON.stringify({
				status: 'in_progress',
				crew_assigned: fields.crew_assigned,
				start_time: fields.start_time,
			}),
		}).where({ id: fields.room_id }),

	'v1.RoomExplorationCompleted': (fields) =>
		tables.rooms.update({
			explored: true,
			updated_at: Date.now(),
			exploration_data: JSON.stringify({
				status: 'completed',
				completed_at: Date.now(),
				discovered: fields.discovered,
			}),
		}).where({ id: fields.room_id }),
});

const state = State.SQLite.makeState({ tables, materializers });

export const schema = makeSchema({ events, state });


