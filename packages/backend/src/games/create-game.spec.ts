import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

import { Env } from '../types';

import handleCreateGameRequest, { initGame } from './create-game';

function mockRequest(body?: any) { // body is now optional
	const options: RequestInit = {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
	};
	if (body) {
		options.body = JSON.stringify(body);
	}
	return new Request('http://localhost', options);
}

describe('initGame', () => {
	it('returns a valid scaffolded game object', () => {
		const userId = 'test-user';
		const game = initGame(userId);
		expect(game).toBeDefined();
		expect(Array.isArray(game.galaxies)).toBe(true);
		expect(Array.isArray(game.starSystems)).toBe(true);
		expect(Array.isArray(game.stars)).toBe(true);
		expect(Array.isArray(game.planets)).toBe(true);
		expect(Array.isArray(game.stargates)).toBe(true);
		expect(Array.isArray(game.chevrons)).toBe(true);
		expect(Array.isArray(game.technology)).toBe(true);
		expect(Array.isArray(game.races)).toBe(true);
		expect(Array.isArray(game.ships)).toBe(true);
		expect(Array.isArray(game.rooms)).toBe(true);
		expect(Array.isArray(game.people)).toBe(true);
		const existingIDs = new Set();
		// Check that all IDs are strings (ULIDs)
		for (const arr of [game.galaxies, game.starSystems, game.stars, game.planets, game.stargates, game.chevrons, game.technology, game.races, game.ships, game.rooms, game.people]) {
			for (const obj of arr) {
				expect(typeof obj.id === 'string').toBe(true);
				expect(obj.id.length).toBe(26);
				// Make sure no ID is repeated
				expect(existingIDs.has(obj.id)).toBe(false);
				existingIDs.add(obj.id);
			}
		}
	});
});

describe('handleCreateGameRequest', () => {
	beforeAll(async () => {
		const testEnv = env as any;
		await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
		// Ensure the test user exists for other tests that might depend on it
		await testEnv.DB.prepare(
			'INSERT OR IGNORE INTO users (id, email, name, image) VALUES (?, ?, ?, ?)',
		).bind('test-user', 'test@example.com', 'Test User', null).run();
	});
	it('returns 200 and valid game JSON for an authenticated user', async () => {
		const req = mockRequest(); // No body needed, or an empty object: mockRequest({})
		const authenticatedUserId = 'test-user';
		const res = await handleCreateGameRequest(req, env as Env, authenticatedUserId);
		expect(res.status).toBe(200);
		const json = await res.json() as any;
		expect(json.galaxies).toBeDefined();

		// Verify the game was created in the DB for the correct user
		const gameInDb = await (env as Env).DB.prepare(
			'SELECT * FROM games WHERE user_id = ?',
		).bind(authenticatedUserId).first();
		expect(gameInDb).toBeDefined();
		expect(gameInDb?.user_id).toBe(authenticatedUserId);
	});

	// Tests for missing or invalid userId in the body are no longer relevant
	// as userId is now passed as a parameter from an authenticated session.
	// The getAuthenticatedUser function handles unauthorized access,
	// which would be tested in index.spec.ts or similar integration tests.
	// For handleCreateGameRequest unit tests, we assume authentication was successful.

	// Example: Test if game creation fails if authenticatedUserId is somehow invalid
	// (though this scenario might be better covered by auth middleware tests)
	// it('handles error if authenticatedUserId is invalid (e.g., not in DB - though FK constraint handles this)', async () => {
	// 	const req = mockRequest();
	// 	const invalidUserId = 'non-existent-user';
	// 	// Depending on DB setup, this might throw due to foreign key constraint
	// 	// or the handler might catch it if it tries to verify user existence.
	// 	// For this specific handler, it tries an INSERT OR IGNORE for the user,
	// 	// so it might still proceed, or fail at game insertion if user_id is critical.
	// 	// The current saveGame function would INSERT OR IGNORE the user, then try to insert the game.
	// 	// If the user_id in the games table has a foreign key to users.id, it would fail there.
	// 	try {
	// 		const res = await handleCreateGameRequest(req, env as Env, invalidUserId);
	// 		// Check if the response indicates an error, e.g. 500 if DB constraint fails
	// 		expect(res.status).toBeGreaterThanOrEqual(400);
	// 	} catch (e) {
	// 		// If it throws an error (like from D1)
	// 		expect(e).toBeDefined();
	// 	}
	// });
});
