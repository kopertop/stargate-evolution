import { z } from 'zod';

export const RoomTemplateSchema = z.object({
	id: z.string(),
	layout_id: z.string(),
	type: z.string(),
	name: z.string(),
	description: z.string().nullable().optional(),
	position_x: z.number(),
	position_y: z.number(),
	floor: z.number(),
	initial_state: z.string(),
	size_factor: z.number(),
	technology: z.string().nullable().optional(),
	image: z.string().nullable().optional(),
	base_exploration_time: z.number().nullable().optional(),
	default_status: z.string().nullable().optional(),
	connection_north: z.string().nullable().optional(),
	connection_south: z.string().nullable().optional(),
	connection_east: z.string().nullable().optional(),
	connection_west: z.string().nullable().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type RoomTemplate = z.infer<typeof RoomTemplateSchema>;
