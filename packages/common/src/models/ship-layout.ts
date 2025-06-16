import { z } from 'zod';

import { RoomTemplateSchema } from './room-template';

export const ShipLayoutSchema = z.object({
	layout_id: z.string(),
	rooms: z.array(RoomTemplateSchema),
});

export type ShipLayout = z.infer<typeof ShipLayoutSchema>;
