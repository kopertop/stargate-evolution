import Dexie, { Table } from 'dexie';
import { Planet } from '../types';
import { Location } from '../types';

// Define the database
export class StargateDatabase extends Dexie {
	planets!: Table<Planet, string>;
	locations!: Table<Location, string>;

	constructor() {
		super('stargateEvolution');

		// Define the schema
		this.version(1).stores({
			planets: 'id, name, description, isDiscovered',
			locations: 'id, planetId, name, description, discovered'
		});
	}
}

export const db = new StargateDatabase();
