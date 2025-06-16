import { z } from 'zod';

export const RaceTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional(),
	default_technology: z.string(),
	default_ships: z.string(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type RaceTemplate = z.infer<typeof RaceTemplateSchema>;
