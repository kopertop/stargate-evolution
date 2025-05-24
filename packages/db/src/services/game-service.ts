import { Database, Q } from '@nozbe/watermelondb';

import Galaxy from '../models/galaxy';
import Game from '../models/game';

export class GameService {
	constructor(private database: Database) { }

	/**
	 * Create a new game with all initial data
	 */
	async createNewGame(): Promise<string> {
		return await this.database.write(async () => {
			// Create the game record first and let WatermelonDB generate the ID
			const game = await this.database.get<Game>('games').create((gameRecord) => {
				gameRecord.name = 'New Stargate Game';
			});

			const gameId = game.id;

			// Create galaxies using proper WatermelonDB methods
			await this.database.get<Galaxy>('galaxies').create((galaxy) => {
				galaxy.gameId = gameId;
				galaxy.name = 'Milky Way';
				galaxy.x = 0;
				galaxy.y = 0;
			});

			await this.database.get<Galaxy>('galaxies').create((galaxy) => {
				galaxy.gameId = gameId;
				galaxy.name = 'JADES-GS-z14-0';
				galaxy.x = 1000;
				galaxy.y = 0;
			});

			// TODO: Add other entities when their models are available
			// For now, we only create the game and galaxies since these are the only
			// models currently imported in the database configuration

			return gameId;
		});
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
			result[table] = await this.database
				.get(table)
				.query(Q.where('game_id', gameId))
				.fetch();
		}
		return result;
	}
}

