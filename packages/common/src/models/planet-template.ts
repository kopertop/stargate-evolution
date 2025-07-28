import { z } from 'zod';

export const PlanetTemplateSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(), // 'habitable', 'desert', 'ice', etc.
	star_system_template_id: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	stargate_address: z.string().optional().nullable(), // JSON array or string stored as TEXT
	technology: z.string().transform((str) => {
		try {
			return JSON.parse(str) as string[];
		} catch {
			return [];
		}
	}).optional().nullable(), // JSON array of technology template IDs stored as TEXT
	resources: z.string().transform((str) => {
		try {
			return JSON.parse(str) as Record<string, any>;
		} catch {
			return {};
		}
	}).optional().nullable(), // JSON object/array stored as TEXT
	created_at: z.number(),
	updated_at: z.number(),
});

export type PlanetTemplate = z.infer<typeof PlanetTemplateSchema>;