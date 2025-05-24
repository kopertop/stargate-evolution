import { Database } from '@nozbe/watermelondb';

import { database } from '../index';
import Game from '../models/game';

export class CleanSlateTest {
	constructor(private database: Database) {}

	async resetDatabase() {
		console.log('=== Resetting Database ===');

		await this.database.write(async () => {
			await this.database.unsafeResetDatabase();
		});

		console.log('Database reset completed');
	}

	async testBasicCreate() {
		console.log('\n=== Basic Create Test (Post-Reset) ===');

		await this.database.write(async () => {
			const game = await this.database.get<Game>('games').create((gameRecord) => {
				console.log('Creating with name: Test Game');
				gameRecord.name = 'Test Game';
			});

			console.log('Created game - name:', game.name);
			console.log('Created game - _raw:', game._raw);

			// Immediately try to find it
			const foundGame = await this.database.get<Game>('games').find(game.id);
			console.log('Found game - name:', foundGame.name);
			console.log('Found game - _raw:', foundGame._raw);
		});
	}

	async testMultipleCreatesInSameTransaction() {
		console.log('\n=== Multiple Creates in Same Transaction ===');

		await this.database.write(async () => {
			const game1 = await this.database.get<Game>('games').create((gameRecord) => {
				gameRecord.name = 'Game 1';
			});

			const game2 = await this.database.get<Game>('games').create((gameRecord) => {
				gameRecord.name = 'Game 2';
			});

			console.log('Game 1 - name:', game1.name, '_raw:', game1._raw);
			console.log('Game 2 - name:', game2.name, '_raw:', game2._raw);
		});
	}

	async testCreateInSeparateTransactions() {
		console.log('\n=== Creates in Separate Transactions ===');

		let gameId: string;

		await this.database.write(async () => {
			const game = await this.database.get<Game>('games').create((gameRecord) => {
				gameRecord.name = 'Separate Transaction Game';
			});
			gameId = game.id;
			console.log('Transaction 1 - name:', game.name, '_raw:', game._raw);
		});

		await this.database.write(async () => {
			const foundGame = await this.database.get<Game>('games').find(gameId);
			console.log('Transaction 2 - found name:', foundGame.name, '_raw:', foundGame._raw);
		});
	}

	async runCleanSlateTests() {
		await this.resetDatabase();
		await this.testBasicCreate();
		await this.testMultipleCreatesInSameTransaction();
		await this.testCreateInSeparateTransactions();
	}
}

export async function runCleanSlateTests() {
	const tester = new CleanSlateTest(database);
	await tester.runCleanSlateTests();
}
