import type { D1Database } from '@cloudflare/workers-types';
import { RoomTechnologySchema, type RoomTechnology } from '@stargate/common/models/room-technology';
import { TechnologyTemplateSchema, type TechnologyTemplate } from '@stargate/common/models/technology-template';

export async function getAllTechnologyTemplates(db: D1Database): Promise<TechnologyTemplate[]> {
	const result = await db.prepare('SELECT * FROM technology_templates ORDER BY category, name').all();
	return TechnologyTemplateSchema.array().parse(result.results);
}

export async function getTechnologyTemplateById(db: D1Database, id: string): Promise<TechnologyTemplate | null> {
	const result = await db.prepare('SELECT * FROM technology_templates WHERE id = ?').bind(id).first();
	return result ? TechnologyTemplateSchema.parse(result) : null;
}

export async function getTechnologyTemplatesByCategory(db: D1Database, category: string): Promise<TechnologyTemplate[]> {
	const result = await db.prepare('SELECT * FROM technology_templates WHERE category = ? ORDER BY name').bind(category).all();
	return TechnologyTemplateSchema.array().parse(result.results);
}

export async function getRoomTechnologyByRoomId(db: D1Database, room_id: string): Promise<RoomTechnology[]> {
	const result = await db.prepare('SELECT * FROM room_technology WHERE room_id = ? ORDER BY id').bind(room_id).all();
	return RoomTechnologySchema.array().parse(result.results);
}

export async function getRoomTechnologyById(db: D1Database, id: string): Promise<RoomTechnology | null> {
	const result = await db.prepare('SELECT * FROM room_technology WHERE id = ?').bind(id).first();
	return result ? RoomTechnologySchema.parse(result) : null;
}

export async function getAllRoomTechnology(db: D1Database): Promise<RoomTechnology[]> {
	const result = await db.prepare('SELECT * FROM room_technology ORDER BY room_id, id').all();
	return RoomTechnologySchema.array().parse(result.results);
}
