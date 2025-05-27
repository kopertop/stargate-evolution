import type { D1Database } from '@cloudflare/workers-types';

export interface RoomTemplate {
	id: string;
	layout_id: string;
	type: string;
	name: string;
	description?: string;
	position_x: number;
	position_y: number;
	floor: number;
	initial_state: string;
	size_factor: number;
	technology?: string;
	image?: string;
	base_exploration_time?: number;
	default_status?: string;
	connection_north?: string;
	connection_south?: string;
	connection_east?: string;
	connection_west?: string;
	created_at: number;
	updated_at: number;
}

export async function getAllRoomTemplates(db: D1Database): Promise<RoomTemplate[]> {
	const result = await db.prepare('SELECT * FROM room_templates ORDER BY layout_id, id').all();
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

export async function getRoomsByLayoutId(db: D1Database, layout_id: string): Promise<RoomTemplate[]> {
	const result = await db.prepare('SELECT * FROM room_templates WHERE layout_id = ? ORDER BY id').bind(layout_id).all();
	return result.results as unknown as RoomTemplate[];
}
