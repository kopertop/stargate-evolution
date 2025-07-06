import { FurnitureTemplate, FurnitureTemplateSchema } from '@stargate/common';

import { Env } from '../types';


// Helper to parse all JSON fields in a furniture template row
function parseFurnitureTemplateRow(row: any) {
	if (!row) return row;
	
	// Keep JSON fields as strings - don't parse them to objects
	// The schema expects these to be strings (nullable)
	
	// Handle default_image separately as it should be parsed to object
	if (row && row.default_image !== undefined && row.default_image !== null) {
		if (typeof row.default_image === 'string') {
			try {
				row.default_image = row.default_image ? JSON.parse(row.default_image) : null;
			} catch {
				row.default_image = null;
			}
		}
	}
	
	return row;
}

// Get all furniture templates
export async function getAllFurnitureTemplates(env: Env): Promise<FurnitureTemplate[]> {
	const result = await env.DB.prepare(`
		SELECT * FROM furniture_templates
		WHERE is_active = 1
		ORDER BY category, furniture_type, name
	`).all();

	return result.results.map(row => 
		FurnitureTemplateSchema.parse(parseFurnitureTemplateRow(row)),
	);
}

// Get furniture templates by category
export async function getFurnitureTemplatesByCategory(env: Env, category: string): Promise<FurnitureTemplate[]> {
	const result = await env.DB.prepare(`
		SELECT * FROM furniture_templates
		WHERE category = ? AND is_active = 1
		ORDER BY furniture_type, name
	`).bind(category).all();

	return result.results.map(row => 
		FurnitureTemplateSchema.parse(parseFurnitureTemplateRow(row)),
	);
}

// Get furniture templates by type
export async function getFurnitureTemplatesByType(env: Env, furnitureType: string): Promise<FurnitureTemplate[]> {
	const result = await env.DB.prepare(`
		SELECT * FROM furniture_templates
		WHERE furniture_type = ? AND is_active = 1
		ORDER BY name
	`).bind(furnitureType).all();

	return result.results.map(row => 
		FurnitureTemplateSchema.parse(parseFurnitureTemplateRow(row)),
	);
}

// Get single furniture template by ID
export async function getFurnitureTemplateById(env: Env, templateId: string): Promise<FurnitureTemplate | null> {
	const result = await env.DB.prepare(`
		SELECT * FROM furniture_templates
		WHERE id = ?
	`).bind(templateId).first();

	if (!result) return null;
	return FurnitureTemplateSchema.parse(parseFurnitureTemplateRow(result));
}

// Get furniture template by furniture type (first active match)
export async function getFurnitureTemplateByType(env: Env, furnitureType: string): Promise<FurnitureTemplate | null> {
	const result = await env.DB.prepare(`
		SELECT * FROM furniture_templates
		WHERE furniture_type = ? AND is_active = 1
		ORDER BY created_at ASC
		LIMIT 1
	`).bind(furnitureType).first();

	if (!result) return null;
	return FurnitureTemplateSchema.parse(parseFurnitureTemplateRow(result));
}

// Utility to normalize JSON field for DB storage
function normalizeJsonField(value: any): string | null {
	if (!value) return null;
	try {
		return JSON.stringify(value);
	} catch {
		return null;
	}
}

// Create new furniture template
export async function createFurnitureTemplate(
	env: Env, 
	template: Omit<FurnitureTemplate, 'created_at' | 'updated_at'>,
): Promise<FurnitureTemplate> {
	const now = Date.now();
	const templateWithTimestamps = {
		...template,
		created_at: now,
		updated_at: now,
	};

	const validated = FurnitureTemplateSchema.parse(templateWithTimestamps);

	await env.DB.prepare(`
		INSERT INTO furniture_templates (
			id, name, furniture_type, description, category,
			default_width, default_height, default_rotation,
			default_image, default_color, default_style,
			default_interactive, default_blocks_movement, default_power_required,
			default_active, default_discovered,
			placement_requirements, usage_requirements, min_room_size, max_per_room, compatible_room_types,
			tags, version, is_active, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		validated.id,
		validated.name,
		validated.furniture_type,
		validated.description || null,
		validated.category || null,
		validated.default_width,
		validated.default_height,
		validated.default_rotation,
		normalizeJsonField(validated.default_image),
		validated.default_color || null,
		validated.default_style || null,
		validated.default_interactive ? 1 : 0,
		validated.default_blocks_movement ? 1 : 0,
		validated.default_power_required,
		validated.default_active ? 1 : 0,
		validated.default_discovered ? 1 : 0,
		normalizeJsonField(validated.placement_requirements),
		normalizeJsonField(validated.usage_requirements),
		validated.min_room_size || null,
		validated.max_per_room || null,
		normalizeJsonField(validated.compatible_room_types),
		normalizeJsonField(validated.tags),
		validated.version,
		validated.is_active ? 1 : 0,
		validated.created_at,
		validated.updated_at,
	).run();

	return validated;
}

// Update existing furniture template
export async function updateFurnitureTemplate(
	env: Env, 
	templateId: string, 
	updates: Partial<Omit<FurnitureTemplate, 'id' | 'created_at'>>,
): Promise<FurnitureTemplate> {
	const existing = await getFurnitureTemplateById(env, templateId);
	if (!existing) {
		throw new Error(`Furniture template with ID ${templateId} not found`);
	}

	const updated = {
		...existing,
		...updates,
		updated_at: Date.now(),
	};

	const validated = FurnitureTemplateSchema.parse(updated);

	await env.DB.prepare(`
		UPDATE furniture_templates SET
			name = ?, furniture_type = ?, description = ?, category = ?,
			default_width = ?, default_height = ?, default_rotation = ?,
			default_image = ?, default_color = ?, default_style = ?,
			default_interactive = ?, default_blocks_movement = ?, default_power_required = ?,
			default_active = ?, default_discovered = ?,
			placement_requirements = ?, usage_requirements = ?, min_room_size = ?, max_per_room = ?, compatible_room_types = ?,
			tags = ?, version = ?, is_active = ?, updated_at = ?
		WHERE id = ?
	`).bind(
		validated.name,
		validated.furniture_type,
		validated.description || null,
		validated.category || null,
		validated.default_width,
		validated.default_height,
		validated.default_rotation,
		normalizeJsonField(validated.default_image),
		validated.default_color || null,
		validated.default_style || null,
		validated.default_interactive ? 1 : 0,
		validated.default_blocks_movement ? 1 : 0,
		validated.default_power_required,
		validated.default_active ? 1 : 0,
		validated.default_discovered ? 1 : 0,
		normalizeJsonField(validated.placement_requirements),
		normalizeJsonField(validated.usage_requirements),
		validated.min_room_size || null,
		validated.max_per_room || null,
		normalizeJsonField(validated.compatible_room_types),
		normalizeJsonField(validated.tags),
		validated.version,
		validated.is_active ? 1 : 0,
		validated.updated_at,
		validated.id,
	).run();

	return validated;
}

// Delete furniture template (soft delete by setting is_active = 0)
export async function deleteFurnitureTemplate(env: Env, templateId: string): Promise<boolean> {
	const result = await env.DB.prepare(`
		UPDATE furniture_templates SET is_active = 0, updated_at = ? WHERE id = ?
	`).bind(Date.now(), templateId).run();

	return result.meta.changes > 0;
}

// Hard delete furniture template (permanent removal)
export async function hardDeleteFurnitureTemplate(env: Env, templateId: string): Promise<boolean> {
	const result = await env.DB.prepare(`
		DELETE FROM furniture_templates WHERE id = ?
	`).bind(templateId).run();

	return result.meta.changes > 0;
}

// Search furniture templates by tags or name
export async function searchFurnitureTemplates(env: Env, query: string): Promise<FurnitureTemplate[]> {
	const searchTerm = `%${query.toLowerCase()}%`;
	
	const result = await env.DB.prepare(`
		SELECT * FROM furniture_templates
		WHERE is_active = 1 AND (
			LOWER(name) LIKE ? OR
			LOWER(description) LIKE ? OR
			LOWER(furniture_type) LIKE ? OR
			LOWER(category) LIKE ? OR
			LOWER(tags) LIKE ?
		)
		ORDER BY 
			CASE WHEN LOWER(name) LIKE ? THEN 1
				 WHEN LOWER(furniture_type) LIKE ? THEN 2
				 WHEN LOWER(category) LIKE ? THEN 3
				 ELSE 4 END,
			name
	`).bind(
		searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
		searchTerm, searchTerm, searchTerm,
	).all();

	return result.results.map(row => 
		FurnitureTemplateSchema.parse(parseFurnitureTemplateRow(row)),
	);
}