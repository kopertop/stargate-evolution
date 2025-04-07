import { db } from './db';
import { Location } from '../types';

// Default locations data
const defaultLocations: Location[] = [
	{
		id: 'earth-sgc',
		planetId: 'earth',
		name: 'Stargate Command',
		description: 'The command center of the Earth\'s Stargate program, housed deep within Cheyenne Mountain.',
		discovered: true
	},
	{
		id: 'earth-corridor',
		planetId: 'earth',
		name: 'SGC Corridor',
		description: 'A corridor connecting different parts of the SGC facility.',
		discovered: true
	},
	{
		id: 'abydos-temple',
		planetId: 'abydos',
		name: 'Temple of Ra',
		description: 'An ancient temple dedicated to the false god Ra, housing the Abydos Stargate.',
		discovered: false
	},
	{
		id: 'abydos-village',
		planetId: 'abydos',
		name: 'Abydos Village',
		description: 'A settlement of the Abydos natives, resembling ancient Egyptian architecture.',
		discovered: false
	}
];

// Initialize default locations if needed
export async function initializeDefaultLocations(): Promise<void> {
	const count = await db.locations.count();

	// Only add default locations if the table is empty
	if (count === 0) {
		console.log('Adding default locations to database');
		await db.locations.bulkAdd(defaultLocations);
	}
}

// Get a location by ID
export async function getLocationById(id: string): Promise<Location | undefined> {
	return db.locations.get(id);
}

// Get all locations for a planet
export async function getLocationsForPlanet(planetId: string): Promise<Location[]> {
	return db.locations.where('planetId').equals(planetId).toArray();
}

// Get discovered locations for a planet
export async function getDiscoveredLocationsForPlanet(planetId: string): Promise<Location[]> {
	return db.locations
		.where('planetId').equals(planetId)
		.and(location => location.discovered)
		.toArray();
}

// Add a new location
export async function addLocation(location: Location): Promise<string> {
	return db.locations.add(location);
}

// Update an existing location
export async function updateLocation(id: string, changes: Partial<Location>): Promise<void> {
	await db.locations.update(id, changes);
}

// Discover a location
export async function discoverLocation(id: string): Promise<void> {
	await db.locations.update(id, { discovered: true });
}
