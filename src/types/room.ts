import { z } from 'zod';
import { BaseEntity, Position } from './base';

// Define room types
export const RoomType = z.enum([
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

export type RoomType = z.infer<typeof RoomType>;

// Room position for 3D placement - extends base Position with rotation
export const RoomPosition = Position.extend({
	rotation: z.number().default(0) // Rotation around y-axis in radians
});

export type RoomPosition = z.infer<typeof RoomPosition>;

// Define visual theme for rooms
export const RoomTheme = z.object({
	wallColor: z.string(),
	floorColor: z.string(),
	ceilingColor: z.string().optional(),
	ambientLight: z.string(),
	pointLightColor: z.string(),
	pointLightIntensity: z.number().default(1)
});

export type RoomTheme = z.infer<typeof RoomTheme>;

// A door or connection between rooms
export const RoomConnection = z.object({
	targetRoomId: z.string(),
	position: RoomPosition,
	isLocked: z.boolean().default(false),
	requiredKeyItem: z.string().optional(),
	isHidden: z.boolean().default(false)
});

export type RoomConnection = z.infer<typeof RoomConnection>;

// Define a single room - extends BaseEntity
export const Room = BaseEntity.extend({
	type: RoomType,
	position: RoomPosition,
	theme: RoomTheme.optional(), // If not provided, use planet default theme
	connections: z.array(RoomConnection).default([]),
	npcs: z.array(z.string()).default([]), // NPC IDs for this room
	items: z.array(z.string()).default([]), // Item IDs in this room
	events: z.array(z.string()).default([]), // Event triggers in this room
	isDiscovered: z.boolean().default(false),
	planetId: z.string() // Reference to parent planet
});

export type Room = z.infer<typeof Room>;

// Helper function to create a new room
export function createRoom(roomData: z.input<typeof Room>): Room {
	return Room.parse(roomData);
}

// Helper function to type-check if an object is a Room
export function isRoom(obj: unknown): obj is Room {
	return Room.safeParse(obj).success;
}
