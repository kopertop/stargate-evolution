import { z } from 'zod';

export const RaceTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional().nullable(),
	default_technology: z.string().transform((str) => {
		try {
			return JSON.parse(str) as string[];
		} catch {
			return [];
		}
	}).optional().nullable(), // JSON array of technology IDs stored as TEXT
	default_ships: z.string().transform((str) => {
		try {
			return JSON.parse(str) as string[];
		} catch {
			return [];
		}
	}).optional().nullable(), // JSON array of ship template IDs stored as TEXT
	created_at: z.number(),
	updated_at: z.number(),
});

export type RaceTemplate = z.infer<typeof RaceTemplateSchema>;
