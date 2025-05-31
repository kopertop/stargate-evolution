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
	const occupied: Set<string> = new Set(); // Track occupied grid cells as 'x,y'
	const visited = new Set<string>();
	const roomMap = Object.fromEntries(rooms.map(r => [r.id, r]));

	function markOccupied(room: RoomTemplate, gridX: number, gridY: number) {
		const halfW = Math.floor(room.width / 2);
		const halfH = Math.floor(room.height / 2);
		for (let dx = -halfW; dx < room.width - halfW; dx++) {
			for (let dy = -halfH; dy < room.height - halfH; dy++) {
				occupied.add(`${gridX + dx},${gridY + dy}`);
			}
		}
	}

	function isOccupied(room: RoomTemplate, gridX: number, gridY: number) {
		const halfW = Math.floor(room.width / 2);
		const halfH = Math.floor(room.height / 2);
		for (let dx = -halfW; dx < room.width - halfW; dx++) {
			for (let dy = -halfH; dy < room.height - halfH; dy++) {
				if (occupied.has(`${gridX + dx},${gridY + dy}`)) return true;
			}
		}
		return false;
	}

	const queue: Array<string> = [];
	positions[rootRoomId] = { gridX: 0, gridY: 0 };
	markOccupied(roomMap[rootRoomId], 0, 0);
	visited.add(rootRoomId);
	queue.push(rootRoomId);

	const directions: Array<{ key: keyof RoomTemplate; dir: string }> = [
		{ key: 'connection_north', dir: 'north' },
		{ key: 'connection_south', dir: 'south' },
		{ key: 'connection_east', dir: 'east' },
		{ key: 'connection_west', dir: 'west' },
	];

	while (queue.length > 0) {
		const id = queue.shift()!;
		const room = roomMap[id];
		const pos = positions[id];
		if (!room || !pos) continue;

		for (const dirObj of directions) {
			// Gather all children for this edge
			const children: Array<{ connId: string; connRoom: RoomTemplate }> = [];
			for (const other of rooms) {
				if (visited.has(other.id)) continue;
				if (room[dirObj.key] === other.id) {
					children.push({ connId: other.id, connRoom: other });
				}
			}
			if (children.length === 0) continue;

			// Assign each child a unique slot
			let parentSlots = 1;
			if (dirObj.dir === 'north' || dirObj.dir === 'south') {
				parentSlots = room.width;
			}
			if (dirObj.dir === 'east' || dirObj.dir === 'west') {
				parentSlots = room.height;
			}
			for (let i = 0; i < children.length; i++) {
				const { connId, connRoom } = children[i];
				let placed = false;
				for (let slot = 0; slot < parentSlots; slot++) {
					let nextX = pos.gridX;
					let nextY = pos.gridY;
					if (dirObj.dir === 'north') {
						nextY += Math.ceil(room.height / 2) + Math.ceil(connRoom.height / 2);
						nextX += -Math.floor((room.width - 1) / 2) + slot;
					}
					if (dirObj.dir === 'south') {
						nextY -= Math.ceil(room.height / 2) + Math.ceil(connRoom.height / 2);
						nextX += -Math.floor((room.width - 1) / 2) + slot;
					}
					if (dirObj.dir === 'east') {
						nextX += Math.ceil(room.width / 2) + Math.ceil(connRoom.width / 2);
						nextY += -Math.floor((room.height - 1) / 2) + slot;
					}
					if (dirObj.dir === 'west') {
						nextX -= Math.ceil(room.width / 2) + Math.ceil(connRoom.width / 2);
						nextY += -Math.floor((room.height - 1) / 2) + slot;
					}
					if (!isOccupied(connRoom, nextX, nextY)) {
						positions[connId] = { gridX: nextX, gridY: nextY };
						markOccupied(connRoom, nextX, nextY);
						visited.add(connId);
						queue.push(connId);
						placed = true;
						break;
					}
				}
				// If not placed, try sliding further out in the intended direction
				if (!placed) {
					let tryX = pos.gridX;
					let tryY = pos.gridY;
					let attempts = 0;
					if (dirObj.dir === 'north') tryY += Math.ceil(room.height / 2) + Math.ceil(connRoom.height / 2);
					if (dirObj.dir === 'south') tryY -= Math.ceil(room.height / 2) + Math.ceil(connRoom.height / 2);
					if (dirObj.dir === 'east') tryX += Math.ceil(room.width / 2) + Math.ceil(connRoom.width / 2);
					if (dirObj.dir === 'west') tryX -= Math.ceil(room.width / 2) + Math.ceil(connRoom.width / 2);
					while (isOccupied(connRoom, tryX, tryY) && attempts < 10) {
						if (dirObj.dir === 'north') tryY++;
						if (dirObj.dir === 'south') tryY--;
						if (dirObj.dir === 'east') tryX++;
						if (dirObj.dir === 'west') tryX--;
						attempts++;
					}
					positions[connId] = { gridX: tryX, gridY: tryY };
					markOccupied(connRoom, tryX, tryY);
					visited.add(connId);
					queue.push(connId);
				}
			}
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
