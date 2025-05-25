import { z } from 'zod';

import { ShipSchema, TechnologySchema } from './ship';

export const DestinyStatusSchema = ShipSchema.extend({
	shield: z.object({
		strength: z.number(),
		max: z.number(),
		coverage: z.number(), // percent 0-100
	}),
	inventory: z.record(z.string(), z.number()),
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
	notes: z.array(z.string()).optional(),
	gameDays: z.number().default(1),
	gameHours: z.number().default(0),
	ftlStatus: z.enum(['ftl', 'normal_space']).default('ftl'),
	nextFtlTransition: z.number().default(24), // hours until next FTL transition
});

export type DestinyStatus = z.infer<typeof DestinyStatusSchema>;
