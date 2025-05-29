import type { D1Database } from '@cloudflare/workers-types';
import { RoomTemplateSchema, type RoomTemplate } from '@stargate/common/models/room-template';

export async function getAllRoomTemplates(db: D1Database): Promise<RoomTemplate[]> {
	const result = await db.prepare('SELECT * FROM room_templates ORDER BY layout_id, id').all();
	return RoomTemplateSchema.array().parse(result.results);
}

export async function getRoomTemplateById(db: D1Database, id: string): Promise<RoomTemplate | null> {
	const result = await db.prepare('SELECT * FROM room_templates WHERE id = ?').bind(id).first();
	return result ? RoomTemplateSchema.parse(result) : null;
}

export async function getRoomTemplatesByType(db: D1Database, type: string): Promise<RoomTemplate[]> {
	const result = await db.prepare('SELECT * FROM room_templates WHERE type = ? ORDER BY name').bind(type).all();
	return RoomTemplateSchema.array().parse(result.results);
}

export async function getRoomsByLayoutId(db: D1Database, layout_id: string): Promise<RoomTemplate[]> {
	const result = await db.prepare('SELECT * FROM room_templates WHERE layout_id = ? ORDER BY id').bind(layout_id).all();
	return RoomTemplateSchema.array().parse(result.results);
}
