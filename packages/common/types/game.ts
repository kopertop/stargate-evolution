import { z } from 'zod';

import { GalaxySchema } from './galaxy';
import { StarSystemSchema } from './galaxy';
import { StarSchema } from './galaxy';
import { PlanetSchema } from './galaxy';
import { PersonSchema } from './people';
import { TechnologySchema, RaceSchema, ShipSchema, RoomSchema } from './ship';
import { StargateSchema, CheveronSymbolSchema } from './stargate';

export const GameSchema = z.object({
	galaxies: z.array(GalaxySchema),
	starSystems: z.array(StarSystemSchema),
	stars: z.array(StarSchema),
	planets: z.array(PlanetSchema),
	stargates: z.array(StargateSchema),
	chevrons: z.array(CheveronSymbolSchema),
	technology: z.array(TechnologySchema),
	races: z.array(RaceSchema),
	ships: z.array(ShipSchema),
	rooms: z.array(RoomSchema),
	people: z.array(PersonSchema),
});

export type Game = z.infer<typeof GameSchema>;

export const GameSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	created_at: z.number().nullable().optional(),
	updated_at: z.number().nullable().optional(),
	last_played: z.number().nullable().optional(),
	current: z
		.union([z.boolean(), z.number(), z.null(), z.undefined()])
		.transform(val => {
			if (typeof val === 'boolean') return val;
			if (typeof val === 'number') return val === 1;
			return undefined;
		})
		.optional(),
});

export type GameSummary = z.infer<typeof GameSummarySchema>;

export const GameSummaryListSchema = z.array(GameSummarySchema);

export type GameSummaryList = z.infer<typeof GameSummaryListSchema>;