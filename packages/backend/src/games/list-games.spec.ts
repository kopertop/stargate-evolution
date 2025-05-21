import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

import { Env } from '../types';
import handleCreateGameRequest from './create-game';
import { handleListGamesRequest } from './list-games';

// mockRequest function - since handleListGamesRequest doesn't expect a body,
// we can simplify this. It still needs to be a valid Request object.
function mockRequest() {
	return new Request('http://localhost/api/games/list', {
		method: 'POST', // Assuming POST as per current setup in index.ts for list
		headers: { 'content-type': 'application/json' },
		// No body needed for list operation as per new design
	});
}

describe('handleListGamesRequest', () => {
	const userAId = 'test-user-A-list';
	const userBId = 'test-user-B-list';
	const userCId = 'test-user-C-list';

	// Store game names or IDs if needed for more specific checks
	const userAGameNames: string[] = [];
	const userBGameNames: string[] = [];

	beforeAll(async () => {
		const testEnv = env as Env;
		await applyD1Migrations(testEnv.DB, (testEnv as any).TEST_MIGRATIONS);

		// Insert users
		await testEnv.DB.batch([
			testEnv.DB.prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)')
				.bind(userAId, 'userA-list@example.com', 'User A List'),
			testEnv.DB.prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)')
				.bind(userBId, 'userB-list@example.com', 'User B List'),
			testEnv.DB.prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)')
				.bind(userCId, 'userC-list@example.com', 'User C List'),
		]);

		// Create games for userA
		const gameA1Res = await handleCreateGameRequest(new Request('http://localhost', { method: 'POST' }), testEnv, userAId);
		expect(gameA1Res.status, 'Game A1 creation failed').toBe(200);
		const gameA1Json = await gameA1Res.json() as any;
		userAGameNames.push(gameA1Json.galaxies[0]?.name || 'New Game');


		const gameA2Res = await handleCreateGameRequest(new Request('http://localhost', { method: 'POST' }), testEnv, userAId);
		expect(gameA2Res.status, 'Game A2 creation failed').toBe(200);
		const gameA2Json = await gameA2Res.json() as any;
		userAGameNames.push(gameA2Json.galaxies[0]?.name || 'New Game');

		// Create games for userB
		const gameB1Res = await handleCreateGameRequest(new Request('http://localhost', { method: 'POST' }), testEnv, userBId);
		expect(gameB1Res.status, 'Game B1 creation failed').toBe(200);
		const gameB1Json = await gameB1Res.json() as any;
		userBGameNames.push(gameB1Json.galaxies[0]?.name || 'New Game');
	});

	it('should list games for userA and not include userB games', async () => {
		const req = mockRequest();
		const res = await handleListGamesRequest(req, env as Env, userAId);
		expect(res.status).toBe(200);

		const games = await res.json() as any[];
		expect(games).toBeInstanceOf(Array);
		expect(games.length).toBe(userAGameNames.length); // Should be 2

		// Verify game properties and that they belong to userA
		games.forEach(game => {
			expect(game).toHaveProperty('id');
			expect(game).toHaveProperty('name');
			expect(game).toHaveProperty('created_at');
			expect(game).toHaveProperty('updated_at');
			// last_played and current can be null or have values
			expect(game).toHaveProperty('last_played');
			expect(game).toHaveProperty('current');

			// Check if the game name is one of userA's game names
			expect(userAGameNames).toContain(game.name);
			// Ensure no userB games are present
			expect(userBGameNames).not.toContain(game.name);
		});

		// Additional check: query DB directly to ensure games table user_id is correct for these games
		for (const game of games) {
			const dbGame = await (env as Env).DB.prepare('SELECT user_id FROM games WHERE id = ?').bind(game.id).first();
			expect(dbGame?.user_id).toBe(userAId);
		}
	});

	it('should list games for userB and not include userA games', async () => {
		const req = mockRequest();
		const res = await handleListGamesRequest(req, env as Env, userBId);
		expect(res.status).toBe(200);

		const games = await res.json() as any[];
		expect(games).toBeInstanceOf(Array);
		expect(games.length).toBe(userBGameNames.length); // Should be 1

		games.forEach(game => {
			expect(userBGameNames).toContain(game.name);
			expect(userAGameNames).not.toContain(game.name);
		});

		for (const game of games) {
			const dbGame = await (env as Env).DB.prepare('SELECT user_id FROM games WHERE id = ?').bind(game.id).first();
			expect(dbGame?.user_id).toBe(userBId);
		}
	});

	it('should return an empty array for a user with no games (userC)', async () => {
		const req = mockRequest();
		const res = await handleListGamesRequest(req, env as Env, userCId);
		expect(res.status).toBe(200);

		const games = await res.json() as any[];
		expect(games).toBeInstanceOf(Array);
		expect(games.length).toBe(0);
	});
});
