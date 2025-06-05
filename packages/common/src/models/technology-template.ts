import { z } from 'zod';

export const TechnologyTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	category: z.string().optional().nullable(),
	unlock_requirements: z.string().optional().nullable(),
	cost: z.number().optional().nullable(),
	image: z.string().optional().nullable(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type TechnologyTemplate = z.infer<typeof TechnologyTemplateSchema>;
