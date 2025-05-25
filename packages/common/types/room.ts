import { z } from 'zod';

export const RoomSchema = z.object({
	id: z.string(),
	gameId: z.string(),
	type: z.string(), // e.g., 'bridge', 'stargate', 'engineering', 'corridor', 'elevator', 'quarters', etc.
	x: z.number(), // Position coordinates
	y: z.number(),
	floor: z.number(), // Floor level (0 = main deck, negative = lower, positive = upper)
	assigned: z.array(z.string()).default([]), // Person or Robot IDs
	technology: z.array(z.string()).default([]), // Technology IDs
	fond: z.boolean().default(false),
	unlocked: z.boolean().default(false),
	status: z.enum(['damaged', 'destroyed', 'ok']).default('ok'),
	connectedRooms: z.array(z.string()).default([]), // Connected room IDs
	createdAt: z.date(),
});

export type Room = z.infer<typeof RoomSchema>;
