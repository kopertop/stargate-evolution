import { z } from 'zod';

/**
 * Resources available on Destiny
 */

// --- Resource Types ---
export const ResourceTypeSchema = z.enum([
	'food',
	'water',
	'oxygen',
	'power',
	'medicine',
	'ammunition',
	'minerals',
	'fuel',
	'parts',
	'ancient_tech',
	'other', // For extensibility
]);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

// --- Resource ---
export const ResourceSchema = z.object({
	id: z.string(),
	type: ResourceTypeSchema,
	name: z.string(),
	amount: z.number(),
	unit: z.string().optional(), // e.g., kg, L, units
	description: z.string().optional(),
});
export type Resource = z.infer<typeof ResourceSchema>;
