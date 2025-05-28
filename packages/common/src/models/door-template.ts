import { z } from 'zod';

export const DoorTemplateSchema = z.object({
	id: z.string(),
	layout_id: z.string(),
	from_room_id: z.string(),
	to_room_id: z.string(),
	requirements: z.string().nullable().optional(),
	initial_state: z.string(),
	description: z.string().nullable().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type DoorTemplate = z.infer<typeof DoorTemplateSchema>;
