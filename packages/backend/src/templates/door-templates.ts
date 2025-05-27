import type { D1Database } from '@cloudflare/workers-types';

export interface DoorTemplate {
	id: string;
	layout_id: string;
	from_room_id: string;
	to_room_id: string;
	requirements: string;
	initial_state: string;
	description?: string;
	created_at: number;
	updated_at: number;
}

export async function getAllDoorTemplates(db: D1Database): Promise<DoorTemplate[]> {
	const result = await db.prepare('SELECT * FROM door_templates ORDER BY layout_id, id').all();
	return result.results as unknown as DoorTemplate[];
}

export async function getDoorTemplateById(db: D1Database, id: string): Promise<DoorTemplate | null> {
	const result = await db.prepare('SELECT * FROM door_templates WHERE id = ?').bind(id).first();
	return result as unknown as DoorTemplate | null;
}

export async function getDoorsByLayoutId(db: D1Database, layout_id: string): Promise<DoorTemplate[]> {
	const result = await db.prepare('SELECT * FROM door_templates WHERE layout_id = ? ORDER BY id').bind(layout_id).all();
	return result.results as unknown as DoorTemplate[];
}
