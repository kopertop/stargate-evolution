import { z } from 'zod';

export const StarSystemSchema = z.object({
	id: z.string(),
	name: z.string(),
	galaxy_id: z.string(),
	x: z.number(),
	y: z.number(),
	description: z.string().optional(),
	image: z.string().optional(),
});

export type StarSystem = z.infer<typeof StarSystemSchema>;
