import type { Room } from '../types';

// Grid system constants
export const GRID_UNIT = 64;           // Base grid unit (64px)
export const WALL_THICKNESS = 8;      // Wall thickness
export const DOOR_SIZE = 32;          // Door size (fits in wall)
export const SCREEN_CENTER_X = 400;   // Screen center X coordinate
export const SCREEN_CENTER_Y = 300;   // Screen center Y coordinate

/**
 * Convert grid coordinates to screen position
 * Grid (0,0) is at screen center
 * Positive Y goes up (north), negative Y goes down (south)
 * Positive X goes right (east), negative X goes left (west)
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
export function getRoomGridCenter(room: Room): { gridX: number; gridY: number } {
	return {
		gridX: room.gridX + (room.gridWidth / 2),
		gridY: room.gridY + (room.gridHeight / 2),
	};
}

/**
 * Get the screen position for a room's center
 */
export function getRoomScreenPosition(room: Room): { x: number; y: number } {
	const center = getRoomGridCenter(room);
	return gridToScreenPosition(center.gridX, center.gridY);
}

/**
 * Get room boundaries in grid coordinates
 */
export function getRoomGridBounds(room: Room): {
	left: number;
	right: number;
	top: number;
	bottom: number;
} {
	return {
		left: room.gridX,
		right: room.gridX + room.gridWidth,
		top: room.gridY + room.gridHeight, // Top is higher Y value
		bottom: room.gridY,                // Bottom is lower Y value
	};
}

/**
 * Get room boundaries in screen coordinates (pixels)
 */
export function getRoomScreenBounds(room: Room): {
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
export function areRoomsAdjacent(room1: Room, room2: Room): boolean {
	// Must be on the same floor
	if (room1.floor !== room2.floor) return false;

	const bounds1 = getRoomGridBounds(room1);
	const bounds2 = getRoomGridBounds(room2);

	// Check for horizontal adjacency (sharing vertical border)
	const horizontallyAdjacent = (
		(bounds1.right === bounds2.left || bounds1.left === bounds2.right) &&
		!(bounds1.top <= bounds2.bottom || bounds1.bottom >= bounds2.top)
	);

	// Check for vertical adjacency (sharing horizontal border)
	const verticallyAdjacent = (
		(bounds1.top === bounds2.bottom || bounds1.bottom === bounds2.top) &&
		!(bounds1.right <= bounds2.left || bounds1.left >= bounds2.right)
	);

	return horizontallyAdjacent || verticallyAdjacent;
}

/**
 * Get the side where two adjacent rooms connect
 */
export function getConnectionSide(fromRoom: Room, toRoom: Room): 'top' | 'bottom' | 'left' | 'right' | null {
	if (!areRoomsAdjacent(fromRoom, toRoom)) return null;

	const bounds1 = getRoomGridBounds(fromRoom);
	const bounds2 = getRoomGridBounds(toRoom);

	// Check which side they connect on
	if (bounds1.right === bounds2.left) return 'right';
	if (bounds1.left === bounds2.right) return 'left';
	if (bounds1.top === bounds2.bottom) return 'top';
	if (bounds1.bottom === bounds2.top) return 'bottom';

	return null;
}

/**
 * Find all rooms that are adjacent to the given room
 */
export function findAdjacentRooms(room: Room, allRooms: Room[]): Room[] {
	return allRooms.filter(otherRoom =>
		otherRoom.id !== room.id && areRoomsAdjacent(room, otherRoom)
	);
}

/**
 * Get the door position on a room's wall for a connection to another room
 */
export function getDoorPosition(fromRoom: Room, toRoom: Room): {
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

	let gridX: number, gridY: number;

	switch (side) {
	case 'right':
		gridX = fromBounds.right;
		gridY = Math.max(fromBounds.bottom, toBounds.bottom) +
		        (Math.min(fromBounds.top, toBounds.top) - Math.max(fromBounds.bottom, toBounds.bottom)) / 2;
		break;
	case 'left':
		gridX = fromBounds.left;
		gridY = Math.max(fromBounds.bottom, toBounds.bottom) +
		        (Math.min(fromBounds.top, toBounds.top) - Math.max(fromBounds.bottom, toBounds.bottom)) / 2;
		break;
	case 'top':
		gridX = Math.max(fromBounds.left, toBounds.left) +
		        (Math.min(fromBounds.right, toBounds.right) - Math.max(fromBounds.left, toBounds.left)) / 2;
		gridY = fromBounds.top;
		break;
	case 'bottom':
		gridX = Math.max(fromBounds.left, toBounds.left) +
		        (Math.min(fromBounds.right, toBounds.right) - Math.max(fromBounds.left, toBounds.left)) / 2;
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
