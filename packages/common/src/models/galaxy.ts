import { z } from 'zod';

export const GalaxySchema = z.object({
	id: z.string(),
	name: z.string(),
	x: z.number(),
	y: z.number(),
});

export type Galaxy = z.infer<typeof GalaxySchema>;

