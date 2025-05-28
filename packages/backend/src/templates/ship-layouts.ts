import type { D1Database } from '@cloudflare/workers-types';
import { DoorTemplateSchema } from '@stargate/common/src/models/door-template';
import { RoomTemplateSchema } from '@stargate/common/src/models/room-template';
import { ShipLayoutSchema } from '@stargate/common/src/models/ship-layout';
import { z } from 'zod';

import { getRoomTechnologyByRoomId } from './technology-templates';

export async function getAllLayoutIds(db: D1Database): Promise<string[]> {
	const result = await db.prepare('SELECT DISTINCT layout_id FROM room_templates ORDER BY layout_id').all();
	return result.results.map((row: any) => row.layout_id);
}

export async function getRoomsByLayoutId(db: D1Database, layout_id: string): Promise<z.infer<typeof RoomTemplateSchema>[]> {
	const result = await db.prepare('SELECT * FROM room_templates WHERE layout_id = ? ORDER BY id').bind(layout_id).all();
	return z.array(RoomTemplateSchema).parse(result.results);
}

export async function getDoorsByLayoutId(db: D1Database, layout_id: string): Promise<z.infer<typeof DoorTemplateSchema>[]> {
	const result = await db.prepare('SELECT * FROM door_templates WHERE layout_id = ? ORDER BY id').bind(layout_id).all();
	return z.array(DoorTemplateSchema).parse(result.results);
}

export async function getShipLayoutById(db: D1Database, layout_id: string): Promise<z.infer<typeof ShipLayoutSchema> | null> {
	const rooms = await getRoomsByLayoutId(db, layout_id);
	if (!rooms.length) return null;
	const doors = await getDoorsByLayoutId(db, layout_id);
	return ShipLayoutSchema.parse({ layout_id, rooms, doors });
}

// Enhanced version that includes room technology data
export async function getShipLayoutWithTechnology(db: D1Database, layout_id: string): Promise<any | null> {
	const rooms = await getRoomsByLayoutId(db, layout_id);
	if (!rooms.length) return null;
	const doors = await getDoorsByLayoutId(db, layout_id);

	// Get technology for each room
	const roomsWithTech = await Promise.all(
		rooms.map(async (room) => {
			const technology = await getRoomTechnologyByRoomId(db, room.id);
			return { ...room, technology };
		}),
	);

	return { layout_id, rooms: roomsWithTech, doors };
}

export async function getRoomById(db: D1Database, id: string): Promise<z.infer<typeof RoomTemplateSchema> | null> {
	const result = await db.prepare('SELECT * FROM room_templates WHERE id = ?').bind(id).first();
	if (!result) return null;
	return RoomTemplateSchema.parse(result);
}

export async function getDoorById(db: D1Database, id: string): Promise<z.infer<typeof DoorTemplateSchema> | null> {
	const result = await db.prepare('SELECT * FROM door_templates WHERE id = ?').bind(id).first();
	if (!result) return null;
	return DoorTemplateSchema.parse(result);
}
