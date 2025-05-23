import { Sequelize } from 'sequelize-typescript';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { CheveronSymbol } from '../cheveron-symbol';
import { DestinyStatus } from '../destiny-status';
import { Galaxy } from '../galaxy';
import { Game } from '../game';
import { Person } from '../person';
import { Planet } from '../planet';
import { Race } from '../race';
import { Room } from '../room';
import { Ship } from '../ship';
import { Star } from '../star';
import { StarSystem } from '../star-system';
import { Stargate } from '../stargate';
import { Technology } from '../technology';


const ALL_MODELS = [
	Game, Galaxy, StarSystem, Star, Planet, Person, Technology, Race, Ship, Stargate, CheveronSymbol, Room, DestinyStatus,
];

describe('Sequelize Models', () => {
	let sequelize: Sequelize;

	beforeAll(async () => {
		sequelize = new Sequelize({
			dialect: 'sqlite',
			storage: ':memory:',
			logging: false,
			models: ALL_MODELS,
		});
		await sequelize.sync({ force: true });
	});

	afterAll(async () => {
		await sequelize.close();
	});

	it('should sync all models without error', async () => {
		// If sync in beforeAll passes, this test passes
		expect(true).toBe(true);
	});

	it('should create and retrieve a Game', async () => {
		const game = await Game.create({
			id: 'game1',
			userId: 'user1',
			name: 'Test Game',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const found = await Game.findByPk('game1');
		expect(found).toBeTruthy();
		expect(found!.name).toBe('Test Game');
	});

	it('should create a Galaxy and associate with Game', async () => {
		const game = await Game.create({
			id: 'game2',
			userId: 'user2',
			name: 'Galaxy Game',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		const galaxy = await Galaxy.create({
			id: 'galaxy1',
			name: 'Milky Way',
			x: 0,
			y: 0,
			gameId: 'game2',
			createdAt: new Date(),
		});
		const found = await Galaxy.findByPk('galaxy1');
		expect(found).toBeTruthy();
		const gameAssoc = await found!.$get('game');
		expect(gameAssoc).toBeTruthy();
		expect(gameAssoc!.id).toBe('game2');
	});

	// Add more tests for other models as needed (basic create/find)
});
