import { z } from 'zod';

/**
 * NPC - Non-Player Characte
 */
export const PersonTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.string(),
	race_template_id: z.string().optional().nullable(),
	skills: z.string().transform((str) => {
		try {
			return JSON.parse(str) as string[];
		} catch {
			return [];
		}
	}).optional().nullable(), // JSON array of skill names stored as TEXT
	description: z.string().optional().nullable(),
	image: z.string().optional().nullable(),
	default_location: z.string().optional().nullable(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type PersonTemplate = z.infer<typeof PersonTemplateSchema>;
