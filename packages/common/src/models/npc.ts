import { z } from 'zod';

import { CharacterSchema } from './character';

export const NPCMovementSchema = z.object({
	x: z.number(), // Current X position
	y: z.number(), // Current Y position
	target_x: z.number().optional().nullable(), // Target X position for movement
	target_y: z.number().optional().nullable(), // Target Y position for movement
	speed: z.number().default(2), // Movement speed (units per frame)
	last_updated: z.number(), // Timestamp of last position update
});

export const NPCBehaviorSchema = z.object({
	type: z.enum(['patrol', 'guard', 'wander', 'follow', 'idle']).default('idle'),
	patrol_points: z.array(z.object({
		room_id: z.string(),
		x: z.number(),
		y: z.number(),
		wait_time: z.number().default(0), // Time to wait at this point in ms
	})).optional().nullable(),
	patrol_index: z.number().default(0), // Current patrol point index
	follow_target_id: z.string().optional().nullable(), // Character ID to follow
	wander_radius: z.number().default(50), // Radius for wandering behavior
	home_room_id: z.string().optional().nullable(), // Room to return to
	aggression_level: z.number().min(0).max(10).default(0), // 0 = peaceful, 10 = hostile
});

export const NPCSchema = CharacterSchema.extend({
	// NPC-specific properties
	is_npc: z.literal(true).default(true),
	active: z.union([z.boolean(), z.number()]).transform((val) => val === true || val === 1).default(true),
	
	// Movement and positioning
	movement: NPCMovementSchema,
	
	// Behavior and AI
	behavior: NPCBehaviorSchema,
	
	// Visual appearance
	color: z.string().default('#00ff00'), // Hex color for NPC rendering
	size: z.number().default(5), // Radius for collision detection
	
	// Interaction capabilities
	can_interact: z.union([z.boolean(), z.number()]).transform((val) => val === true || val === 1).default(true),
	interaction_range: z.number().default(25), // Range for interactions
	
	// Door access permissions
	can_open_doors: z.union([z.boolean(), z.number()]).transform((val) => val === true || val === 1).default(true),
	respect_restrictions: z.union([z.boolean(), z.number()]).transform((val) => val === true || val === 1).default(true),
});

export type NPC = z.infer<typeof NPCSchema>;
export type NPCMovement = z.infer<typeof NPCMovementSchema>;
export type NPCBehavior = z.infer<typeof NPCBehaviorSchema>;