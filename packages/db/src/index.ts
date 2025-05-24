import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import Galaxy from './models/galaxy';
import Game from './models/game';
import schema from './schema';
import { GameService } from './services/game-service';

const adapter = new LokiJSAdapter({
       schema,
       dbName: 'stargate_evolution',
       useWebWorker: false,
       useIncrementalIndexedDB: true,
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
