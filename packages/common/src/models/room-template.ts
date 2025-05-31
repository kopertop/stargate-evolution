import { z } from 'zod';

export const RoomTemplateSchema = z.object({
	id: z.string(),
	template_id: z.string().optional(),
	layout_id: z.string(),
	type: z.string(),
	name: z.string(),
	description: z.string().optional(),
	start_x: z.number(),
	start_y: z.number(),
	end_x: z.number(),
	end_y: z.number(),
	floor: z.number(),
	found: z.union([z.boolean(), z.number()]).optional().transform((val) => val === true || val === 1),
	locked: z.union([z.boolean(), z.number()]).optional().transform((val) => val === true || val === 1),
	explored: z.union([z.boolean(), z.number()]).optional().transform((val) => val === true || val === 1),
	exploration_data: z.string().optional(),
	image: z.string().nullable(),
	base_exploration_time: z.number().optional(),
	status: z.string().optional(),
	connection_north: z.string().nullable(),
	connection_south: z.string().nullable(),
	connection_east: z.string().nullable(),
	connection_west: z.string().nullable(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type RoomTemplate = z.infer<typeof RoomTemplateSchema>;
