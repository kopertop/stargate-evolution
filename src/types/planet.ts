import { z } from 'zod';
import { BaseEntity, Position, ClimateType, ResourceDeposit, ExplorationStatus, Base, Civilization } from './base';
import { Room, RoomType, RoomPosition, RoomTheme, RoomConnection } from './room';

// Define planet-wide theme
export const PlanetTheme = z.object({
	name: z.string(),
	defaultWallColor: z.string(),
	defaultFloorColor: z.string(),
	defaultCeilingColor: z.string().optional(),
	defaultAmbientLight: z.string(),
	defaultPointLightColor: z.string(),
	defaultPointLightIntensity: z.number().default(1),
	skyboxTexture: z.string().optional(), // Path to skybox texture if applicable
	atmosphereColor: z.string().optional(), // For outdoor scenes
	fogDensity: z.number().optional() // For atmospheric effects
});

export type PlanetTheme = z.infer<typeof PlanetTheme>;

// Define the Planet schema with Zod - extends BaseEntity
export const Planet = BaseEntity.extend({
	// From BasePlanet
	climate: ClimateType,
	resources: z.array(ResourceDeposit).default([]),
	explorationStatus: ExplorationStatus.default(ExplorationStatus.enum.UNEXPLORED),
	bases: z.array(Base).default([]),
	threatLevel: z.number().min(0).max(10).default(0),
	civilization: Civilization.optional(),
	hasStargate: z.boolean().default(true), // Default to true for our game

	// Additional fields for our game
	type: z.string(), // Planet type (desert, forest, etc.)
	address: z.string(), // Stargate address
	theme: PlanetTheme,

	// Rooms that make up this planet
	rooms: z.array(Room),

	// ID of the room that contains the stargate (entry point)
	stargateRoomId: z.string(),

	// Position in the galaxy map (if applicable)
	galaxyPosition: Position.optional(),

	// Additional metadata
	isExplored: z.boolean().default(false),
	dangerLevel: z.number().min(0).max(10).default(0),
	requiredTechLevel: z.number().min(0).default(0),
	firstVisitDate: z.string().optional(), // ISO date string

	// Special planet features
	hasAtmosphere: z.boolean().default(true),
	gravity: z.number().default(1), // 1 = Earth normal
	temperature: z.number(), // Average temperature in Celsius

	// Resource-related
	availableResources: z.array(
		z.object({
			type: z.string(), // Resource type
			abundance: z.number().min(0).max(1) // 0-1 scale
		})
	).default([]),

	// Custom properties for special gameplay mechanics
	customProperties: z.record(z.string(), z.any()).optional()
});

export type Planet = z.infer<typeof Planet>;

// Define a simple Planet ID type for use in the actual game
export const PlanetId = z.enum(['Earth', 'Abydos']);
export type PlanetId = z.infer<typeof PlanetId>;

// Helper function to create a new planet
export function createPlanet(planetData: z.input<typeof Planet>): Planet {
	return Planet.parse(planetData);
}

// Helper function to type-check if an object is a Planet
export function isPlanet(obj: unknown): obj is Planet {
	return Planet.safeParse(obj).success;
}
