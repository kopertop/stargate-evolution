import { RoomTemplate } from '@stargate/common';

// Grid system constants
export const GRID_UNIT = 64;           // Base grid unit (64px)
export const WALL_THICKNESS = 8;      // Wall thickness
export const DOOR_SIZE = 32;          // Door size (fits in wall)
export const SCREEN_CENTER_X = 400;   // Screen center X coordinate
export const SCREEN_CENTER_Y = 300;   // Screen center Y coordinate

/**
 * RECTANGLE-BASED POSITIONING SYSTEM
 * Rooms are defined by start_x, start_y, end_x, end_y rectangles
 * Convert these to screen coordinates for rendering
 */

/**
 * Get room position using rectangle-based positioning
 * Rooms now have start_x, start_y, end_x, end_y instead of gridX, gridY, width, height
 */
export function getRoomScreenPosition(room: RoomTemplate): { x: number; y: number } {
	// Check if room has new rectangle positioning
	if (
		room.start_x !== undefined
		&& room.start_y !== undefined
		&& room.end_x !== undefined && room.end_y !== undefined) {
		// Calculate center of rectangle
		const centerX = (room.start_x + room.end_x) / 2;
		const centerY = (room.start_y + room.end_y) / 2;

		// Convert to screen coordinates
		return gridToScreenPosition(centerX, centerY);
	}

	// Final fallback
	console.warn('[GridSystem] Room missing positioning data:', room);
	return { x: SCREEN_CENTER_X, y: SCREEN_CENTER_Y };
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
 */
export function getRoomGridCenter(room: RoomTemplate): { gridX: number; gridY: number } {
	// Use new rectangle positioning if available
	if (room.start_x !== undefined && room.start_y !== undefined && room.end_x !== undefined && room.end_y !== undefined) {
		return {
			gridX: (room.start_x + room.end_x) / 2,
			gridY: (room.start_y + room.end_y) / 2,
		};
	}

	// Final fallback
	console.warn('[GridSystem] Room missing positioning data for grid center:', room);
	return { gridX: 0, gridY: 0 };
}

/**
 * Get room boundaries in grid coordinates
 */
export function getRoomGridBounds(room: RoomTemplate): {
	left: number;
	right: number;
	top: number;
	bottom: number;
} {
	// Use new rectangle positioning if available
	if (room.start_x !== undefined && room.start_y !== undefined && room.end_x !== undefined && room.end_y !== undefined) {
		return {
			left: room.start_x,
			right: room.end_x,
			top: room.end_y,    // In rectangle system, end_y is the top
			bottom: room.start_y, // start_y is the bottom
		};
	}

	// Final fallback
	console.warn('[GridSystem] Room missing positioning data for bounds:', room);
	return { left: 0, right: 1, top: 1, bottom: 0 };
}

/**
 * Get room boundaries in screen coordinates (pixels)
 */
export function getRoomScreenBounds(room: RoomTemplate): {
	left: number;
	right: number;
	top: number;
	bottom: number;
	width: number;
	height: number;
} {
	const gridBounds = getRoomGridBounds(room);
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

	const bounds1 = getRoomGridBounds(room1);
	const bounds2 = getRoomGridBounds(room2);

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
export function getConnectionSide(fromRoom: RoomTemplate, toRoom: RoomTemplate): 'top' | 'bottom' | 'left' | 'right' | null {
	const bounds1 = getRoomGridBounds(fromRoom);
	const bounds2 = getRoomGridBounds(toRoom);

	// First check for direct adjacency
	if (bounds1.right === bounds2.left) return 'right';
	if (bounds1.left === bounds2.right) return 'left';
	if (bounds1.top === bounds2.bottom) return 'top';
	if (bounds1.bottom === bounds2.top) return 'bottom';

	// If not directly adjacent, determine connection side based on relative positions
	const fromCenterX = bounds1.left + (bounds1.right - bounds1.left) / 2;
	const fromCenterY = bounds1.bottom + (bounds1.top - bounds1.bottom) / 2;
	const toCenterX = bounds2.left + (bounds2.right - bounds2.left) / 2;
	const toCenterY = bounds2.bottom + (bounds2.top - bounds2.bottom) / 2;

	const deltaX = toCenterX - fromCenterX;
	const deltaY = toCenterY - fromCenterY;

	// Determine primary direction
	if (Math.abs(deltaX) > Math.abs(deltaY)) {
		// Horizontal connection
		return deltaX > 0 ? 'right' : 'left';
	} else {
		// Vertical connection
		return deltaY > 0 ? 'top' : 'bottom';
	}
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

	const fromBounds = getRoomGridBounds(fromRoom);
	const toBounds = getRoomGridBounds(toRoom);

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
