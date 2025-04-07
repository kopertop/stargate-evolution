import { initializeDefaultPlanets } from './planets';
import { initializeDefaultLocations, getLocationById, getLocationsForPlanet, discoverLocation, addLocation, updateLocation } from './locations';
import { db } from './db';

export { db };

// Export planet-related functions
export {
	initializeDefaultPlanets
};

// Export location-related functions
export {
	getLocationById,
	getLocationsForPlanet,
	addLocation,
	updateLocation,
	discoverLocation
};

// Initialize function to set up all databases
export async function initializeGameData(): Promise<void> {
	try {
		// Initialize planets
		await initializeDefaultPlanets();

		// Initialize locations
		await initializeDefaultLocations();

		console.log('Game data initialized successfully');
	} catch (error) {
		console.error('Error initializing game data:', error);
		throw new Error('Failed to initialize game data');
	}
}
