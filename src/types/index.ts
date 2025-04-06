// Re-export all base types
export * from './base';

// Re-export room types
export {
	Room,
	RoomType,
	RoomPosition,
	RoomTheme,
	RoomConnection,
	createRoom,
	isRoom
} from './room';

// Re-export planet types, but rename Planet to avoid conflicts
export {
	PlanetTheme,
	Planet as GamePlanet,  // Rename to avoid conflicts
	PlanetId,
	createPlanet,
	isPlanet
} from './planet';

// Legacy type for compatibility with existing code
export type Planets = 'Earth' | 'Abydos';
