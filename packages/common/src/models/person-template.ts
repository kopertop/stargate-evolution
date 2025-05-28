import { z } from 'zod';

export const PersonTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.string(),
	race_template_id: z.string().nullable().optional(),
	skills: z.string(),
	description: z.string().nullable().optional(),
	image: z.string().nullable().optional(),
	default_location: z.string().nullable().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type PersonTemplate = z.infer<typeof PersonTemplateSchema>;
