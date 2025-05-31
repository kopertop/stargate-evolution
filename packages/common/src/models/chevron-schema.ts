import { z } from 'zod';

export const ChevronSchema = z.object({
	id: z.string(),
	stargate_id: z.string(),
	position: z.number(),
	symbol: z.string(),
	locked: z.boolean().default(false),
	created_at: z.number().optional(),
	updated_at: z.number().optional(),
});

export type Chevron = z.infer<typeof ChevronSchema>;