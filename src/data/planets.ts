import Dexie from 'dexie';
import { ClimateType } from '../types/base';
import { createRoom } from '../types/room';
import { Planet, createPlanet, PlanetId } from '../types/planet';

// Define the database
export class PlanetDatabase extends Dexie {
	planets!: Dexie.Table<Planet, string>;

	constructor() {
		super('StargateEvolutionPlanets');

		// Define the schema
		this.version(1).stores({
			planets: 'id, name, address, climate'
		});
	}
}

// Create a single instance of the database
export const planetDb = new PlanetDatabase();

// Helper function to initialize the database with default planets
export async function initializeDefaultPlanets(): Promise<void> {
	const count = await planetDb.planets.count();

	// Only initialize if the database is empty
	if (count === 0) {
		try {
			// Create Earth planet
			const earthPlanet = createEarthPlanet();
			await planetDb.planets.add(earthPlanet);

			// Create Abydos planet
			const abydosPlanet = createAbydosPlanet();
			await planetDb.planets.add(abydosPlanet);

			console.log('Default planets initialized successfully');
		} catch (error) {
			console.error('Error initializing default planets:', error);
		}
	}
}

// Helper function to create Earth as the default starting planet
export function createEarthPlanet(): Planet {
	const commandCenterId = 'earth-command-center';
	const stargateRoomId = 'earth-stargate-room';
	const corridorId = 'earth-corridor-1';

	return createPlanet({
		id: 'earth',
		name: 'Earth',
		type: 'temperate',
		climate: ClimateType.enum.TEMPERATE,
		address: 'EARTH-000',
		description: 'Home planet of the SGC and humanity',
		theme: {
			name: 'Earth SGC',
			defaultWallColor: '#555555',
			defaultFloorColor: '#444444',
			defaultAmbientLight: '#ffffff',
			defaultPointLightColor: '#66ccff'
		},
		stargateRoomId,
		rooms: [
			createRoom({
				id: stargateRoomId,
				name: 'SGC Gate Room',
				type: 'STARGATE_ROOM',
				position: { x: 0, y: 0, z: 0, rotation: 0 },
				description: 'The main gate room at Stargate Command, containing Earth\'s stargate.',
				planetId: 'earth',
				connections: [
					{
						targetRoomId: corridorId,
						position: { x: 0, y: 0, z: 5, rotation: Math.PI },
						isLocked: false
					}
				]
			}),
			createRoom({
				id: corridorId,
				name: 'Main Corridor',
				type: 'CORRIDOR',
				position: { x: 0, y: 0, z: 10, rotation: 0 },
				description: 'The main corridor connecting the gate room to the command center.',
				planetId: 'earth',
				connections: [
					{
						targetRoomId: stargateRoomId,
						position: { x: 0, y: 0, z: -5, rotation: 0 },
						isLocked: false
					},
					{
						targetRoomId: commandCenterId,
						position: { x: 5, y: 0, z: 0, rotation: Math.PI / 2 },
						isLocked: false
					}
				]
			}),
			createRoom({
				id: commandCenterId,
				name: 'SGC Command Center',
				type: 'COMMAND_CENTER',
				position: { x: 10, y: 0, z: 10, rotation: 0 },
				description: 'The command center overlooking the stargate room.',
				planetId: 'earth',
				connections: [
					{
						targetRoomId: corridorId,
						position: { x: -5, y: 0, z: 0, rotation: -Math.PI / 2 },
						isLocked: false
					}
				]
			})
		],
		isExplored: true,
		dangerLevel: 0,
		requiredTechLevel: 0,
		temperature: 15,
		gravity: 1,
		hasAtmosphere: true
	});
}

// Helper function to create Abydos as the first alien planet
export function createAbydosPlanet(): Planet {
	const stargateRoomId = 'abydos-stargate-room';
	const templeId = 'abydos-temple';
	const villageId = 'abydos-village';

	return createPlanet({
		id: 'abydos',
		name: 'Abydos',
		type: 'desert',
		climate: ClimateType.enum.DESERT,
		address: 'ABYDOS-001',
		description: 'A desert planet with an ancient Egyptian-like civilization.',
		theme: {
			name: 'Abydos Desert',
			defaultWallColor: '#AA8855',
			defaultFloorColor: '#8A6642',
			defaultAmbientLight: '#ffebcd',
			defaultPointLightColor: '#ffdab9',
			atmosphereColor: '#ffe4c4',
			fogDensity: 0.02
		},
		stargateRoomId,
		rooms: [
			createRoom({
				id: stargateRoomId,
				name: 'Abydos Gate Chamber',
				type: 'STARGATE_ROOM',
				position: { x: 0, y: 0, z: 0, rotation: 0 },
				description: 'An ancient chamber housing the Abydos stargate, covered in hieroglyphs.',
				planetId: 'abydos',
				connections: [
					{
						targetRoomId: templeId,
						position: { x: 0, y: 0, z: 5, rotation: Math.PI },
						isLocked: false
					}
				]
			}),
			createRoom({
				id: templeId,
				name: 'Ra Temple',
				type: 'TEMPLE',
				position: { x: 0, y: 0, z: 10, rotation: 0 },
				description: 'A grand temple once dedicated to the false god Ra.',
				planetId: 'abydos',
				connections: [
					{
						targetRoomId: stargateRoomId,
						position: { x: 0, y: 0, z: -5, rotation: 0 },
						isLocked: false
					},
					{
						targetRoomId: villageId,
						position: { x: 0, y: 0, z: 5, rotation: Math.PI },
						isLocked: false
					}
				]
			}),
			createRoom({
				id: villageId,
				name: 'Abydos Village',
				type: 'VILLAGE_CENTER',
				position: { x: 0, y: 0, z: 20, rotation: 0 },
				description: 'A village of indigenous people who mine minerals for trade.',
				planetId: 'abydos',
				connections: [
					{
						targetRoomId: templeId,
						position: { x: 0, y: 0, z: -5, rotation: 0 },
						isLocked: false
					}
				]
			})
		],
		isExplored: false,
		dangerLevel: 2,
		requiredTechLevel: 0,
		temperature: 35,
		gravity: 0.9,
		hasAtmosphere: true,
		civilization: {
			name: 'Abydonians',
			friendliness: 0.8,
			technologicalLevel: 0.2,
			description: 'A peaceful civilization descended from ancient Egyptians brought to Abydos by Ra.'
		},
		availableResources: [
			{
				type: 'NAQUADAH',
				abundance: 0.7
			}
		]
	});
}
