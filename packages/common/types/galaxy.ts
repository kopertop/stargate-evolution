import { z } from 'zod';

import { StargateSchema } from './stargate';

// --- Planet ---
export const PlanetSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(), // e.g., 'terrestrial', 'gas giant', etc.
	resources: z.array(z.string()), // Resource IDs or names
	inhabitants: z.array(z.string()), // Person/Alien/Robot IDs
	stargate: StargateSchema.optional(),
});
export type Planet = z.infer<typeof PlanetSchema>;

// --- Star ---
export const StarSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(['yellow dwarf', 'red giant', 'white dwarf', 'neutron star', 'black hole']),
	description: z.string().optional(),
	image: z.string().optional(),
	radius: z.number(),
	mass: z.number(),
	temperature: z.number(),
	luminosity: z.number(),
	age: z.number(),
});

// --- Star System ---
export const StarSystemSchema = z.object({
	id: z.string(),
	name: z.string(),
	position: z.object({ x: z.number(), y: z.number() }),
	planets: z.array(PlanetSchema),
	stargates: z.array(StargateSchema), // Stargates in space (not on planets)
	description: z.string().optional(),
	image: z.string().optional(),
	stars: z.array(StarSchema),
});
export type StarSystem = z.infer<typeof StarSystemSchema>;

// --- Galaxy ---
export const GalaxySchema = z.object({
	seed: z.string(),
	starSystems: z.array(StarSystemSchema),
});
export type Galaxy = z.infer<typeof GalaxySchema>;
