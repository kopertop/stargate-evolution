import { Database } from '@nozbe/watermelondb';

import { database } from '../index';
import Game from '../models/game';

export class LokiJSDebug {
	constructor(private database: Database) {}

	async debugFieldMapping() {
		console.log('=== Field Mapping Debug ===');

		// Check the schema configuration
		const adapter = this.database.adapter as any;
		console.log('Adapter type:', adapter.constructor.name);
		console.log('Schema version:', adapter.schema?.version);

		// Check the games table schema specifically
		if (adapter.schema?.tables) {
			const gamesTableSchema = adapter.schema.tables.find((t: any) => t.name === 'games');
			console.log('Games table schema:', gamesTableSchema);
		}

		// Test a simple create and examine at each step
		console.log('\n=== Step-by-step Create Debug ===');

		await this.database.write(async () => {
			const game = await this.database.get<Game>('games').create((gameRecord) => {
				console.log('Before assignment - gameRecord:', gameRecord);
				console.log('Before assignment - _raw:', gameRecord._raw);

				gameRecord.name = 'Debug Test Game';

				console.log('After assignment - gameRecord.name:', gameRecord.name);
				console.log('After assignment - _raw:', gameRecord._raw);
			});

			console.log('After create - game.name:', game.name);
			console.log('After create - _raw:', game._raw);
		});
	}

	async debugLokiJSDirectly() {
		console.log('\n=== Direct LokiJS Debug ===');

		const adapter = this.database.adapter as any;

		// Try to access the underlying LokiJS database
		if (adapter.loki) {
			console.log('LokiJS instance found');
			const gamesCollection = adapter.loki.getCollection('games');
			if (gamesCollection) {
				console.log('Games collection exists');
				console.log('Collection data:', gamesCollection.data);
			} else {
				console.log('Games collection not found');
			}
		} else {
			console.log('No direct LokiJS access available');
		}
	}

	async debugSchemaVersion() {
		console.log('\n=== Schema Version Debug ===');

		const adapter = this.database.adapter as any;
		console.log('Schema version:', adapter.schema?.version);

		// Check if there's a version mismatch
		try {
			const localVersion = await adapter.getLocal('__watermelondb_schema_version__');
			console.log('Local schema version:', localVersion);
		} catch (e) {
			console.log('Could not get local schema version:', e);
		}
	}

	async fullDiagnostic() {
		await this.debugFieldMapping();
		await this.debugLokiJSDirectly();
		await this.debugSchemaVersion();
	}
}

// Export a function to run the diagnostics
export async function runLokiJSDebug() {
	const debug = new LokiJSDebug(database);
	await debug.fullDiagnostic();
}
