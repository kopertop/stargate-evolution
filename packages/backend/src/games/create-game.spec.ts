import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

import { Env } from '../types';

import handleCreateGameRequest, { initGame } from './create-game';

function mockRequest(body: any) {
	return new Request('http://localhost', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'content-type': 'application/json' },
	});
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
		await testEnv.DB.prepare(
			'INSERT INTO users (id, email, name, image) VALUES (?, ?, ?, ?)',
		).bind('test-user', 'test@example.com', 'Test User', null).run();
	});
	it('returns 200 and valid game JSON for valid userId', async () => {
		const req = mockRequest({ userId: 'test-user' });
		const res = await handleCreateGameRequest(req, env as Env);
		expect(res.status).toBe(200);
		const json = await res.json() as any;
		expect(json.galaxies).toBeDefined();
	});
	it('returns 400 for missing userId', async () => {
		const req = mockRequest({ });
		const res = await handleCreateGameRequest(req, env as Env);
		expect(res.status).toBe(400);
	});
	it('returns 400 for non-string userId', async () => {
		const req = mockRequest({ userId: 123 });
		const res = await handleCreateGameRequest(req, env as Env);
		expect(res.status).toBe(400);
	});
});
