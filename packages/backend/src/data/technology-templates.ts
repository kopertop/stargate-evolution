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

export async function createRoomTechnology(db: D1Database, roomTech: Omit<RoomTechnology, 'created_at' | 'updated_at'>): Promise<RoomTechnology> {
	const now = Date.now();
	await db.prepare(`
		INSERT INTO room_technology (id, room_id, technology_template_id, count, description, position_x, position_y, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		roomTech.id,
		roomTech.room_id,
		roomTech.technology_template_id,
		roomTech.count,
		roomTech.description || null,
		roomTech.position?.x || null,
		roomTech.position?.y || null,
		now,
		now,
	).run();

	return {
		...roomTech,
		created_at: now,
		updated_at: now,
	};
}

export async function updateRoomTechnology(db: D1Database, id: string, updates: Partial<Omit<RoomTechnology, 'id' | 'created_at' | 'updated_at'>>): Promise<boolean> {
	const now = Date.now();
	const result = await db.prepare(`
		UPDATE room_technology
		SET room_id = COALESCE(?, room_id),
			technology_template_id = COALESCE(?, technology_template_id),
			count = COALESCE(?, count),
			description = COALESCE(?, description),
			updated_at = ?
		WHERE id = ?
	`).bind(
		updates.room_id || null,
		updates.technology_template_id || null,
		updates.count || null,
		updates.description || null,
		now,
		id,
	).run();

	return result.meta.changes > 0;
}

export async function deleteRoomTechnology(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare('DELETE FROM room_technology WHERE id = ?').bind(id).run();
	return result.meta.changes > 0;
}

export async function deleteRoomTechnologyByRoomId(db: D1Database, room_id: string): Promise<number> {
	const result = await db.prepare('DELETE FROM room_technology WHERE room_id = ?').bind(room_id).run();
	return result.meta.changes;
}

export async function setRoomTechnology(db: D1Database, room_id: string, technologies: Omit<RoomTechnology, 'created_at' | 'updated_at'>[]): Promise<void> {
	// First, delete all existing technology for this room
	await deleteRoomTechnologyByRoomId(db, room_id);

	// Then add the new technology
	for (const tech of technologies) {
		await createRoomTechnology(db, tech);
	}
}
