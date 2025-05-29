import { z } from 'zod';

export const TechnologyTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	category: z.string().optional(),
	unlock_requirements: z.string().optional(),
	cost: z.number().optional(),
	image: z.string().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type TechnologyTemplate = z.infer<typeof TechnologyTemplateSchema>;
