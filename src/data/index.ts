import { planetDb, PlanetDatabase, initializeDefaultPlanets } from './planets';
import { roomDb, RoomDatabase, getRoomsForPlanet, getRoomById, addRoom, updateRoom, discoverRoom } from './rooms';

// Export database instances
export {
	planetDb,
	roomDb,
	PlanetDatabase,
	RoomDatabase
};

// Export planet-related functions
export {
	initializeDefaultPlanets
};

// Export room-related functions
export {
	getRoomsForPlanet,
	getRoomById,
	addRoom,
	updateRoom,
	discoverRoom
};

// Initialize function to set up all databases
export async function initializeGameData(): Promise<void> {
	try {
		// Initialize planets
		await initializeDefaultPlanets();

		console.log('Game data initialized successfully');
	} catch (error) {
		console.error('Error initializing game data:', error);
		throw new Error('Failed to initialize game data');
	}
}
