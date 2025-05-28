import { z } from 'zod';

export const RoomTemplateSchema = z.object({
	id: z.string(),
	layout_id: z.string(),
	type: z.string(),
	name: z.string(),
	description: z.string().nullable().optional(),
	start_x: z.number(),
	start_y: z.number(),
	end_x: z.number(),
	end_y: z.number(),
	floor: z.number(),
	initial_state: z.string(),
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
