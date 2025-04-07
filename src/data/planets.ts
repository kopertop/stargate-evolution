import { db } from './db';
import { Planet } from '../types';

// Default planets data
const defaultPlanets: Planet[] = [
	{
		id: 'earth',
		name: 'Earth',
		description: 'Home planet of the Tau\'ri, where the Stargate program is based.',
		type: 'PLANET',
		climate: 'TEMPERATE',
		resources: [
			{
				type: 'MINERAL',
				abundance: 0.5,
				difficulty: 1,
				discovered: true
			}
		],
		isDiscovered: true,
		isExplored: true,
		explorationStatus: 'UNEXPLORED',
		locations: [],
		bases: [],
		threatLevel: 0,
		dangerLevel: 1,
		requiredTechLevel: 0,
		hasAtmosphere: true,
		hasStargate: true,
		address: '123456',
		theme: {
			name: 'Default',
			defaultWallColor: '#000000',
			defaultFloorColor: '#000000',
			defaultAmbientLight: '#000000',
			defaultPointLightColor: '#000000',
			defaultPointLightIntensity: 1,
		},
		stargateRoomId: 'sgc',
		gravity: 1.0,
		temperature: 15,
		customProperties: {},
		availableResources: []
	},
	{
		id: 'abydos',
		name: 'Abydos',
		description: 'A desert planet with a culture similar to ancient Egypt, first planet visited through the Stargate.',
		type: 'PLANET',
		climate: 'DESERT',
		resources: [
			{
				type: 'MINERAL',
				abundance: 0.8,
				difficulty: 2,
				discovered: false
			}
		],
		isDiscovered: false,
		isExplored: false,
		explorationStatus: 'UNEXPLORED',
		locations: [],
		bases: [],
		threatLevel: 2,
		dangerLevel: 3,
		requiredTechLevel: 1,
		hasAtmosphere: true,
		hasStargate: true,
		address: '654321',
		theme: {
			name: 'Desert',
			defaultWallColor: '#d2b48c',
			defaultFloorColor: '#f5deb3',
			defaultAmbientLight: '#fff8dc',
			defaultPointLightColor: '#ffff00',
			defaultPointLightIntensity: 1.2,
		},
		stargateRoomId: 'temple',
		gravity: 0.9,
		temperature: 35,
		customProperties: {},
		availableResources: []
	}
];

// Initialize default planets in the database
export async function initializeDefaultPlanets(): Promise<void> {
	const count = await db.planets.count();

	// Only add default planets if the table is empty
	if (count === 0) {
		console.log('Adding default planets to database');
		await db.planets.bulkAdd(defaultPlanets);
	}
}

// Get a planet by ID
export async function getPlanetById(id: string): Promise<Planet | undefined> {
	return db.planets.get(id);
}

// Get all planets
export async function getAllPlanets(): Promise<Planet[]> {
	return db.planets.toArray();
}

// Get discovered planets
export async function getDiscoveredPlanets(): Promise<Planet[]> {
	return db.planets.where('isDiscovered').equals(1).toArray();
}

// Discover a planet
export async function discoverPlanet(id: string): Promise<void> {
	await db.planets.update(id, { isDiscovered: true });
}

