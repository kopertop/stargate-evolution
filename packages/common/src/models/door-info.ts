import { z } from 'zod';

export const DoorRequirementSchema = z.object({
	type: z.string(),
	value: z.number().default(1),
	description: z.string().optional(),
	met: z.boolean().optional(),
});

export const DoorInfoSchema = z.object({
	id: z.string(),
	toRoomId: z.string(),
	state: z.enum(['opened', 'closed', 'locked']),
	requirements: z.array(DoorRequirementSchema).optional(),
});

export type DoorInfo = z.infer<typeof DoorInfoSchema>;
export type DoorRequirement = z.infer<typeof DoorRequirementSchema>;
