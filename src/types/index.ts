// Re-export all base types
export * from './base';

// Re-export location types
export * from './location';

// Re-export planet types
export * from './planet';

// Legacy type for compatibility with existing code
export type Planets = 'Earth' | 'Abydos';

// Renamed to avoid conflicts
export { Planet as GamePlanet } from './planet';

export interface RoomTheme {
	name: string;
	wallColor: string;
	floorColor: string;
	ambientLight: string;
}

export interface Room {
	id: string;
	name: string;
	type: string;
	position: [number, number, number];
	theme: RoomTheme;
}

export interface Planet {
	id: string;
	name: string;
	description: string;
	type: string;
	climate: string;
	isDiscovered: boolean;
	isExplored: boolean;
	resources: any[];
	explorationStatus: string;
	locations: any[];
	bases: any[];
	threatLevel: number;
	dangerLevel: number;
	requiredTechLevel: number;
	hasAtmosphere: boolean;
	hasStargate: boolean;
	address: string;
	theme: {
		name: string;
		defaultWallColor: string;
		defaultFloorColor: string;
		defaultAmbientLight: string;
		defaultPointLightColor: string;
		defaultPointLightIntensity: number;
	};
	stargateRoomId: string;
	gravity: number;
	temperature: number;
	customProperties: Record<string, any>;
	availableResources: any[];
}

export interface Location {
	id: string;
	planetId: string;
	name: string;
	description: string;
	discovered: boolean;
}
