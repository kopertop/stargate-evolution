import { RoomTemplate } from '@stargate/common';

// Grid system constants
export const GRID_UNIT = 64;           // Base grid unit (64px)
export const WALL_THICKNESS = 8;      // Wall thickness
export const DOOR_SIZE = 32;          // Door size (fits in wall)
export const SCREEN_CENTER_X = 400;   // Screen center X coordinate
export const SCREEN_CENTER_Y = 300;   // Screen center Y coordinate

/**
 * Calculate grid positions for all rooms based on connections and size.
 * Returns a map of roomId -> { gridX, gridY }
 */
export function calculateRoomPositions(
	rooms: RoomTemplate[],
	rootRoomId: string,
): Record<string, { gridX: number; gridY: number }> {
	const positions: Record<string, { gridX: number; gridY: number }> = {};
	const visited = new Set<string>();
	const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]));

	const queue: Array<{ id: string; gridX: number; gridY: number }> = [];
	const root = roomMap[rootRoomId];
	if (!root) return positions;

	queue.push({ id: rootRoomId, gridX: 0, gridY: 0 });

	while (queue.length > 0) {
		const { id, gridX, gridY } = queue.shift()!;
		if (visited.has(id)) continue;
		visited.add(id);
		positions[id] = { gridX, gridY };

		const room = roomMap[id];
		if (!room) continue;

		const directions: Array<{
			key: 'connection_north' | 'connection_south' | 'connection_east' | 'connection_west',
			dx: number,
			dy: number
		}> = [
			{ key: 'connection_north', dx: 0, dy: 1 },
			{ key: 'connection_south', dx: 0, dy: -1 },
			{ key: 'connection_east', dx: 1, dy: 0 },
			{ key: 'connection_west', dx: -1, dy: 0 },
		];

		for (const dir of directions) {
			const connId = room[dir.key] as string | null;
			if (!connId || visited.has(connId)) continue;
			const connRoom = roomMap[connId];
			if (!connRoom) continue;

			let nextX = gridX;
			let nextY = gridY;
			if (dir.key === 'connection_north') {
				nextY += Math.ceil(room.height / 2) + Math.ceil(connRoom.height / 2);
			}
			if (dir.key === 'connection_south') {
				nextY -= Math.ceil(room.height / 2) + Math.ceil(connRoom.height / 2);
			}
			if (dir.key === 'connection_east') {
				nextX += Math.ceil(room.width / 2) + Math.ceil(connRoom.width / 2);
			}
			if (dir.key === 'connection_west') {
				nextX -= Math.ceil(room.width / 2) + Math.ceil(connRoom.width / 2);
			}
			queue.push({ id: connId, gridX: nextX, gridY: nextY });
		}
	}

	return positions;
}

/**
 * RECTANGLE-BASED POSITIONING SYSTEM
 * Rooms are defined by start_x, start_y, end_x, end_y rectangles
 * Convert these to screen coordinates for rendering
 */

/**
 * Get room position using calculated grid positions
 * @param room RoomTemplate
 * @param positions Map of roomId -> { gridX, gridY }
 */
export function getRoomScreenPosition(room: RoomTemplate, positions: Record<string, { gridX: number; gridY: number }>): { x: number; y: number } {
	const pos = positions[room.id] || { gridX: 0, gridY: 0 };
	return gridToScreenPosition(pos.gridX, pos.gridY);
}

/**
 * Convert grid coordinates to screen position (fallback for unknown rooms)
 */
export function gridToScreenPosition(gridX: number, gridY: number): { x: number; y: number } {
	return {
		x: SCREEN_CENTER_X + (gridX * GRID_UNIT),
		y: SCREEN_CENTER_Y - (gridY * GRID_UNIT), // Invert Y for screen coordinates
	};
}

/**
 * Get the center position of a room in grid coordinates
 * @param room RoomTemplate
 * @param positions Map of roomId -> { gridX, gridY }
 */
export function getRoomGridCenter(room: RoomTemplate, positions: Record<string, { gridX: number; gridY: number }>): { gridX: number; gridY: number } {
	return positions[room.id] || { gridX: 0, gridY: 0 };
}

/**
 * Get room boundaries in grid coordinates
 * @param room RoomTemplate
 * @param positions Map of roomId -> { gridX, gridY }
 */
export function getRoomGridBounds(room: RoomTemplate, positions: Record<string, { gridX: number; gridY: number }>): {
	left: number;
	right: number;
	top: number;
	bottom: number;
} {
	const center = positions[room.id] || { gridX: 0, gridY: 0 };
	const halfWidth = room.width / 2;
	const halfHeight = room.height / 2;
	return {
		left: center.gridX - halfWidth,
		right: center.gridX + halfWidth,
		top: center.gridY + halfHeight,
		bottom: center.gridY - halfHeight,
	};
}

/**
 * Get room boundaries in screen coordinates (pixels)
 * @param room RoomTemplate
 * @param positions Map of roomId -> { gridX, gridY }
 */
export function getRoomScreenBounds(room: RoomTemplate, positions: Record<string, { gridX: number; gridY: number }>): {
	left: number;
	right: number;
	top: number;
	bottom: number;
	width: number;
	height: number;
} {
	const gridBounds = getRoomGridBounds(room, positions);
	const topLeft = gridToScreenPosition(gridBounds.left, gridBounds.top);
	const bottomRight = gridToScreenPosition(gridBounds.right, gridBounds.bottom);

	return {
		left: topLeft.x,
		right: bottomRight.x,
		top: topLeft.y,
		bottom: bottomRight.y,
		width: bottomRight.x - topLeft.x,
		height: bottomRight.y - topLeft.y,
	};
}

/**
 * Check if two rooms are adjacent (share a border)
 */
export function areRoomsAdjacent(room1: RoomTemplate, room2: RoomTemplate): boolean {
	// Must be on the same floor
	if (room1.floor !== room2.floor) return false;

	const bounds1 = getRoomGridBounds(room1, {});
	const bounds2 = getRoomGridBounds(room2, {});

	// Check for horizontal adjacency (sharing vertical border)
	const horizontallyAdjacent = (
		(bounds1.right === bounds2.left || bounds1.left === bounds2.right) &&
		(bounds1.top > bounds2.bottom && bounds1.bottom < bounds2.top) // Check for Y overlap
	);

	// Check for vertical adjacency (sharing horizontal border)
	const verticallyAdjacent = (
		(bounds1.top === bounds2.bottom || bounds1.bottom === bounds2.top) &&
		(bounds1.right > bounds2.left && bounds1.left < bounds2.right) // Check for X overlap
	);

	return horizontallyAdjacent || verticallyAdjacent;
}

/**
 * Get the side where two rooms connect (handles both adjacent and non-adjacent rooms)
 */
export function getConnectionSide(
	fromRoom: RoomTemplate,
	toRoom: RoomTemplate,
): 'top' | 'bottom' | 'left' | 'right' | null {
	// Check the forward direction
	if (fromRoom.connection_north === toRoom.id) return 'top';
	if (fromRoom.connection_south === toRoom.id) return 'bottom';
	if (fromRoom.connection_east === toRoom.id) return 'right';
	if (fromRoom.connection_west === toRoom.id) return 'left';

	// Check the reverse direction
	if (toRoom.connection_north === fromRoom.id) return 'bottom';
	if (toRoom.connection_south === fromRoom.id) return 'top';
	if (toRoom.connection_east === fromRoom.id) return 'left';
	if (toRoom.connection_west === fromRoom.id) return 'right';

	return null;
}

/**
 * Find all rooms that are adjacent to the given room
 */
export function findAdjacentRooms(room: RoomTemplate, allRooms: RoomTemplate[]): RoomTemplate[] {
	return allRooms.filter(otherRoom =>
		otherRoom.id !== room.id && areRoomsAdjacent(room, otherRoom),
	);
}

/**
 * Calculate door position between two rooms
 */
export function getDoorPosition(fromRoom: RoomTemplate, toRoom: RoomTemplate): {
	side: 'top' | 'bottom' | 'left' | 'right';
	gridX: number;
	gridY: number;
	screenX: number;
	screenY: number;
} | null {
	const side = getConnectionSide(fromRoom, toRoom);
	if (!side) return null;

	const fromBounds = getRoomGridBounds(fromRoom, {});
	const toBounds = getRoomGridBounds(toRoom, {});

	let gridX: number;
	let gridY: number;

	switch (side) {
	case 'right':
		gridX = fromBounds.right;
		gridY = Math.max(fromBounds.bottom, toBounds.bottom) +
				Math.min(fromBounds.top - fromBounds.bottom, toBounds.top - toBounds.bottom) / 2;
		break;
	case 'left':
		gridX = fromBounds.left;
		gridY = Math.max(fromBounds.bottom, toBounds.bottom) +
				Math.min(fromBounds.top - fromBounds.bottom, toBounds.top - toBounds.bottom) / 2;
		break;
	case 'top':
		gridX = Math.max(fromBounds.left, toBounds.left) +
				Math.min(fromBounds.right - fromBounds.left, toBounds.right - toBounds.left) / 2;
		gridY = fromBounds.top;
		break;
	case 'bottom':
		gridX = Math.max(fromBounds.left, toBounds.left) +
				Math.min(fromBounds.right - fromBounds.left, toBounds.right - toBounds.left) / 2;
		gridY = fromBounds.bottom;
		break;
	}

	const screenPos = gridToScreenPosition(gridX, gridY);

	return {
		side,
		gridX,
		gridY,
		screenX: screenPos.x,
		screenY: screenPos.y,
	};
}
