import type { D1Database } from '@cloudflare/workers-types';

export interface RoomTemplate {
	id: string;
	type: string;
	name: string;
	description?: string;
	grid_width: number;
	grid_height: number;
	technology: string; // JSON array
	image?: string;
	base_exploration_time: number;
	default_status: string;
	created_at: number;
	updated_at: number;
}

export async function getAllRoomTemplates(db: D1Database): Promise<RoomTemplate[]> {
	const result = await db.prepare('SELECT * FROM room_templates ORDER BY type, name').all();
	return result.results as unknown as RoomTemplate[];
}

export async function getRoomTemplateById(db: D1Database, id: string): Promise<RoomTemplate | null> {
	const result = await db.prepare('SELECT * FROM room_templates WHERE id = ?').bind(id).first();
	return result as unknown as RoomTemplate | null;
}

export async function getRoomTemplatesByType(db: D1Database, type: string): Promise<RoomTemplate[]> {
	const result = await db.prepare('SELECT * FROM room_templates WHERE type = ? ORDER BY name').bind(type).all();
	return result.results as unknown as RoomTemplate[];
}
