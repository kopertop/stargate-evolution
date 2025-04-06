import Dexie from 'dexie';
import type { Planet } from '../types/planet';
import type { Room } from '../types/room';

// Define the database
export class StargateEvolutionDatabase extends Dexie {
	planets!: Dexie.Table<Planet, string>;
	rooms!: Dexie.Table<Room, string>;

	constructor() {
		super('StargateEvolution');

		// Define the schema
		this.version(1).stores({
			planets: 'id, name, address, climate',
			rooms: 'id, planetId, type, isDiscovered'
		});
	}
}

export const db = new StargateEvolutionDatabase();