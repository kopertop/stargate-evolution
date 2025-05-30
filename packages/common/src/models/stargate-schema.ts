import { z } from 'zod';

export const StargateSchema = z.object({
  id: z.string(),
  game_id: z.string(),
  location_id: z.string(), // could be planet, ship, etc.
  address: z.string(),
  status: z.string(),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
});

export type Stargate = z.infer<typeof StargateSchema>;