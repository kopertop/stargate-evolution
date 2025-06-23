import { z } from 'zod';

export const PlanetSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	system_id: z.string(),
	position: z.number().int(),
	radius: z.number(),
	atmosphere: z.string().nullable(),
	habitable: z.boolean(),
	discovered_at: z.date(),
	owner_id: z.string().nullable(),
	resources: z.record(z.string(), z.number()).optional().nullable(),
});

export type Planet = z.infer<typeof PlanetSchema>;
