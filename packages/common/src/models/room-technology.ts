import { z } from 'zod';

export const RoomTechnologySchema = z.object({
	id: z.string(),
	position: z.object({
		x: z.number().optional().nullable(),
		y: z.number().optional().nullable(),
	}),
	name: z.string().optional().nullable(),
	room_id: z.string(),
	technology_template_id: z.string(),
	count: z.number(),
	description: z.string().optional().nullable(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type RoomTechnology = z.infer<typeof RoomTechnologySchema>;
