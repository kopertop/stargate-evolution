import { z } from 'zod';

// --- Technology ---
export const TechnologySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	unlocked: z.union([z.boolean(), z.number()]).transform(val => Boolean(val)).default(false),
	cost: z.number().min(0),
	image: z.string().nullable().transform(val => val ?? undefined).optional(),
	abilities: z.array(z.string()).default([]).optional(),
	number_on_destiny: z.number().optional(),
});
export type Technology = z.infer<typeof TechnologySchema>;


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
	crew: z.array(z.string()).default([]), // Person IDs
	location: z.object({ systemId: z.string(), planetId: z.string().optional() }),
	stargate: z.string().optional(), // Stargate ID
});
export type Ship = z.infer<typeof ShipSchema>;

// --- Race ---
export const RaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	technology: z.array(TechnologySchema).default([]),
	ships: z.array(ShipSchema).default([]),
});
export type Race = z.infer<typeof RaceSchema>;
