import { z } from 'zod';

// -- Cheveron Symbols --
export const CheveronSymbolSchema = z.object({
	id: z.string(),
	symbol: z.string(),
	description: z.string().optional(),
	image: z.string().optional(),
});
export type CheveronSymbol = z.infer<typeof CheveronSymbolSchema>;

// --- Stargate ---
export const StargateSchema = z.object({
	id: z.string(),
	// Unique address (e.g., 6-symbol code, (7th symbol is the point of origin))
	address: z.array(CheveronSymbolSchema).length(6),
	type: z.enum(['planetary', 'ship', 'master']),
	locationId: z.string(), // ID of Room, Planet, or StarSystem
	connectedTo: z.array(z.string()), // IDs of connected Stargates
});
export type Stargate = z.infer<typeof StargateSchema>;