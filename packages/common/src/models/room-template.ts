import { z } from 'zod';

export const RoomTemplateSchema = z.object({
	id: z.string(),
	layout_id: z.string(),
	type: z.string(),
	name: z.string(),
	description: z.string().optional(),
	start_x: z.number(),
	start_y: z.number(),
	end_x: z.number(),
	end_y: z.number(),
	floor: z.number(),
	initial_state: z.string(),
	image: z.string().optional(),
	base_exploration_time: z.number().optional(),
	default_status: z.string().optional(),
	connection_north: z.string().optional(),
	connection_south: z.string().optional(),
	connection_east: z.string().optional(),
	connection_west: z.string().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type RoomTemplate = z.infer<typeof RoomTemplateSchema>;
