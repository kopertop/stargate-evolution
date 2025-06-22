import { z } from 'zod';

export const DoorRequirementSchema = z.object({
	type: z.string(),
	value: z.number().default(1),
	description: z.string().optional(),
	met: z.boolean().optional(),
});

// New comprehensive door template schema for room building
export const DoorTemplateSchema = z.object({
	id: z.string(),
	name: z.string().optional(),
	from_room_id: z.string(),
	to_room_id: z.string(),

	// Precise positioning for Swift SpriteKit
	x: z.number(), // X coordinate of door center
	y: z.number(), // Y coordinate of door center
	width: z.number().default(32), // Door width in points
	height: z.number().default(8), // Door height in points
	rotation: z.number().default(0), // Rotation in degrees (0, 90, 180, 270)

	// Door properties
	state: z.enum(['opened', 'closed', 'locked']).default('closed'),
	is_automatic: z.boolean().default(false), // Automatic doors open when approached
	open_direction: z.enum(['inward', 'outward', 'sliding']).default('inward'),

	// Visual properties
	style: z.string().default('standard'), // 'standard', 'blast_door', 'airlock', etc.
	color: z.string().optional(), // Hex color code for tinting

	// Functional properties
	requirements: z.array(DoorRequirementSchema).optional(),
	power_required: z.number().default(0), // Power needed to operate
	sound_effect: z.string().optional(), // Sound to play when opened/closed

	created_at: z.number(),
	updated_at: z.number(),
});

// Legacy door info schema for backward compatibility
export const DoorInfoSchema = z.object({
	id: z.string(),
	toRoomId: z.string(),
	state: z.enum(['opened', 'closed', 'locked']),
	requirements: z.array(DoorRequirementSchema).optional(),
});

export type DoorTemplate = z.infer<typeof DoorTemplateSchema>;
export type DoorInfo = z.infer<typeof DoorInfoSchema>;
export type DoorRequirement = z.infer<typeof DoorRequirementSchema>;
