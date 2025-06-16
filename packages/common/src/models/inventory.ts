import { z } from 'zod';

export const InventorySchema = z.object({
	id: z.string(),
	resource_type: z.string(),
	amount: z.number(),
	location: z.string().optional(),
	description: z.string().optional(),
	created_at: z.number(),
	updated_at: z.number(),
});

export type Inventory = z.infer<typeof InventorySchema>;
