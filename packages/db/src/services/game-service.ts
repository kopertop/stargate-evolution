import { Database, Q } from '@nozbe/watermelondb';
import { writer } from '@nozbe/watermelondb/decorators';
import { synchronize } from '@nozbe/watermelondb/sync';
import sleep from '@stargate/common/sleep';

import DestinyStatus from '../models/destiny-status';
import Galaxy from '../models/galaxy';
import Game from '../models/game';
import Race from '../models/race';
import StarSystem from '../models/star-system';

export class GameService {
	constructor(private database: Database) {}

	async test() {
		const game = await this.database.write(async () => {
			return await this.database.get<Game>('games').create((gameRecord) => {
				gameRecord.name = 'Milky Way';
				gameRecord.createdAt = new Date();
				gameRecord.updatedAt = new Date();
			});
		});
		await sleep(1000);

		console.log('Created game:', game);
		console.log('Game name after create:', game.name);
		console.log('Game _raw after create:', game._raw);
		const gameLookup = await this.database.get<Game>('games').find(game.id);
		console.log('Game lookup:', gameLookup.name);

		return game;
	}

	/**
	 * Create a new game with all initial data
	 */
	@writer async createNewGame(): Promise<string> {
		console.log('Creating new game...');

		// Try using create with explicit _raw assignment
		const game = await this.database.get<Game>('games').create((gameRecord) => {
			gameRecord.name = 'New Stargate Game';
		});

		console.log('Created game:', game);
		const gameId = game.id;
		console.log('Created game with ID:', gameId);
		console.log('Game name after create:', game.name);
		console.log('Game _raw after create:', game._raw);

		// Create galaxies using proper WatermelonDB methods
		const milkyWay = await this.database.get<Galaxy>('galaxies').create((galaxy) => {
			console.log('Inside galaxy create callback, before assignments');
			galaxy.gameId = gameId;
			galaxy.name = 'Milky Way';
			galaxy.x = 0;
			galaxy.y = 0;
			console.log('Inside galaxy create callback, after assignments:', galaxy.name, galaxy.gameId);
			console.log('Galaxy record _raw after assignment:', galaxy._raw);
		});
		console.log('Created Milky Way galaxy:', milkyWay.id);

		const jadesGalaxy = await this.database.get<Galaxy>('galaxies').create((galaxy) => {
			galaxy.gameId = gameId;
			galaxy.name = 'JADES-GS-z14-0';
			galaxy.x = 1000;
			galaxy.y = 0;
		});
		console.log('Created JADES galaxy:', jadesGalaxy.id);

		// Create star systems
		const solSystem = await this.database.get<StarSystem>('star_systems').create((starSystem) => {
			starSystem.gameId = gameId;
			starSystem.galaxyId = milkyWay.id;
			starSystem.name = 'Sol System';
			starSystem.x = 0;
			starSystem.y = 0;
			starSystem.description = 'The home system of Earth.';
		});
		console.log('Created Sol system:', solSystem.id);

		const icarusSystem = await this.database.get<StarSystem>('star_systems').create((starSystem) => {
			starSystem.gameId = gameId;
			starSystem.galaxyId = milkyWay.id;
			starSystem.name = 'Icarus System';
			starSystem.x = 100;
			starSystem.y = 200;
			starSystem.description = 'Remote system with Icarus planet.';
		});
		console.log('Created Icarus system:', icarusSystem.id);

		const destinySystem = await this.database.get<StarSystem>('star_systems').create((starSystem) => {
			starSystem.gameId = gameId;
			starSystem.galaxyId = jadesGalaxy.id;
			starSystem.name = 'Destiny System';
			starSystem.x = 500;
			starSystem.y = 500;
			starSystem.description = 'System where Destiny is found.';
		});
		console.log('Created Destiny system:', destinySystem.id);

		// Create races
		const ancientsRace = await this.database.get<Race>('races').create((race) => {
			race.gameId = gameId;
			race.name = 'Ancients';
			race.technology = JSON.stringify([]);
			race.ships = JSON.stringify([]);
		});
		console.log('Created Ancients race:', ancientsRace.id);

		const humanRace = await this.database.get<Race>('races').create((race) => {
			race.gameId = gameId;
			race.name = 'Human';
			race.technology = JSON.stringify([]);
			race.ships = JSON.stringify([]);
		});
		console.log('Created Human race:', humanRace.id);

		// Create Destiny status
		const destinyStatus = await this.database.get<DestinyStatus>('destiny_status').create((destinyStatus) => {
			destinyStatus.gameId = gameId;
			destinyStatus.name = 'Destiny';
			destinyStatus.power = 800;
			destinyStatus.maxPower = 1000;
			destinyStatus.shields = 400;
			destinyStatus.maxShields = 500;
			destinyStatus.hull = 900;
			destinyStatus.maxHull = 1000;
			destinyStatus.raceId = ancientsRace.id;
			destinyStatus.crew = JSON.stringify([]);
			destinyStatus.location = JSON.stringify({ systemId: destinySystem.id });
			destinyStatus.shield = JSON.stringify({ strength: 400, max: 500, coverage: 80 });
			destinyStatus.inventory = JSON.stringify({});
			destinyStatus.unlockedRooms = JSON.stringify([]);
			destinyStatus.crewStatus = JSON.stringify({
				onboard: 12,
				capacity: 100,
				manifest: [],
			});
			destinyStatus.atmosphere = JSON.stringify({
				co2: 0.04,
				o2: 20.9,
				co2Scrubbers: 1,
				o2Scrubbers: 1,
			});
			destinyStatus.weapons = JSON.stringify({
				mainGun: true,
				turrets: { total: 6, working: 3 },
			});
			destinyStatus.shuttles = JSON.stringify({ total: 2, working: 1, damaged: 1 });
			destinyStatus.rooms = JSON.stringify([]);
			destinyStatus.notes = JSON.stringify(['One shuttle is damaged. Some rooms are locked.']);
		});
		console.log('Created Destiny status:', destinyStatus.id);

		console.log('Game creation completed successfully!');

		// TODO: Add more entities (stars, planets, people, technology, etc.) when needed

		return gameId;
	}

	/**
	 * List all games
	 */
	async listGames(): Promise<Game[]> {
		return await this.database
			.get<Game>('games')
			.query()
			.fetch();
	}

	/**
	 * Load game data with all related tables
	 */
	async getGameData(gameId: string): Promise<Record<string, unknown[]>> {
		console.log('Loading game data for gameId:', gameId);

		const tables = [
			'galaxies',
			'star_systems',
			'stars',
			'planets',
			'stargates',
			'chevrons',
			'technology',
			'races',
			'ships',
			'destiny_status',
			'people',
		];
		const result: Record<string, unknown[]> = {};

		for (const table of tables) {
			const records = await this.database
				.get(table)
				.query(Q.where('game_id', gameId))
				.fetch();
			result[table] = records;
			console.log(`Loaded ${records.length} records from ${table}`);
		}

		console.log('Final game data result:', result);
		return result;
	}

	/**
	 * Debug function to check database status
	 */
	async debugDatabaseStatus(): Promise<void> {
		console.log('=== Database Debug Info ===');

		const tables = [
			'games', 'galaxies', 'star_systems', 'stars', 'planets',
			'stargates', 'chevrons', 'technology', 'races', 'ships',
			'destiny_status', 'people', 'rooms',
		];

		for (const table of tables) {
			try {
				const collection = this.database.get(table);
				const count = await collection.query().fetchCount();
				console.log(`Table '${table}': ${count} records`);
			} catch (error) {
				console.error(`Error querying table '${table}':`, error);
			}
		}

		console.log('=== End Database Debug ===');
	}

	async reset() {
		await this.database.write(async () => {
			await this.database.unsafeResetDatabase();
		});
	}

	async sync() {
		return synchronize({
			database: this.database,
			pullChanges: async ({ lastPulledAt }) => {
				/*
				const response = await fetchApi('/sync?last_pulled_at=' + lastPulledAt);

				if (!response.ok) {
					throw new Error(`Server responded with ${response.status}`);
				}

				const { changes, timestamp } = await response.json();
				return { changes, timestamp };
				*/
				return { changes: {}, timestamp: Date.now() };
			},
			pushChanges: async ({ changes, lastPulledAt }) => {
				/*
				const response = await fetchApi('/sync', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						changes,
						last_pulled_at: lastPulledAt,
					}),
				});

				if (!response.ok) {
					throw new Error(`Server responded with ${response.status}`);
				}
				*/
			},
		});
	}
}

