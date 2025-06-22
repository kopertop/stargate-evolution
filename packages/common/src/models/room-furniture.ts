import { z } from 'zod';

export const RoomFurnitureSchema = z.object({
	id: z.string(),
	room_id: z.string(),
	furniture_type: z.string(), // 'stargate', 'console', 'bed', 'table', etc.
	name: z.string(),
	description: z.string().optional(),

	// Room-relative positioning (0,0 at room center)
	x: z.number(), // X offset from room center
	y: z.number(), // Y offset from room center
	width: z.number().default(32), // Furniture width in points
	height: z.number().default(32), // Furniture height in points
	rotation: z.number().default(0), // Rotation in degrees (0, 90, 180, 270)

	// Visual properties
	image: z.string().optional(), // Image asset for rendering
	color: z.string().optional(), // Hex color code for tinting
	style: z.string().optional(), // Style variant ('ancient', 'modern', etc.)

	// Functional properties
	interactive: z.boolean().default(false), // Can player interact with this?
	requirements: z.string().optional(), // JSON string of requirements to use
	power_required: z.number().default(0), // Power needed to operate

	// State
	active: z.boolean().default(true), // Is this furniture active/functional?
	discovered: z.boolean().default(true), // Has player discovered this?

	created_at: z.number(),
	updated_at: z.number(),
});

export type RoomFurniture = z.infer<typeof RoomFurnitureSchema>;

// Utility function to convert room-relative coordinates to world coordinates
export function roomToWorldCoordinates(
	furniture: Pick<RoomFurniture, 'x' | 'y'>,
	room: { startX: number; endX: number; startY: number; endY: number },
): { worldX: number; worldY: number } {
	// Calculate room center in world coordinates
	const roomCenterX = (room.startX + room.endX) / 2;
	const roomCenterY = (room.startY + room.endY) / 2;

	// Add furniture offset to room center
	return {
		worldX: roomCenterX + furniture.x,
		worldY: roomCenterY + furniture.y,
	};
}

// Utility function to convert world coordinates to room-relative coordinates
export function worldToRoomCoordinates(
	worldX: number,
	worldY: number,
	room: { startX: number; endX: number; startY: number; endY: number },
): { x: number; y: number } {
	// Calculate room center in world coordinates
	const roomCenterX = (room.startX + room.endX) / 2;
	const roomCenterY = (room.startY + room.endY) / 2;

	// Subtract room center from world coordinates
	return {
		x: worldX - roomCenterX,
		y: worldY - roomCenterY,
	};
}
