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
	game_days: z.number(), // Deprecated - keeping for backward compatibility
	game_hours: z.number(), // Deprecated - keeping for backward compatibility
	current_time: z.number(), // Seconds since game start
	next_jump_time: z.number(), // Exact second when next FTL transition occurs
	time_speed: z.number(), // Seconds per real-world second (default: 1)
	ftl_status: z.string(), // 'ftl' or 'normal_space'
	next_ftl_transition: z.number(), // Deprecated - keeping for backward compatibility
});

export type DestinyStatus= z.infer<typeof DestinyStatusSchema>;
