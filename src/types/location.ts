import { z } from 'zod';
import { BaseEntity, Position } from './base';

// Define room types
export const LocationType = z.enum([
	'STARGATE_ROOM',
	'CORRIDOR',
	'COMMAND_CENTER',
	'LIVING_QUARTERS',
	'RESEARCH_LAB',
	'ARMORY',
	'POWER_ROOM',
	'STORAGE',
	'MEDICAL_BAY',
	'HANGAR',
	'ANCIENT_RUINS',
	'MARKETPLACE',
	'VILLAGE_CENTER',
	'TEMPLE',
	'CAVE',
	'WILDERNESS'
]);

export type LocationType = z.infer<typeof LocationType>;

// Location position for 3D placement - extends base Position with rotation
export const LocationPosition = Position.extend({
	rotation: z.number().default(0) // Rotation around y-axis in radians
});

export type LocationPosition = z.infer<typeof LocationPosition>;

// Define visual theme for rooms
export const LocationTheme = z.object({
	wallColor: z.string(),
	floorColor: z.string(),
	ceilingColor: z.string().optional(),
	ambientLight: z.string(),
	pointLightColor: z.string(),
	pointLightIntensity: z.number().default(1)
});

export type LocationTheme = z.infer<typeof LocationTheme>;

// A door or connection between rooms
export const LocationConnection = z.object({
	targetLocationId: z.string(),
	position: LocationPosition,
	isLocked: z.boolean().default(false),
	requiredKeyItem: z.string().optional(),
	isHidden: z.boolean().default(false)
});

export type LocationConnection = z.infer<typeof LocationConnection>;

// Define a single room - extends BaseEntity
export const Location = BaseEntity.extend({
	type: LocationType,
	position: LocationPosition,
	theme: LocationTheme.optional(), // If not provided, use planet default theme
	connections: z.array(LocationConnection).default([]),
	npcs: z.array(z.string()).default([]), // NPC IDs for this room
	items: z.array(z.string()).default([]), // Item IDs in this room
	events: z.array(z.string()).default([]), // Event triggers in this room
	isDiscovered: z.boolean().default(false),
	planetId: z.string() // Reference to parent planet
});

export type Location = z.infer<typeof Location>;

// Helper function to create a new room
export function createLocation(roomData: z.input<typeof Location>): Location {
	return Location.parse(roomData);
}

// Helper function to type-check if an object is a Location
export function isLocation(obj: unknown): obj is Location {
	return Location.safeParse(obj).success;
}
