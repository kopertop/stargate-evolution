import { z } from 'zod';

export const TechnologyTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	category: z.string().nullable().optional(),
	unlock_requirements: z.string().nullable().optional(),
	cost: z.number().nullable().optional(),
	image: z.string().nullable().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type TechnologyTemplate = z.infer<typeof TechnologyTemplateSchema>;
