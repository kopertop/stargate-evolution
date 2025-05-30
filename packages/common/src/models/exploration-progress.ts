import { z } from 'zod';

export const ExplorationProgressSchema = z.object({
	room_id: z.string(),
	progress: z.number(),
	crew_assigned: z.array(z.string()),
	time_remaining: z.number(),
});

export type ExplorationProgress = z.infer<typeof ExplorationProgressSchema>;