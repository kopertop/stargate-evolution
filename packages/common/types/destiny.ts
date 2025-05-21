import { z } from 'zod';

import { ShipSchema, TechnologySchema } from './ship';

// --- Room ---
export const RoomSchema = z.object({
	id: z.string(),
	type: z.string(), // e.g., 'bridge', 'stargate', 'engine', etc.
	assigned: z.array(z.string()).default([]), // Person or Robot IDs
	technology: z.array(TechnologySchema).default([]),
});
export type Room = z.infer<typeof RoomSchema>;

export const DestinyStatusSchema = ShipSchema.extend({
	shield: z.object({
		strength: z.number(),
		max: z.number(),
		coverage: z.number(), // percent 0-100
	}),
	inventory: z.record(z.string(), z.number()),
	unlockedRooms: z.array(z.string()),
	crewStatus: z.object({
		onboard: z.number(),
		capacity: z.number(),
		manifest: z.array(z.string()), // crew member IDs
	}),
	atmosphere: z.object({
		co2: z.number(),
		o2: z.number(),
		co2Scrubbers: z.number(),
		o2Scrubbers: z.number(),
	}),
	weapons: z.object({
		mainGun: z.boolean(),
		turrets: z.object({
			total: z.number(),
			working: z.number(),
		}),
	}),
	shuttles: z.object({
		total: z.number(),
		working: z.number(),
		damaged: z.number(),
	}),
	rooms: z.array(RoomSchema),
	notes: z.array(z.string()).optional(),
});

export type DestinyStatus = z.infer<typeof DestinyStatusSchema>;
