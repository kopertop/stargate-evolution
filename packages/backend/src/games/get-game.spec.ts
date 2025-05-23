import { GameSchema } from '@stargate/common/types/game';
import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

import { Env } from '../types';

import { handleGetGameRequest } from './get-game';

function mockRequest(body: any) {
	return new Request('http://localhost', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'content-type': 'application/json' },
	});
}

describe('handleGetGameRequest', () => {
	const userId = 'test-user';
	let gameId: string;

	beforeAll(async () => {
		const testEnv = env as any;
		await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
		await testEnv.DB.prepare(
			'INSERT INTO users (id, email, name, image) VALUES (?, ?, ?, ?)',
		).bind(userId, 'test@example.com', 'Test User', null).run();

		// Create test game data directly
		gameId = 'test-game-id';
		const now = Date.now();
		await testEnv.DB.prepare(
			'INSERT INTO games (id, userId, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
		).bind(gameId, userId, 'Test Game', now, now).run();

		// Create minimal test galaxy data
		await testEnv.DB.prepare(
			'INSERT INTO galaxies (id, gameId, name, x, y, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
		).bind('test-galaxy-id', gameId, 'Test Galaxy', 0, 0, now).run();
	});

	it('returns 200 and a valid game object for valid userId/gameId', async () => {
		const req = mockRequest({ userId, gameId });
		const res = await handleGetGameRequest(req, env as Env);
		expect(res.status).toBe(200);
		const json = await res.json();
		const parsed = GameSchema.safeParse(json);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			// Check some important fields
			expect(parsed.data.galaxies.length).toBeGreaterThan(0);
			expect(parsed.data.starSystems.length).toBeGreaterThan(0);
			expect(parsed.data.people.length).toBeGreaterThan(0);
		}
	});

	it('returns 400 for missing userId/gameId', async () => {
		const req = mockRequest({ userId });
		const res = await handleGetGameRequest(req, env as Env);
		expect(res.status).toBe(400);
	});

	it('returns 400 for non-string userId/gameId', async () => {
		const req = mockRequest({ userId: 123, gameId: 456 });
		const res = await handleGetGameRequest(req, env as Env);
		expect(res.status).toBe(400);
	});

	it('returns 404 for non-existent gameId', async () => {
		const req = mockRequest({ userId, gameId: 'not-a-real-id' });
		const res = await handleGetGameRequest(req, env as Env);
		expect(res.status).toBe(404);
	});
});
