import { z } from 'zod';

// Base schemas
export const GameSchema = z.object({
	id: z.string(),
	name: z.string(),
	totalTimeProgressed: z.number().default(0),
	lastPlayed: z.date().optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export const GalaxySchema = z.object({
	id: z.string(),
	gameId: z.string(),
	name: z.string(),
	x: z.number(),
	y: z.number(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export const StarSystemSchema = z.object({
	id: z.string(),
	gameId: z.string(),
	galaxyId: z.string(),
	name: z.string(),
	x: z.number(),
	y: z.number(),
	description: z.string().optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export const RaceSchema = z.object({
	id: z.string(),
	gameId: z.string(),
	name: z.string(),
	technology: z.array(z.string()).default([]),
	ships: z.array(z.string()).default([]),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

// Template schemas (for backend API)
export const RoomTemplateSchema = z.object({
	id: z.string(),
	type: z.string(),
	name: z.string(),
	description: z.string().optional(),
	grid_width: z.number(),
	grid_height: z.number(),
	technology: z.array(z.string()),
	image: z.string().optional(),
	base_exploration_time: z.number(),
	default_status: z.enum(['ok', 'damaged', 'destroyed']),
	created_at: z.number(),
	updated_at: z.number(),
});

export const PersonTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.string(),
	race_template_id: z.string().optional(),
	skills: z.array(z.string()),
	description: z.string().optional(),
	image: z.string().optional(),
	default_location: z.record(z.any()).optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export const RaceTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	default_technology: z.array(z.string()),
	default_ships: z.array(z.string()),
	created_at: z.number(),
	updated_at: z.number(),
});

export const DoorRequirementSchema = z.object({
	type: z.enum(['code', 'item', 'technology', 'crew_skill', 'power_level', 'story_progress']),
	value: z.string(),
	description: z.string(),
	met: z.boolean().default(false),
});

export const DoorInfoSchema = z.object({
	toRoomId: z.string(),
	state: z.enum(['closed', 'opened', 'locked']),
	requirements: z.array(DoorRequirementSchema).default([]),
	description: z.string().optional(),
});

export const RoomPositionSchema = z.object({
	x: z.number(),
	y: z.number(),
	floor: z.number(),
});

export const RoomInitialStateSchema = z.object({
	found: z.boolean().default(false),
	locked: z.boolean().default(false),
	explored: z.boolean().default(false),
});

export const ShipLayoutRoomSchema = z.object({
	template_id: z.string(),
	id: z.string().optional(),
	position: RoomPositionSchema,
	initial_state: RoomInitialStateSchema,
	connections: z.array(z.string()),
});

export const ShipLayoutDoorSchema = z.object({
	from: z.string(),
	to: z.string(),
	template_id: z.string(),
	initial_state: z.string(),
	description: z.string().optional(),
	requirements: z.array(DoorRequirementSchema).optional(),
});

export const ShipLayoutDataSchema = z.object({
	rooms: z.array(ShipLayoutRoomSchema),
	doors: z.array(ShipLayoutDoorSchema),
});

export const ShipLayoutTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	layout_data: ShipLayoutDataSchema,
	created_at: z.number(),
	updated_at: z.number(),
});

export const DoorTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	requirements: z.array(DoorRequirementSchema),
	default_state: z.enum(['closed', 'opened', 'locked']),
	description: z.string().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

// Game instance schemas
export const RoomSchema = z.object({
	id: z.string(),
	gameId: z.string(),
	type: z.string(),
	gridX: z.number(),
	gridY: z.number(),
	gridWidth: z.number(),
	gridHeight: z.number(),
	floor: z.number(),
	technology: z.array(z.string()),
	image: z.string().optional(),
	status: z.enum(['ok', 'damaged', 'destroyed']),
	found: z.boolean().default(false),
	locked: z.boolean().default(false),
	explored: z.boolean().default(false),
	connectedRooms: z.array(z.string()),
	doors: z.array(DoorInfoSchema),
	explorationData: z.record(z.any()).optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export const PersonSchema = z.object({
	id: z.string(),
	gameId: z.string(),
	raceId: z.string().optional(),
	name: z.string(),
	role: z.string(),
	location: z.record(z.any()),
	assignedTo: z.string().optional(),
	skills: z.array(z.string()),
	description: z.string().optional(),
	image: z.string().optional(),
	conditions: z.array(z.string()).default([]),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export const DestinyStatusSchema = z.object({
	id: z.string(),
	gameId: z.string(),
	name: z.string(),
	power: z.number(),
	maxPower: z.number(),
	shields: z.number(),
	maxShields: z.number(),
	hull: z.number(),
	maxHull: z.number(),
	raceId: z.string(),
	crew: z.array(z.string()),
	location: z.record(z.any()),
	shield: z.object({
		strength: z.number(),
		max: z.number(),
		coverage: z.number(),
	}),
	inventory: z.record(z.number()),
	crewStatus: z.object({
		onboard: z.number(),
		capacity: z.number(),
		manifest: z.array(z.string()),
	}),
	atmosphere: z.object({
		co2: z.number(),
		o2: z.number(),
		co2Scrubbers: z.number(),
	}),
	weapons: z.object({
		mainGun: z.boolean(),
		turrets: z.object({
			total: z.number(),
			working: z.number(),
		}),
	}),
	shuttles: z.object({
		total: z.number(),
		working: z.number(),
		damaged: z.number().optional(),
	}),
	notes: z.array(z.string()),
	gameDays: z.number(),
	gameHours: z.number(),
	ftlStatus: z.string(),
	nextFtlTransition: z.number(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

// Type exports
export type Game = z.infer<typeof GameSchema>;
export type Galaxy = z.infer<typeof GalaxySchema>;
export type StarSystem = z.infer<typeof StarSystemSchema>;
export type Race = z.infer<typeof RaceSchema>;
export type RoomTemplate = z.infer<typeof RoomTemplateSchema>;
export type PersonTemplate = z.infer<typeof PersonTemplateSchema>;
export type RaceTemplate = z.infer<typeof RaceTemplateSchema>;
export type ShipLayoutTemplate = z.infer<typeof ShipLayoutTemplateSchema>;
export type DoorTemplate = z.infer<typeof DoorTemplateSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type DestinyStatus = z.infer<typeof DestinyStatusSchema>;
export type DoorRequirement = z.infer<typeof DoorRequirementSchema>;
export type DoorInfo = z.infer<typeof DoorInfoSchema>;
export type ShipLayoutData = z.infer<typeof ShipLayoutDataSchema>;

// API response schemas
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
	z.object({
		success: z.boolean(),
		data: dataSchema.optional(),
		error: z.string().optional(),
		timestamp: z.number().default(() => Date.now()),
	});

export type ApiResponse<T> = {
	success: boolean;
	data?: T;
	error?: string;
	timestamp: number;
};

// Template API responses
export const RoomTemplatesResponseSchema = ApiResponseSchema(z.array(RoomTemplateSchema));
export const PersonTemplatesResponseSchema = ApiResponseSchema(z.array(PersonTemplateSchema));
export const RaceTemplatesResponseSchema = ApiResponseSchema(z.array(RaceTemplateSchema));
export const ShipLayoutsResponseSchema = ApiResponseSchema(z.array(ShipLayoutTemplateSchema));
export const DoorTemplatesResponseSchema = ApiResponseSchema(z.array(DoorTemplateSchema));

export type RoomTemplatesResponse = z.infer<typeof RoomTemplatesResponseSchema>;
export type PersonTemplatesResponse = z.infer<typeof PersonTemplatesResponseSchema>;
export type RaceTemplatesResponse = z.infer<typeof RaceTemplatesResponseSchema>;
export type ShipLayoutsResponse = z.infer<typeof ShipLayoutsResponseSchema>;
export type DoorTemplatesResponse = z.infer<typeof DoorTemplatesResponseSchema>;
