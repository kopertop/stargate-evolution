import { z } from 'zod';

export const RoomTemplateSchema = z.object({
	id: z.string(),
	layout_id: z.string(),
	type: z.string(),
	name: z.string(),
	description: z.string().optional().nullable(),
	
	// Template default dimensions
	default_width: z.number(),
	default_height: z.number(),
	
	// Template properties
	default_image: z.string().optional().nullable(),
	category: z.string().optional().nullable(),
	min_width: z.number().optional().nullable(),
	max_width: z.number().optional().nullable(),
	min_height: z.number().optional().nullable(),
	max_height: z.number().optional().nullable(),
	placement_requirements: z.string().optional().nullable(),
	compatible_layouts: z.string().optional().nullable(),
	
	// Template metadata
	tags: z.string().optional().nullable(),
	version: z.string().default('1.0'),
	is_active: z.union([z.boolean(), z.number()]).transform((val) => val === true || val === 1).default(true),
	
	created_at: z.number(),
	updated_at: z.number(),
});

export type RoomTemplate = z.infer<typeof RoomTemplateSchema>;

// Utility function to merge template defaults with room instance data
export function mergeRoomWithTemplate(
	room: Partial<Omit<import('./room').Room, 'id' | 'created_at' | 'updated_at'>>,
	template: RoomTemplate,
): Omit<import('./room').Room, 'id' | 'created_at' | 'updated_at'> {
	return {
		template_id: template.id,
		layout_id: room.layout_id || template.layout_id,
		type: room.type || template.type,
		name: room.name || template.name,
		description: room.description ?? template.description,
		startX: room.startX || 0,
		endX: room.endX || template.default_width,
		startY: room.startY || 0,
		endY: room.endY || template.default_height,
		floor: room.floor || 0,
		width: room.width,
		height: room.height,
		found: room.found ?? false,
		locked: room.locked ?? false,
		explored: room.explored ?? false,
		exploration_data: room.exploration_data,
		image: room.image ?? template.default_image,
		base_exploration_time: room.base_exploration_time ?? 2,
		status: room.status ?? 'ok',
		connection_north: room.connection_north,
		connection_south: room.connection_south,
		connection_east: room.connection_east,
		connection_west: room.connection_west,
	};
}

// Utility function to validate room placement against template requirements
export function validateRoomPlacement(
	room: Partial<import('./room').Room>,
	template: RoomTemplate,
	existingRooms: import('./room').Room[] = [],
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Check minimum dimensions
	const roomWidth = (room.endX || 0) - (room.startX || 0);
	const roomHeight = (room.endY || 0) - (room.startY || 0);
	
	if (template.min_width && roomWidth < template.min_width) {
		errors.push(`Room width ${roomWidth} is below minimum ${template.min_width}`);
	}
	if (template.min_height && roomHeight < template.min_height) {
		errors.push(`Room height ${roomHeight} is below minimum ${template.min_height}`);
	}

	// Check maximum dimensions
	if (template.max_width && roomWidth > template.max_width) {
		errors.push(`Room width ${roomWidth} exceeds maximum ${template.max_width}`);
	}
	if (template.max_height && roomHeight > template.max_height) {
		errors.push(`Room height ${roomHeight} exceeds maximum ${template.max_height}`);
	}

	// Check compatible layouts
	if (template.compatible_layouts && room.layout_id) {
		try {
			const compatibleLayouts = JSON.parse(template.compatible_layouts);
			if (Array.isArray(compatibleLayouts) && !compatibleLayouts.includes(room.layout_id)) {
				errors.push(`${template.name} is not compatible with ${room.layout_id} layout`);
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
