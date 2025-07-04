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

	// Safety check: if rootRoom doesn't exist in rooms array, return empty positions
	const rootRoom = roomMap[rootRoomId];
	if (!rootRoom) {
		console.warn(`Root room ${rootRoomId} not found in rooms array`);
		return {};
	}

	function markOccupied(room: RoomTemplate, gridX: number, gridY: number) {
		const roomWidth = room.width ?? 1;
		const roomHeight = room.height ?? 1;
		const halfW = Math.floor(roomWidth / 2);
		const halfH = Math.floor(roomHeight / 2);
		for (let dx = -halfW; dx < roomWidth - halfW; dx++) {
			for (let dy = -halfH; dy < roomHeight - halfH; dy++) {
				occupied.add(`${gridX + dx},${gridY + dy}`);
			}
		}
	}

	function isOccupied(room: RoomTemplate, gridX: number, gridY: number) {
		const roomWidth = room.width ?? 1;
		const roomHeight = room.height ?? 1;
		const halfW = Math.floor(roomWidth / 2);
		const halfH = Math.floor(roomHeight / 2);
		for (let dx = -halfW; dx < roomWidth - halfW; dx++) {
			for (let dy = -halfH; dy < roomHeight - halfH; dy++) {
				if (occupied.has(`${gridX + dx},${gridY + dy}`)) return true;
			}
		}
		return false;
	}

	/**
	 * Calculate proper position for a connected room considering edge alignment
	 */
	function calculateConnectedPosition(
		parentRoom: RoomTemplate,
		parentPos: { gridX: number; gridY: number },
		childRoom: RoomTemplate,
		direction: string,
	): { gridX: number; gridY: number } {
		let baseX = parentPos.gridX;
		let baseY = parentPos.gridY;

		// Calculate the distance from parent center to its edge, plus distance from child edge to its center
		// Use proper half calculations without Math.floor to handle 1x1 rooms correctly
		const parentHalfWidth = (parentRoom.width ?? 1) / 2;
		const parentHalfHeight = (parentRoom.height ?? 1) / 2;
		const childHalfWidth = (childRoom.width ?? 1) / 2;
		const childHalfHeight = (childRoom.height ?? 1) / 2;

		switch (direction) {
		case 'north':
			// Place child so its bottom edge touches parent's top edge
			baseY = parentPos.gridY + parentHalfHeight + childHalfHeight;
			break;
		case 'south':
			// Place child so its top edge touches parent's bottom edge
			baseY = parentPos.gridY - parentHalfHeight - childHalfHeight;
			break;
		case 'east':
			// Place child so its left edge touches parent's right edge
			baseX = parentPos.gridX + parentHalfWidth + childHalfWidth;
			break;
		case 'west':
			// Place child so its right edge touches parent's left edge
			baseX = parentPos.gridX - parentHalfWidth - childHalfWidth;
			break;
		}

		return { gridX: baseX, gridY: baseY };
	}

	/**
	 * Find the best position for a child room, trying multiple alignment points
	 */
	function findBestPosition(
		parentRoom: RoomTemplate,
		parentPos: { gridX: number; gridY: number },
		childRoom: RoomTemplate,
		direction: string,
	): { gridX: number; gridY: number } | null {
		// Start with center-to-center alignment
		const basePos = calculateConnectedPosition(parentRoom, parentPos, childRoom, direction);

		if (!isOccupied(childRoom, basePos.gridX, basePos.gridY)) {
			return basePos;
		}

		// Try alternative alignments for different sized rooms
		const parentHalfWidth = (parentRoom.width ?? 1) / 2;
		const parentHalfHeight = (parentRoom.height ?? 1) / 2;
		const childHalfWidth = (childRoom.width ?? 1) / 2;
		const childHalfHeight = (childRoom.height ?? 1) / 2;

		// For horizontal connections (east/west), try aligning along the vertical axis
		if (direction === 'east' || direction === 'west') {
			const maxParentY = parentHalfHeight;
			const maxChildY = childHalfHeight;
			const maxOffset = Math.min(maxParentY, maxChildY);

			for (let offset = -maxOffset; offset <= maxOffset; offset++) {
				const testPos = {
					gridX: basePos.gridX,
					gridY: basePos.gridY + offset,
				};
				if (!isOccupied(childRoom, testPos.gridX, testPos.gridY)) {
					return testPos;
				}
			}
		}

		// For vertical connections (north/south), try aligning along the horizontal axis
		if (direction === 'north' || direction === 'south') {
			const maxParentX = parentHalfWidth;
			const maxChildX = childHalfWidth;
			const maxOffset = Math.min(maxParentX, maxChildX);

			for (let offset = -maxOffset; offset <= maxOffset; offset++) {
				const testPos = {
					gridX: basePos.gridX + offset,
					gridY: basePos.gridY,
				};
				if (!isOccupied(childRoom, testPos.gridX, testPos.gridY)) {
					return testPos;
				}
			}
		}

		// If still no position found, try pushing further out
		for (let pushOut = 1; pushOut <= 5; pushOut++) {
			const testPos = { ...basePos };

			switch (direction) {
			case 'north':
				testPos.gridY += pushOut;
				break;
			case 'south':
				testPos.gridY -= pushOut;
				break;
			case 'east':
				testPos.gridX += pushOut;
				break;
			case 'west':
				testPos.gridX -= pushOut;
				break;
			}

			if (!isOccupied(childRoom, testPos.gridX, testPos.gridY)) {
				return testPos;
			}
		}

		return null; // Could not find a position
	}

	const queue: Array<string> = [];
	positions[rootRoomId] = { gridX: 0, gridY: 0 };
	markOccupied(rootRoom, 0, 0);
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
			// Gather all children for this edge (both forward and reverse connections)
			const children: Array<{ connId: string; connRoom: RoomTemplate }> = [];

			// Forward connections (room -> other)
			for (const other of rooms) {
				if (visited.has(other.id)) continue;
				if (room[dirObj.key] === other.id) {
					children.push({ connId: other.id, connRoom: other });
				}
			}

			// Reverse connections (other -> room) - position them in the opposite direction
			const reverseDirection = {
				'north': 'south',
				'south': 'north',
				'east': 'west',
				'west': 'east',
			}[dirObj.dir];

			if (reverseDirection) {
				const reverseKey = `connection_${reverseDirection}` as keyof RoomTemplate;
				for (const other of rooms) {
					if (visited.has(other.id)) continue;
					if (other[reverseKey] === room.id) {
						// Only add if not already found in forward connections
						if (!children.find(c => c.connId === other.id)) {
							children.push({ connId: other.id, connRoom: other });
						}
					}
				}
			}

			if (children.length === 0) continue;

			// Process each child room
			for (const { connId, connRoom } of children) {
				const bestPos = findBestPosition(room, pos, connRoom, dirObj.dir);

				if (bestPos) {
					positions[connId] = bestPos;
					markOccupied(connRoom, bestPos.gridX, bestPos.gridY);
					visited.add(connId);
					queue.push(connId);
				} else {
					console.warn(`Could not find position for room ${connId} connected to ${room.id} in direction ${dirObj.dir}`);
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
	// If we have grid positions for this room, use them
	const gridPos = positions[room.id];
	if (gridPos) {
		const halfWidth = (room.width ?? 1) / 2;
		const halfHeight = (room.height ?? 1) / 2;
		return {
			left: gridPos.gridX - halfWidth,
			right: gridPos.gridX + halfWidth,
			top: gridPos.gridY + halfHeight,
			bottom: gridPos.gridY - halfHeight,
		};
	}

	// Fallback: for coordinate-based rooms, use the actual room coordinates
	return {
		left: room.startX,
		right: room.endX,
		top: room.endY,
		bottom: room.startY,
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
 * Check if two rooms are adjacent (have a connection to each other)
 */
export function areRoomsAdjacent(
	room1: RoomTemplate,
	room2: RoomTemplate,
): boolean {
	// Must be on the same floor
	if (room1.floor !== room2.floor) return false;

	// Can't be adjacent to itself
	if (room1.id === room2.id) return false;

	// Check if room1 connects to room2 via connection fields
	if (room1.connection_north === room2.id ||
		room1.connection_south === room2.id ||
		room1.connection_east === room2.id ||
		room1.connection_west === room2.id) {
		return true;
	}

	// Check if room2 connects to room1 via connection fields
	if (room2.connection_north === room1.id ||
		room2.connection_south === room1.id ||
		room2.connection_east === room1.id ||
		room2.connection_west === room1.id) {
		return true;
	}

	// Also check physical adjacency based on coordinates
	// East side: right edge of room1 touches left edge of room2
	if (room1.endX === room2.startX &&
		!(room1.endY <= room2.startY || room1.startY >= room2.endY)) {
		return true;
	}
	// West side: left edge of room1 touches right edge of room2
	if (room1.startX === room2.endX &&
		!(room1.endY <= room2.startY || room1.startY >= room2.endY)) {
		return true;
	}
	// North side: top edge of room1 touches bottom edge of room2 (room2 is above room1)
	if (room1.endY === room2.startY &&
		!(room1.endX <= room2.startX || room1.startX >= room2.endX)) {
		return true;
	}
	// South side: bottom edge of room1 touches top edge of room2 (room2 is below room1)
	if (room1.startY === room2.endY &&
		!(room1.endX <= room2.startX || room1.startX >= room2.endX)) {
		return true;
	}

	return false;
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

	// Also check physical adjacency based on coordinates
	// East side: right edge of fromRoom touches left edge of toRoom
	if (fromRoom.endX === toRoom.startX &&
		!(fromRoom.endY <= toRoom.startY || fromRoom.startY >= toRoom.endY)) {
		return 'right';
	}
	// West side: left edge of fromRoom touches right edge of toRoom
	if (fromRoom.startX === toRoom.endX &&
		!(fromRoom.endY <= toRoom.startY || fromRoom.startY >= toRoom.endY)) {
		return 'left';
	}
	// North side: top edge of fromRoom touches bottom edge of toRoom (toRoom is above fromRoom)
	if (fromRoom.endY === toRoom.startY &&
		!(fromRoom.endX <= toRoom.startX || fromRoom.startX >= toRoom.endX)) {
		return 'top';
	}
	// South side: bottom edge of fromRoom touches top edge of toRoom (toRoom is below fromRoom)
	if (fromRoom.startY === toRoom.endY &&
		!(fromRoom.endX <= toRoom.startX || fromRoom.startX >= toRoom.endX)) {
		return 'bottom';
	}

	return null;
}

/**
 * Find all rooms that are adjacent to the given room
 */
export function findAdjacentRooms(
	room: RoomTemplate,
	allRooms: RoomTemplate[],
): RoomTemplate[] {
	return allRooms.filter(otherRoom =>
		otherRoom.id !== room.id && areRoomsAdjacent(room, otherRoom),
	);
}

/**
 * Calculate door position between two rooms
 */
export function getDoorPosition(
	fromRoom: RoomTemplate,
	toRoom: RoomTemplate,
	roomPosition: Record<string, { gridX: number; gridY: number }>,
): {
	side: 'top' | 'bottom' | 'left' | 'right';
	gridX: number;
	gridY: number;
	screenX: number;
	screenY: number;
} | null {
	const side = getConnectionSide(fromRoom, toRoom);
	if (!side) return null;

	const fromBounds = getRoomGridBounds(fromRoom, roomPosition);
	const toBounds = getRoomGridBounds(toRoom, roomPosition);

	let gridX: number;
	let gridY: number;

	switch (side) {
	case 'right': {
		// Find the shared wall segment along Y axis
		const sharedTop = Math.min(fromBounds.top, toBounds.top);
		const sharedBottom = Math.max(fromBounds.bottom, toBounds.bottom);
		const sharedCenter = (sharedTop + sharedBottom) / 2;

		// Clamp to actual room bounds to ensure door is on the wall
		gridY = Math.max(fromBounds.bottom, Math.min(fromBounds.top, sharedCenter));
		gridX = fromBounds.right;
		break;
	}
	case 'left': {
		const sharedTop = Math.min(fromBounds.top, toBounds.top);
		const sharedBottom = Math.max(fromBounds.bottom, toBounds.bottom);
		const sharedCenter = (sharedTop + sharedBottom) / 2;

		gridY = Math.max(fromBounds.bottom, Math.min(fromBounds.top, sharedCenter));
		gridX = fromBounds.left;
		break;
	}
	case 'top': {
		// Find the shared wall segment along X axis
		const sharedLeft = Math.max(fromBounds.left, toBounds.left);
		const sharedRight = Math.min(fromBounds.right, toBounds.right);
		const sharedCenter = (sharedLeft + sharedRight) / 2;

		// Clamp to actual room bounds to ensure door is on the wall
		gridX = Math.max(fromBounds.left, Math.min(fromBounds.right, sharedCenter));
		gridY = fromBounds.top;
		break;
	}
	case 'bottom': {
		const sharedLeft = Math.max(fromBounds.left, toBounds.left);
		const sharedRight = Math.min(fromBounds.right, toBounds.right);
		const sharedCenter = (sharedLeft + sharedRight) / 2;

		gridX = Math.max(fromBounds.left, Math.min(fromBounds.right, sharedCenter));
		gridY = fromBounds.bottom;
		break;
	}
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
