import type { D1Database } from '@cloudflare/workers-types';
import { DoorTemplateSchema, type Door } from '@stargate/common/models/door-info';

export async function getAllDoorTemplates(db: D1Database): Promise<Door[]> {
	const result = await db.prepare('SELECT * FROM doors ORDER BY from_room_id, to_room_id').all();
	return DoorTemplateSchema.array().parse(result.results);
}

export async function getDoorTemplateById(db: D1Database, doorId: string): Promise<Door | null> {
	const result = await db.prepare('SELECT * FROM doors WHERE id = ?').bind(doorId).first();
	if (!result) return null;
	return DoorTemplateSchema.parse(result);
}

export async function getDoorsForRoom(db: D1Database, roomId: string): Promise<Door[]> {
	const result = await db.prepare(
		'SELECT * FROM doors WHERE from_room_id = ? OR to_room_id = ? ORDER BY x, y',
	).bind(roomId, roomId).all();
	return DoorTemplateSchema.array().parse(result.results);
}

export async function createDoorTemplate(db: D1Database, doorData: Omit<Door, 'created_at' | 'updated_at'>): Promise<string> {
	const now = Date.now();
	await db.prepare(`
		INSERT INTO doors (
			id, name, from_room_id, to_room_id, x, y, width, height, rotation,
			state, is_automatic, open_direction, style, color, requirements, power_required, sound_effect,
			cleared, restricted, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		doorData.id,
		doorData.name || null,
		doorData.from_room_id,
		doorData.to_room_id,
		doorData.x,
		doorData.y,
		doorData.width || 32,
		doorData.height || 8,
		doorData.rotation || 0,
		doorData.state || 'closed',
		doorData.is_automatic || false,
		doorData.open_direction || 'inward',
		doorData.style || 'standard',
		doorData.color || null,
		doorData.requirements ? JSON.stringify(doorData.requirements) : null,
		doorData.power_required || 0,
		doorData.sound_effect || null,
		doorData.cleared || false,
		doorData.restricted || false,
		now,
		now,
	).run();

	return doorData.id;
}

export async function updateDoorTemplate(db: D1Database, doorId: string, doorData: Partial<Door>): Promise<void> {
	const now = Date.now();
	await db.prepare(`
		UPDATE doors SET
			name = ?, from_room_id = ?, to_room_id = ?, x = ?, y = ?, width = ?, height = ?, rotation = ?,
			state = ?, is_automatic = ?, open_direction = ?, style = ?, color = ?, requirements = ?,
			power_required = ?, sound_effect = ?, cleared = ?, restricted = ?, updated_at = ?
		WHERE id = ?
	`).bind(
		doorData.name || null,
		doorData.from_room_id,
		doorData.to_room_id,
		doorData.x,
		doorData.y,
		doorData.width || 32,
		doorData.height || 8,
		doorData.rotation || 0,
		doorData.state || 'closed',
		doorData.is_automatic || false,
		doorData.open_direction || 'inward',
		doorData.style || 'standard',
		doorData.color || null,
		doorData.requirements ? JSON.stringify(doorData.requirements) : null,
		doorData.power_required || 0,
		doorData.sound_effect || null,
		doorData.cleared || false,
		doorData.restricted || false,
		now,
		doorId,
	).run();
}

export async function deleteDoorTemplate(db: D1Database, doorId: string): Promise<void> {
	await db.prepare('DELETE FROM doors WHERE id = ?').bind(doorId).run();
}
