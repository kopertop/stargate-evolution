import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import Chevron from './models/chevron';
import DestinyStatus from './models/destiny-status';
import Galaxy from './models/galaxy';
import Game from './models/game';
import Person from './models/person';
import Planet from './models/planet';
import Race from './models/race';
import Room from './models/room';
import Ship from './models/ship';
import Star from './models/star';
import StarSystem from './models/star-system';
import Stargate from './models/stargate';
import Technology from './models/technology';
import schema from './schema';
import { GameService } from './services/game-service';

const adapter = new LokiJSAdapter({
	schema,
	dbName: 'stargate_evolution',
	useWebWorker: false,
	useIncrementalIndexedDB: true,
	onSetUpError: (error) => {
		console.error('Database failed to load -- offer the user to reload the app or log out', error);
	},
	onQuotaExceededError: (error) => {
		// Browser ran out of disk space -- offer the user to reload the app or log out
		console.error('Browser ran out of disk space -- offer the user to reload the app or log out', error);
	},
	extraIncrementalIDBOptions: {
		onDidOverwrite: () => {
			// Called when this adapter is forced to overwrite contents of IndexedDB.
			// This happens if there's another open tab of the same app that's making changes.
			// Try to synchronize the app now, and if user is offline, alert them that if they close this
			// tab, some data may be lost
			console.log('Database overwritten');
		},
		onversionchange: () => {
			// database was deleted in another browser tab (user logged out), so we must make sure we delete
			// it in this tab as well - usually best to just refresh the page
			console.log('Version Changed, refreshing page');
			window.location.reload();
		},
	},
});

export const database = new Database({
	adapter,
	modelClasses: [
		Game,
		Galaxy,
		StarSystem,
		Star,
		Planet,
		Race,
		Person,
		Technology,
		Ship,
		Stargate,
		Chevron,
		Room,
		DestinyStatus,
	],
});

export const gameService = new GameService(database);
(window as any).gameService = gameService;

export { GameService };
export {
	Game,
	Galaxy,
	StarSystem,
	Star,
	Planet,
	Race,
	Person,
	Technology,
	Ship,
	Stargate,
	Chevron,
	Room,
	DestinyStatus,
};
export default database;
