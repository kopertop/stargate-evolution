import { z } from 'zod';

import { StargateSchema } from './stargate';

// --- Planet ---
export const PlanetSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(), // e.g., 'terrestrial', 'gas giant', etc.
	resources: z.array(z.string()).default([]), // Resource IDs or names
	inhabitants: z.array(z.string()).default([]), // Person/Alien/Robot IDs
	stargate: StargateSchema.optional(),
});
export type Planet = z.infer<typeof PlanetSchema>;

// --- Star ---
export const StarSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(['yellow dwarf', 'red giant', 'white dwarf', 'neutron star', 'black hole']),
	description: z.string().nullable().transform(val => val ?? undefined).optional(),
	image: z.string().nullable().transform(val => val ?? undefined).optional(),
	radius: z.number(),
	mass: z.number(),
	temperature: z.number(),
	luminosity: z.number(),
	age: z.number(),
});

export type Star = z.infer<typeof StarSchema>;

// --- Star System ---
export const StarSystemSchema = z.object({
	id: z.string(),
	name: z.string(),
	position: z.object({ x: z.number(), y: z.number() }),
	planets: z.array(PlanetSchema).default([]),
	stargates: z.array(StargateSchema).default([]), // Stargates in space (not on planets)
	description: z.string().nullable().transform(val => val ?? undefined).optional(),
	image: z.string().nullable().transform(val => val ?? undefined).optional(),
	stars: z.array(StarSchema).default([]),
});
export type StarSystem = z.infer<typeof StarSystemSchema>;

// --- Galaxy ---
export const GalaxySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable().transform(val => val ?? undefined).optional(),
	image: z.string().nullable().transform(val => val ?? undefined).optional(),
	position: z.object({ x: z.number(), y: z.number() }),
	starSystems: z.array(StarSystemSchema).default([]),
});
export type Galaxy = z.infer<typeof GalaxySchema>;
