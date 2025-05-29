import type { D1Database } from '@cloudflare/workers-types';
import { DoorTemplateSchema, type DoorTemplate } from '@stargate/common/models/door-template';

export async function getAllDoorTemplates(db: D1Database): Promise<DoorTemplate[]> {
	const result = await db.prepare('SELECT * FROM door_templates ORDER BY id').all();
	return DoorTemplateSchema.array().parse(result.results);
}

export async function getDoorTemplateById(db: D1Database, id: string): Promise<DoorTemplate | null> {
	const result = await db.prepare('SELECT * FROM door_templates WHERE id = ?').bind(id).first();
	return result ? DoorTemplateSchema.parse(result) : null;
}

export async function getDoorsByLayoutId(db: D1Database, layout_id: string): Promise<DoorTemplate[]> {
	const result = await db.prepare('SELECT * FROM door_templates WHERE layout_id = ? ORDER BY id').bind(layout_id).all();
	return DoorTemplateSchema.array().parse(result.results);
}
