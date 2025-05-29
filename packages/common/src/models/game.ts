import { z } from 'zod';

export const GameSchema = z.object({
	id: z.string(),
	name: z.string(),
	total_time_progressed: z.number().default(0),
	created_at: z.number(),
	updated_at: z.number(),
	last_played: z.number(),
});

export type GameType = z.infer<typeof GameSchema>;
