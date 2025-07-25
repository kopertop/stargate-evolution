import { z } from 'zod';

export const TechnologySchema = z.object({
	id: z.string(),
	game_id: z.string(),
	name: z.string(),
	description: z.string().optional().nullable(),
	unlocked: z.boolean().default(false),
	created_at: z.number().optional().nullable(),
	updated_at: z.number().optional().nullable(),
});

export type Technology = z.infer<typeof TechnologySchema>;
