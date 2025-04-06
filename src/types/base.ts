import { z } from 'zod';

// Basic position type for 3D locations
export const Position = z.object({
	x: z.number(),
	y: z.number(),
	z: z.number()
});

export type Position = z.infer<typeof Position>;

// Base identifier and metadata schema that most game entities will inherit from
export const BaseEntity = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	position: Position.optional()
});

export type BaseEntity = z.infer<typeof BaseEntity>;

// Common resource type used across the game
export const ResourceType = z.enum([
	'MINERAL',
	'ORGANIC',
	'ENERGY',
	'EXOTIC',
	'NAQUADAH'
]);

export type ResourceType = z.infer<typeof ResourceType>;

// Resource deposit schema
export const ResourceDeposit = z.object({
	type: ResourceType,
	abundance: z.number().min(0).max(1), // 0.0-1.0
	difficulty: z.number().min(0).max(1), // 0.0-1.0
	discovered: z.boolean().default(false)
});

export type ResourceDeposit = z.infer<typeof ResourceDeposit>;

// Climate types
export const ClimateType = z.enum([
	'DESERT',
	'FOREST',
	'ICE',
	'VOLCANIC',
	'TEMPERATE',
	'OCEAN',
	'TOXIC',
	'MOUNTAINOUS'
]);

export type ClimateType = z.infer<typeof ClimateType>;

// Exploration status
export const ExplorationStatus = z.enum([
	'UNEXPLORED',
	'PARTIALLY_EXPLORED',
	'EXPLORED',
	'FULLY_DOCUMENTED'
]);

export type ExplorationStatus = z.infer<typeof ExplorationStatus>;

// Personnel types that can be assigned to bases or missions
export const PersonnelType = z.enum([
	'SCIENTIST',
	'MILITARY',
	'ENGINEER',
	'DIPLOMAT'
]);

export type PersonnelType = z.infer<typeof PersonnelType>;

// Building types that can be constructed on bases
export const BuildingType = z.enum([
	'MINING_FACILITY',
	'RESEARCH_LAB',
	'POWER_GENERATOR',
	'DEFENSE_SYSTEM',
	'BARRACKS',
	'STARGATE_SHIELD'
]);

export type BuildingType = z.infer<typeof BuildingType>;

// Building schema
export const Building = BaseEntity.extend({
	type: BuildingType,
	level: z.number().min(1).default(1),
	constructionProgress: z.number().min(0).max(100).default(0),
	constructionComplete: z.boolean().default(false),
	active: z.boolean().default(false)
});

export type Building = z.infer<typeof Building>;

// Base types
export const BaseType = z.enum([
	'MINING',
	'RESEARCH',
	'MILITARY',
	'DIPLOMATIC',
	'MIXED'
]);

export type BaseType = z.infer<typeof BaseType>;

// Base schema (facility on a planet)
export const Base = BaseEntity.extend({
	type: BaseType,
	level: z.number().min(1).default(1),
	buildings: z.array(Building).default([]),
	constructionProgress: z.number().min(0).max(100).default(0),
	constructionComplete: z.boolean().default(false),
	personnel: z.record(z.string(), z.number()).default({})
});

export type Base = z.infer<typeof Base>;

// Civilization schema for populated planets
export const Civilization = z.object({
	name: z.string(),
	friendliness: z.number().min(-1).max(1), // -1.0 to 1.0
	technologicalLevel: z.number().min(0).max(1), // 0.0 to 1.0
	description: z.string()
});

export type Civilization = z.infer<typeof Civilization>;

// Base Planet type that can be extended with more game-specific functionality
export const BasePlanet = BaseEntity.extend({
	climate: ClimateType,
	resources: z.array(ResourceDeposit).default([]),
	explorationStatus: ExplorationStatus.default(ExplorationStatus.enum.UNEXPLORED),
	bases: z.array(Base).default([]),
	threatLevel: z.number().min(0).max(10).default(0),
	civilization: Civilization.optional(),
	hasStargate: z.boolean().default(false)
});

export type BasePlanet = z.infer<typeof BasePlanet>;

// Helper functions for type checking
export function isBaseEntity(obj: any): obj is BaseEntity {
	return BaseEntity.safeParse(obj).success;
}

export function isBasePlanet(obj: any): obj is BasePlanet {
	return BasePlanet.safeParse(obj).success;
}

export function isBuilding(obj: any): obj is Building {
	return Building.safeParse(obj).success;
}

export function isBase(obj: any): obj is Base {
	return Base.safeParse(obj).success;
}
