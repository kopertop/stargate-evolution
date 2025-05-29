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
	race_id: z.string(),
	location: z.string(), // JSON
	stargate_id: z.string().optional(),
	shield: z.string(), // JSON
	atmosphere: z.string(), // JSON
	weapons: z.string(), // JSON
	shuttles: z.string(), // JSON
	notes: z.string().optional(), // JSON array
	game_days: z.number(),
	game_hours: z.number(),
	ftl_status: z.string(), // 'ftl' or 'normal_space'
	next_ftl_transition: z.number(), // hours until next FTL transition
	created_at: z.number(),
	updated_at: z.number(),
});

export type DestinyStatus= z.infer<typeof DestinyStatusSchema>;
