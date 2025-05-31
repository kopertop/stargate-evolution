import { z } from 'zod';

export const DoorInfoSchema = z.object({
	id: z.string(),
	toRoomId: z.string(),
	state: z.enum(['opened', 'closed', 'locked']),
	requirements: z.array(z.object({
		type: z.string(),
		value: z.string(),
		description: z.string().optional(),
		met: z.boolean().optional(),
	})).optional(),
});

export type DoorInfo = z.infer<typeof DoorInfoSchema>;
