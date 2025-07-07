import { RoomFurniture, RoomFurnitureSchema, mergeFurnitureWithTemplate } from '@stargate/common';

import { Env } from '../types';

import { getFurnitureTemplateByType } from './furniture-template-manager';

// Helper to parse image field from DB row
function parseImageField(row: any) {
	if (row && typeof row.image === 'string') {
		try {
			row.image = row.image ? JSON.parse(row.image) : undefined;
		} catch {
			row.image = undefined;
		}
	}
	return row;
}

// Get all room furniture
export async function getAllRoomFurniture(env: Env): Promise<RoomFurniture[]> {
	const result = await env.DB.prepare(`
		SELECT * FROM room_furniture
		ORDER BY room_id, furniture_type, name
	`).all();

	return result.results.map(row => RoomFurnitureSchema.parse(parseImageField(row)));
}

// Get furniture for a specific room
export async function getRoomFurniture(env: Env, roomId: string): Promise<RoomFurniture[]> {
	const result = await env.DB.prepare(`
		SELECT * FROM room_furniture
		WHERE room_id = ?
		ORDER BY furniture_type, name
	`).bind(roomId).all();

	return result.results.map(row => RoomFurnitureSchema.parse(parseImageField(row)));
}

// Get furniture by type
export async function getFurnitureByType(env: Env, furnitureType: string): Promise<RoomFurniture[]> {
	const result = await env.DB.prepare(`
		SELECT * FROM room_furniture
		WHERE furniture_type = ?
		ORDER BY room_id, name
	`).bind(furnitureType).all();

	return result.results.map(row => RoomFurnitureSchema.parse(parseImageField(row)));
}

// Get single furniture item by ID
export async function getRoomFurnitureById(env: Env, furnitureId: string): Promise<RoomFurniture | null> {
	const result = await env.DB.prepare(`
		SELECT * FROM room_furniture
		WHERE id = ?
	`).bind(furnitureId).first();

	if (!result) return null;
	return RoomFurnitureSchema.parse(parseImageField(result));
}

// Utility to normalize image field for DB storage (always JSON.stringify)
function normalizeImageField(image: any): string | null {
	console.log('normalizeImageField', image);
	if (!image) return null;
	try {
		return JSON.stringify(image);
	} catch {
		return null;
	}
}

// Create new room furniture with template defaults
export async function createRoomFurniture(env: Env, furniture: Omit<RoomFurniture, 'created_at' | 'updated_at'>): Promise<RoomFurniture> {
	return await createRoomFurnitureWithTemplate(env, furniture);
}

// Create new room furniture with template defaults applied
export async function createRoomFurnitureWithTemplate(
	env: Env, 
	furniture: Partial<Omit<RoomFurniture, 'id' | 'created_at' | 'updated_at'>> & { id: string; room_id: string; furniture_type: string },
): Promise<RoomFurniture> {
	// Get the furniture template for this type
	const template = await getFurnitureTemplateByType(env, furniture.furniture_type);
	
	let mergedFurniture: Omit<RoomFurniture, 'id' | 'created_at' | 'updated_at'>;
	
	if (template) {
		// Merge furniture data with template defaults
		mergedFurniture = mergeFurnitureWithTemplate(furniture, template);
	} else {
		// No template found, use furniture data as-is with basic defaults
		mergedFurniture = {
			room_id: furniture.room_id,
			furniture_type: furniture.furniture_type,
			name: furniture.name || furniture.furniture_type,
			description: furniture.description || null,
			x: furniture.x || 0,
			y: furniture.y || 0,
			z: furniture.z ?? 1,
			width: furniture.width ?? 32,
			height: furniture.height ?? 32,
			rotation: furniture.rotation ?? 0,
			image: furniture.image || null,
			color: furniture.color || null,
			style: furniture.style || null,
			interactive: furniture.interactive ?? false,
			blocks_movement: furniture.blocks_movement ?? true,
			requirements: furniture.requirements || null,
			power_required: furniture.power_required ?? 0,
			active: furniture.active ?? true,
			discovered: furniture.discovered ?? false,
		};
	}

	const now = Date.now();
	const furnitureWithTimestamps = {
		id: furniture.id,
		...mergedFurniture,
		created_at: now,
		updated_at: now,
	};

	const validated = RoomFurnitureSchema.parse(furnitureWithTimestamps);

	await env.DB.prepare(`
		INSERT INTO room_furniture (
			id, room_id, furniture_type, name, description,
			x, y, z, width, height, rotation,
			image, color, style,
			interactive, blocks_movement, requirements, power_required,
			active, discovered,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		validated.id,
		validated.room_id,
		validated.furniture_type,
		validated.name,
		validated.description || null,
		validated.x,
		validated.y,
		validated.z,
		validated.width,
		validated.height,
		validated.rotation,
		normalizeImageField(validated.image),
		validated.color || null,
		validated.style || null,
		validated.interactive ? 1 : 0,
		validated.blocks_movement ? 1 : 0,
		validated.requirements || null,
		validated.power_required,
		validated.active ? 1 : 0,
		validated.discovered ? 1 : 0,
		validated.created_at,
		validated.updated_at,
	).run();

	return validated;
}

// Update existing room furniture
export async function updateRoomFurniture(env: Env, furnitureId: string, updates: Partial<Omit<RoomFurniture, 'id' | 'created_at'>>): Promise<RoomFurniture> {
	const existing = await getRoomFurnitureById(env, furnitureId);
	if (!existing) {
		throw new Error(`Room furniture with ID ${furnitureId} not found`);
	}

	const updated = {
		...existing,
		...updates,
		updated_at: Date.now(),
	};

	const validated = RoomFurnitureSchema.parse({ ...updated, image: updates.image ?? existing.image });

	await env.DB.prepare(`
		UPDATE room_furniture SET
			room_id = ?, furniture_type = ?, name = ?, description = ?,
			x = ?, y = ?, z = ?, width = ?, height = ?, rotation = ?,
			image = ?, color = ?, style = ?,
			interactive = ?, blocks_movement = ?, requirements = ?, power_required = ?,
			active = ?, discovered = ?, updated_at = ?
		WHERE id = ?
	`).bind(
		validated.room_id,
		validated.furniture_type,
		validated.name,
		validated.description || null,
		validated.x,
		validated.y,
		validated.z,
		validated.width,
		validated.height,
		validated.rotation,
		normalizeImageField(validated.image),
		validated.color || null,
		validated.style || null,
		validated.interactive ? 1 : 0,
		validated.blocks_movement ? 1 : 0,
		validated.requirements || null,
		validated.power_required,
		validated.active ? 1 : 0,
		validated.discovered ? 1 : 0,
		validated.updated_at,
		validated.id,
	).run();

	return validated;
}

// Delete room furniture
export async function deleteRoomFurniture(env: Env, furnitureId: string): Promise<boolean> {
	const result = await env.DB.prepare(`
		DELETE FROM room_furniture WHERE id = ?
	`).bind(furnitureId).run();

	return result.meta.changes > 0;
}

// Delete all furniture in a room (used when deleting rooms)
export async function deleteRoomFurnitureByRoom(env: Env, roomId: string): Promise<number> {
	const result = await env.DB.prepare(`
		DELETE FROM room_furniture WHERE room_id = ?
	`).bind(roomId).run();

	return result.meta.changes;
}

// Utility function to create furniture instances from templates for room setup
export async function createFurnitureFromTemplate(
	env: Env,
	templateId: string,
	roomId: string,
	overrides: Partial<Pick<RoomFurniture, 'x' | 'y' | 'z' | 'name' | 'rotation'>> = {},
): Promise<RoomFurniture> {
	const { getFurnitureTemplateById } = await import('./furniture-template-manager');
	const template = await getFurnitureTemplateById(env, templateId);
	
	if (!template) {
		throw new Error(`Furniture template with ID ${templateId} not found`);
	}

	const furnitureId = `${roomId}-${template.furniture_type}-${Date.now()}`;
	
	const furnitureData = {
		id: furnitureId,
		room_id: roomId,
		furniture_type: template.furniture_type,
		name: overrides.name,
		x: overrides.x,
		y: overrides.y,
		z: overrides.z,
		rotation: overrides.rotation,
	};

	return await createRoomFurnitureWithTemplate(env, furnitureData);
}

// Utility function to populate a room with furniture based on room type and templates
export async function populateRoomWithDefaultFurniture(
	env: Env,
	roomId: string,
	roomType?: string,
): Promise<RoomFurniture[]> {
	const { getAllFurnitureTemplates } = await import('./furniture-template-manager');
	const templates = await getAllFurnitureTemplates(env);
	
	// Filter templates that are compatible with this room type
	const compatibleTemplates = templates.filter(template => {
		if (!template.compatible_room_types || !roomType) return false;
		
		try {
			const compatibleTypes = JSON.parse(template.compatible_room_types);
			return Array.isArray(compatibleTypes) && compatibleTypes.includes(roomType);
		} catch {
			return false;
		}
	});

	const furniture: RoomFurniture[] = [];
	
	// Create furniture instances from compatible templates
	for (const template of compatibleTemplates) {
		try {
			// Basic placement logic - center the furniture
			const furnitureInstance = await createFurnitureFromTemplate(env, template.id, roomId, {
				x: 0, // Room center
				y: 0, // Room center
			});
			
			furniture.push(furnitureInstance);
		} catch (error) {
			console.error(`Failed to create furniture from template ${template.id}:`, error);
		}
	}

	return furniture;
}
