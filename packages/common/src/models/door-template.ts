import { z } from 'zod';

export const DoorTemplateSchema = z.object({
	id: z.string(),
	layout_id: z.string(),
	from_room_id: z.string(),
	to_room_id: z.string(),
	requirements: z.string().optional(),
	initial_state: z.string(),
	description: z.string().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type DoorTemplate = z.infer<typeof DoorTemplateSchema>;

export const DoorRequirementSchema = z.object({
	type: z.string(),
	value: z.string(),
	met: z.boolean(),
});

export type DoorRequirement = z.infer<typeof DoorRequirementSchema>;
