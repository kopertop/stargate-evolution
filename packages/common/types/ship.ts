import { z } from 'zod';

// --- Technology ---
export const TechnologySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	unlocked: z.boolean().default(false),
	cost: z.number().min(0),
	image: z.string().optional(),
	abilities: z.array(z.string()).optional(),
});
export type Technology = z.infer<typeof TechnologySchema>;

// --- Room ---
export const RoomSchema = z.object({
	id: z.string(),
	type: z.string(), // e.g., 'bridge', 'stargate', 'engine', etc.
	assigned: z.array(z.string()), // Person or Robot IDs
	technology: z.array(TechnologySchema),
});
export type Room = z.infer<typeof RoomSchema>;

// --- Ship ---
export const ShipSchema = z.object({
	id: z.string(),
	name: z.string(),
	power: z.number().min(0),
	maxPower: z.number().min(0),
	shields: z.number().min(0),
	maxShields: z.number().min(0),
	hull: z.number().min(0),
	maxHull: z.number().min(0),
	raceId: z.string(),
	rooms: z.array(RoomSchema),
	crew: z.array(z.string()), // Person IDs
	location: z.object({ systemId: z.string(), planetId: z.string().optional() }),
	stargate: z.string().optional(), // Stargate ID
});
export type Ship = z.infer<typeof ShipSchema>;

// --- Race ---
export const RaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	technology: z.array(TechnologySchema),
	ships: z.array(ShipSchema),
});
export type Race = z.infer<typeof RaceSchema>;
