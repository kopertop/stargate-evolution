import { Database } from '@nozbe/watermelondb';

import { database } from '../index';
import Game from '../models/game';

export class AlternativeCreateTest {
	constructor(private database: Database) {}

	async testDirectFieldAssignment() {
		console.log('=== Test: Direct Field Assignment ===');

		await this.database.write(async () => {
			const game = await this.database.get<Game>('games').create((gameRecord) => {
				// Try using _raw directly
				(gameRecord._raw as any).name = 'Direct Raw Assignment';
				(gameRecord._raw as any).created_at = Date.now();
				(gameRecord._raw as any).updated_at = Date.now();
			});

			console.log('Direct assignment - game.name:', game.name);
			console.log('Direct assignment - _raw:', game._raw);
		});
	}

	async testManualPreparedUpdate() {
		console.log('\n=== Test: Manual Prepared Update ===');

		await this.database.write(async () => {
			const game = await this.database.get<Game>('games').create((gameRecord) => {
				gameRecord.name = 'Prepared Update Test';
			});

			// Try manual update after creation
			const updatedGame = await game.update((record) => {
				record.name = 'Updated After Creation';
			});

			console.log('After update - game.name:', updatedGame.name);
			console.log('After update - _raw:', updatedGame._raw);
		});
	}

	async testEmptyCreateThenUpdate() {
		console.log('\n=== Test: Empty Create Then Update ===');

		await this.database.write(async () => {
			// Create with minimal data
			const game = await this.database.get<Game>('games').create(() => {
				// Don't set anything in the create callback
			});

			console.log('Empty create - game.name:', game.name);
			console.log('Empty create - _raw:', game._raw);

			// Then update
			const updatedGame = await game.update((record) => {
				record.name = 'Set After Empty Create';
			});

			console.log('After setting name - game.name:', updatedGame.name);
			console.log('After setting name - _raw:', updatedGame._raw);
		});
	}

	async testWithExplicitTimestamps() {
		console.log('\n=== Test: With Explicit Timestamps ===');

		await this.database.write(async () => {
			const game = await this.database.get<Game>('games').create((gameRecord) => {
				gameRecord.name = 'Explicit Timestamps Test';
				// Try setting timestamps explicitly
				(gameRecord as any).createdAt = new Date();
				(gameRecord as any).updatedAt = new Date();
			});

			console.log('Explicit timestamps - game.name:', game.name);
			console.log('Explicit timestamps - _raw:', game._raw);
		});
	}

	async runAllTests() {
		await this.testDirectFieldAssignment();
		await this.testManualPreparedUpdate();
		await this.testEmptyCreateThenUpdate();
		await this.testWithExplicitTimestamps();
	}
}

export async function runAlternativeCreateTests() {
	const tester = new AlternativeCreateTest(database);
	await tester.runAllTests();
}
