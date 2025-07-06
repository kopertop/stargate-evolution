import { z } from 'zod';

export const RoomTemplateSchema = z.object({
	id: z.string(),
	template_id: z.string().optional().nullable(),
	layout_id: z.string(),
	type: z.string(),
	name: z.string(),
	description: z.string().optional().nullable(),

	// Coordinate-based positioning for Swift SpriteKit (required - no legacy data)
	startX: z.number(),
	endX: z.number(),
	startY: z.number(),
	endY: z.number(),
	floor: z.number(),

	// Legacy width/height calculated automatically in database
	width: z.number().optional().nullable(),
	height: z.number().optional().nullable(),

	found: z.union([z.boolean(), z.number()]).optional().transform((val) => val === true || val === 1),
	locked: z.union([z.boolean(), z.number()]).optional().transform((val) => val === true || val === 1),
	explored: z.union([z.boolean(), z.number()]).optional().transform((val) => val === true || val === 1),
	exploration_data: z.string().optional().nullable(),
	image: z.string().nullable(),
	base_exploration_time: z.number().optional().nullable(),
	status: z.string().optional().nullable(),

	// Legacy connection fields - deprecated but may still exist in old data
	connection_north: z.string().nullable().optional(),
	connection_south: z.string().nullable().optional(),
	connection_east: z.string().nullable().optional(),
	connection_west: z.string().nullable().optional(),

	created_at: z.number(),
	updated_at: z.number(),
}).refine((data) => {
	// Ensure coordinates are valid
	return data.startX < data.endX && data.startY < data.endY;
}, {
	message: 'Room coordinates must be valid: startX < endX and startY < endY',
});

export type RoomTemplate = z.infer<typeof RoomTemplateSchema>;
