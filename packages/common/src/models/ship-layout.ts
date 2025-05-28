import { z } from 'zod';

import { DoorTemplateSchema } from './door-template';
import { RoomTemplateSchema } from './room-template';

export const ShipLayoutSchema = z.object({
	layout_id: z.string(),
	rooms: z.array(RoomTemplateSchema),
	doors: z.array(DoorTemplateSchema),
});

export type ShipLayout = z.infer<typeof ShipLayoutSchema>;
