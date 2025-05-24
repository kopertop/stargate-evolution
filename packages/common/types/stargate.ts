import { z } from 'zod';

// -- Cheveron Symbols --
export const CheveronSymbolSchema = z.object({
	id: z.string(),
	symbol: z.string(),
	description: z.string().nullable().transform(val => val ?? undefined).optional(),
	image: z.string().nullable().transform(val => val ?? undefined).optional(),
});
export type CheveronSymbol = z.infer<typeof CheveronSymbolSchema>;

// --- Stargate ---
export const StargateSchema = z.object({
	id: z.string(),
	// Unique address (e.g., 6-symbol code, (7th symbol is the point of origin))
	address: z.array(CheveronSymbolSchema).default([]),
	type: z.enum(['planetary', 'ship', 'master']),
	locationId: z.string(), // ID of Room, Planet, or StarSystem
	connectedTo: z.array(z.string()).default([]), // IDs of connected Stargates
});
export type Stargate = z.infer<typeof StargateSchema>;
