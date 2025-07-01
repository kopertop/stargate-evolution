import { z } from 'zod';

export const DestinyStatusSchema = z.object({
	id: z.string(),
	name: z.string(),
	power: z.number(),
	max_power: z.number(),
	shields: z.number(),
	max_shields: z.number(),
	hull: z.number(),
	max_hull: z.number(),
	water: z.number(),
	max_water: z.number(),
	food: z.number(),
	max_food: z.number(),
	spare_parts: z.number(),
	max_spare_parts: z.number(),
	medical_supplies: z.number(),
	max_medical_supplies: z.number(),
	race_id: z.string(),
	location: z.string(), // JSON
	co2: z.number(),
	o2: z.number(),
	co2Scrubbers: z.number(),
	weapons: z.string(), // JSON
	shuttles: z.string(), // JSON
	game_days: z.number(),
	game_hours: z.number(),
	ftl_status: z.string(), // 'ftl' or 'normal_space'
	next_ftl_transition: z.number(), // hours until next FTL transition
});

export type DestinyStatus= z.infer<typeof DestinyStatusSchema>;
