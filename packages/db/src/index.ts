import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import Galaxy from './models/galaxy';
import Game from './models/game';
import schema from './schema';
import { GameService } from './services/game-service';

const adapter = new SQLiteAdapter({
	schema,
	// migrations: [], // Add when needed
	dbName: 'stargate_evolution',
	jsi: true, // Platform-specific, set to false for web
});

export const database = new Database({
	adapter,
	modelClasses: [
		Game,
		Galaxy,
		// Add other models as we create them
	],
});

export const gameService = new GameService(database);

export { GameService };
export { Game, Galaxy };
export default database;
