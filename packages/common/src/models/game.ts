import { z } from 'zod';

import { CharacterSchema } from './character';
import { DestinyStatusSchema } from './destiny-status';
import { ExplorationProgressSchema } from './exploration-progress';
import { GalaxySchema } from './galaxy';
import { StarSystemSchema } from './star-system';

export const GameSchema = z.object({
	id: z.string(),
	name: z.string(),
	total_time_progressed: z.number().default(0),
	created_at: z.number(),
	updated_at: z.number(),
	last_played: z.number(),
});

export type GameType = z.infer<typeof GameSchema>;

/**
 * Represents the state of discovered tiles in the fog of war.
 * The key is a coordinate string like "x,y", and the value is true if discovered.
 */
export const FogOfWarDataSchema = z.record(z.string(), z.boolean());
export type FogOfWarData = z.infer<typeof FogOfWarDataSchema>;

/**
 * Represents the player's position on the map.
 */
export const PlayerPositionSchema = z.object({
	x: z.number(),
	y: z.number(),
	roomId: z.string(),
	floor: z.number().optional(),
});
export type PlayerPosition = z.infer<typeof PlayerPositionSchema>;

/**
 * Represents a door state in the game.
 */
export const DoorStateSchema = z.object({
	id: z.string(),
	state: z.string(),
	from_room_id: z.string(),
	to_room_id: z.string(),
	x: z.number(),
	y: z.number(),
	width: z.number(),
	height: z.number(),
	rotation: z.number(),
	is_automatic: z.number(),
	open_direction: z.string(),
	style: z.string(),
	color: z.string().nullable(),
	requirements: z.string().nullable(),
	power_required: z.number(),
});
export type DoorState = z.infer<typeof DoorStateSchema>;

// Note: Galaxy, StarSystem, and ExplorationProgress schemas are imported from their respective files

/**
 * Encapsulates the entire state of a saved game.
 * This matches the structure actually created by the frontend.
 */
export const GameDataSchema = z.object({
	// Core game state
	destinyStatus: DestinyStatusSchema,
	characters: z.array(CharacterSchema),
	technologies: z.array(z.string()),
	exploredRooms: z.array(z.string()),
	explorationProgress: z.array(ExplorationProgressSchema),

	// Galaxy and location data
	currentGalaxy: GalaxySchema.nullable(),
	currentSystem: StarSystemSchema.nullable(),
	knownGalaxies: z.array(GalaxySchema),
	knownSystems: z.array(StarSystemSchema),

	// Game engine state (may be present from game engine)
	playerPosition: PlayerPositionSchema.optional(),
	doorStates: z.array(DoorStateSchema).optional(),
	fogOfWar: FogOfWarDataSchema.optional(),
	fog_of_war: FogOfWarDataSchema.optional(), // Support both naming conventions
	mapZoom: z.number().optional(),
	currentBackgroundType: z.string().optional(),
});
export type GameData = z.infer<typeof GameDataSchema>;
