import { z } from 'zod';

import { DEFAULT_IMAGE_KEYS } from './room-furniture';

export const FurnitureTemplateSchema = z.object({
	id: z.string(),
	name: z.string(), // Display name for the template (e.g., "Stargate Template", "Console Template")
	furniture_type: z.string(), // Type identifier (e.g., 'stargate', 'console', 'bed', 'table')
	description: z.string().optional().nullable(),
	category: z.string().optional().nullable(), // Category for organization ('tech', 'furniture', 'decoration', etc.)

	// Default physical properties
	default_width: z.number().default(32),
	default_height: z.number().default(32),
	default_rotation: z.number().default(0),

	// Default visual properties
	default_image: z.record(z.string())
		.transform((img) => {
			const out: Record<string, string> = { ...img };
			for (const key of DEFAULT_IMAGE_KEYS) {
				if (!(key in out)) out[key] = '';
			}
			return out;
		})
		.refine(obj => typeof obj.default === 'string' && obj.default.length > 0, {
			message: 'Default image mapping must include a "default" key with a non-empty URL',
		}).optional().nullable(),
	default_color: z.string().optional().nullable(), // Default hex color code
	default_style: z.string().optional().nullable(), // Default style variant

	// Default functional properties - SQLite stores booleans as numbers (0/1)
	default_interactive: z.union([z.boolean(), z.number()]).transform((val) => val === true || val === 1).default(false),
	default_blocks_movement: z.union([z.boolean(), z.number()]).transform((val) => val === true || val === 1).default(true),
	default_power_required: z.number().default(0),
	default_active: z.union([z.boolean(), z.number()]).transform((val) => val === true || val === 1).default(true),
	default_discovered: z.union([z.boolean(), z.number()]).transform((val) => val === true || val === 1).default(false),

	// Requirements and constraints
	placement_requirements: z.string().optional().nullable(), // JSON string of placement requirements
	usage_requirements: z.string().optional().nullable(), // JSON string of usage requirements
	min_room_size: z.number().optional().nullable(), // Minimum room size needed
	max_per_room: z.number().optional().nullable(), // Maximum number allowed per room
	compatible_room_types: z.string().optional().nullable(), // JSON array of compatible room types

	// Template metadata
	tags: z.string().optional().nullable(), // JSON array of tags for searching/filtering
	version: z.string().default('1.0'), // Template version for migration purposes
	is_active: z.union([z.boolean(), z.number()]).transform((val) => val === true || val === 1).default(true), // Whether this template is active/available

	created_at: z.number(),
	updated_at: z.number(),
});

export type FurnitureTemplate = z.infer<typeof FurnitureTemplateSchema>;

// Re-export DEFAULT_IMAGE_KEYS from room-furniture for consistency
export { DEFAULT_IMAGE_KEYS } from './room-furniture';

// Utility function to merge template defaults with furniture instance data
export function mergeFurnitureWithTemplate(
	furniture: Partial<Omit<import('./room-furniture').RoomFurniture, 'id' | 'created_at' | 'updated_at'>>,
	template: FurnitureTemplate,
): Omit<import('./room-furniture').RoomFurniture, 'id' | 'created_at' | 'updated_at'> {
	return {
		room_id: furniture.room_id!,
		furniture_type: template.furniture_type,
		name: furniture.name || template.name,
		description: furniture.description ?? template.description,
		x: furniture.x || 0,
		y: furniture.y || 0,
		z: furniture.z ?? 1,
		width: furniture.width ?? template.default_width,
		height: furniture.height ?? template.default_height,
		rotation: furniture.rotation ?? template.default_rotation,
		image: furniture.image ?? template.default_image,
		color: furniture.color ?? template.default_color,
		style: furniture.style ?? template.default_style,
		interactive: furniture.interactive ?? template.default_interactive,
		blocks_movement: furniture.blocks_movement ?? template.default_blocks_movement,
		requirements: furniture.requirements ?? template.usage_requirements,
		power_required: furniture.power_required ?? template.default_power_required,
		active: furniture.active ?? template.default_active,
		discovered: furniture.discovered ?? template.default_discovered,
	};
}

// Utility function to validate furniture placement against template requirements
export function validateFurniturePlacement(
	furniture: Partial<import('./room-furniture').RoomFurniture>,
	template: FurnitureTemplate,
	room: { width: number; height: number; type?: string },
	existingFurniture: import('./room-furniture').RoomFurniture[] = [],
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Check minimum room size
	if (template.min_room_size && (room.width < template.min_room_size || room.height < template.min_room_size)) {
		errors.push(`Room is too small. Minimum size: ${template.min_room_size}x${template.min_room_size}`);
	}

	// Check maximum per room
	if (template.max_per_room) {
		const existingCount = existingFurniture.filter(f => f.furniture_type === template.furniture_type).length;
		if (existingCount >= template.max_per_room) {
			errors.push(`Maximum ${template.max_per_room} ${template.furniture_type} items allowed per room`);
		}
	}

	// Check compatible room types
	if (template.compatible_room_types && room.type) {
		try {
			const compatibleTypes = JSON.parse(template.compatible_room_types);
			if (Array.isArray(compatibleTypes) && !compatibleTypes.includes(room.type)) {
				errors.push(`${template.name} is not compatible with ${room.type} rooms`);
			}
		} catch {
			// Invalid JSON, skip validation
		}
	}

	// Check placement requirements
	if (template.placement_requirements) {
		try {
			const requirements = JSON.parse(template.placement_requirements);
			// Add specific placement validation logic here based on requirements structure
			// For now, we'll just validate that it's valid JSON
		} catch {
			errors.push('Invalid placement requirements in template');
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}