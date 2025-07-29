import type { D1Database } from '@cloudflare/workers-types';
import { RoomTemplateSchema, type RoomTemplate } from '@stargate/common/models/room-template';
import { ulid } from 'ulid';

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

export async function createRoomTemplate(db: D1Database, templateData: Omit<RoomTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<RoomTemplate> {
	const id = ulid();
	const now = Date.now();

	const result = await db.prepare(`
		INSERT INTO room_templates (
			id, layout_id, type, name, description, default_width, default_height,
			default_image, category, min_width, max_width, min_height, max_height,
			placement_requirements, compatible_layouts, tags, version, is_active,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		id,
		templateData.layout_id,
		templateData.type,
		templateData.name,
		templateData.description,
		templateData.default_width,
		templateData.default_height,
		templateData.default_image,
		templateData.category,
		templateData.min_width,
		templateData.max_width,
		templateData.min_height,
		templateData.max_height,
		templateData.placement_requirements,
		templateData.compatible_layouts,
		templateData.tags,
		templateData.version,
		templateData.is_active,
		now,
		now
	).run();

	if (!result.success) {
		throw new Error('Failed to create room template');
	}

	return {
		...templateData,
		id,
		created_at: now,
		updated_at: now,
	};
}

export async function updateRoomTemplate(db: D1Database, id: string, templateData: Partial<Omit<RoomTemplate, 'id' | 'created_at' | 'updated_at'>>): Promise<RoomTemplate | null> {
	const now = Date.now();

	// Build dynamic update query
	const updateFields: string[] = [];
	const values: any[] = [];

	if (templateData.layout_id !== undefined) {
		updateFields.push('layout_id = ?');
		values.push(templateData.layout_id);
	}
	if (templateData.type !== undefined) {
		updateFields.push('type = ?');
		values.push(templateData.type);
	}
	if (templateData.name !== undefined) {
		updateFields.push('name = ?');
		values.push(templateData.name);
	}
	if (templateData.description !== undefined) {
		updateFields.push('description = ?');
		values.push(templateData.description);
	}
	if (templateData.default_width !== undefined) {
		updateFields.push('default_width = ?');
		values.push(templateData.default_width);
	}
	if (templateData.default_height !== undefined) {
		updateFields.push('default_height = ?');
		values.push(templateData.default_height);
	}
	if (templateData.default_image !== undefined) {
		updateFields.push('default_image = ?');
		values.push(templateData.default_image);
	}
	if (templateData.category !== undefined) {
		updateFields.push('category = ?');
		values.push(templateData.category);
	}
	if (templateData.min_width !== undefined) {
		updateFields.push('min_width = ?');
		values.push(templateData.min_width);
	}
	if (templateData.max_width !== undefined) {
		updateFields.push('max_width = ?');
		values.push(templateData.max_width);
	}
	if (templateData.min_height !== undefined) {
		updateFields.push('min_height = ?');
		values.push(templateData.min_height);
	}
	if (templateData.max_height !== undefined) {
		updateFields.push('max_height = ?');
		values.push(templateData.max_height);
	}
	if (templateData.placement_requirements !== undefined) {
		updateFields.push('placement_requirements = ?');
		values.push(templateData.placement_requirements);
	}
	if (templateData.compatible_layouts !== undefined) {
		updateFields.push('compatible_layouts = ?');
		values.push(templateData.compatible_layouts);
	}
	if (templateData.tags !== undefined) {
		updateFields.push('tags = ?');
		values.push(templateData.tags);
	}
	if (templateData.version !== undefined) {
		updateFields.push('version = ?');
		values.push(templateData.version);
	}
	if (templateData.is_active !== undefined) {
		updateFields.push('is_active = ?');
		values.push(templateData.is_active);
	}

	updateFields.push('updated_at = ?');
	values.push(now);
	values.push(id);

	const result = await db.prepare(`
		UPDATE room_templates
		SET ${updateFields.join(', ')}
		WHERE id = ?
	`).bind(...values).run();

	if (!result.success) {
		throw new Error('Failed to update room template');
	}

	if (result.meta.changes === 0) {
		return null; // No template found with that ID
	}

	// Return the updated template
	return getRoomTemplateById(db, id);
}

export async function deleteRoomTemplate(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare('DELETE FROM room_templates WHERE id = ?').bind(id).run();

	if (!result.success) {
		throw new Error('Failed to delete room template');
	}

	return result.meta.changes > 0;
}
