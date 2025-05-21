import { GameSchema } from '@stargate/common/types/game';
import { env, applyD1Migrations } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';

import { Env } from '../types';

import handleCreateGameRequest from './create-game';
import { handleGetGameRequest } from './get-game';

function mockRequest(body?: any) { // Body is now optional and shouldn't contain userId for game operations
	const options: RequestInit = {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
	};
	if (body) {
		options.body = JSON.stringify(body);
	}
	return new Request('http://localhost', options);
}

describe('handleGetGameRequest', () => {
	const authenticatedUserId = 'test-user-get'; // Changed to avoid conflict with create-game.spec.ts
	let gameId: string;

	beforeAll(async () => {
		const testEnv = env as any;
		await applyD1Migrations(testEnv.DB, testEnv.TEST_MIGRATIONS);
		// Ensure user exists
		await testEnv.DB.prepare(
			'INSERT OR IGNORE INTO users (id, email, name, image) VALUES (?, ?, ?, ?)',
		).bind(authenticatedUserId, 'test-get@example.com', 'Test User Get', null).run();

		// Create a new game for this user
		// handleCreateGameRequest now takes authenticatedUserId as a parameter
		const createReq = mockRequest({}); // Empty body for create game, or specific game params if any
		const createRes = await handleCreateGameRequest(createReq, env as Env, authenticatedUserId);
		expect(createRes.status).toBe(200); // Ensure game creation was successful

		// Find the gameId by querying the DB for the game created for authenticatedUserId
		const gameData = await testEnv.DB.prepare(
			'SELECT id FROM games WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
		).bind(authenticatedUserId).first();

		if (!gameData || !gameData.id) {
			throw new Error('Test setup failed: Could not create or find game for user.');
		}
		gameId = gameData.id as string;
	});

	it('returns 200 and a valid game object for an authenticated user and valid gameId', async () => {
		const req = mockRequest({ gameId }); // Body now only contains gameId
		const res = await handleGetGameRequest(req, env as Env, authenticatedUserId);
		expect(res.status).toBe(200);
		const json = await res.json();
		const parsed = GameSchema.safeParse(json);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.galaxies.length).toBeGreaterThan(0);
			expect(parsed.data.starSystems.length).toBeGreaterThan(0);
			expect(parsed.data.people.length).toBeGreaterThan(0);
		}
	});

	it('returns 400 for missing gameId in request body', async () => {
		const req = mockRequest({}); // Missing gameId
		const res = await handleGetGameRequest(req, env as Env, authenticatedUserId);
		expect(res.status).toBe(400);
	});

	it('returns 400 for non-string gameId', async () => {
		const req = mockRequest({ gameId: 123 }); // Invalid gameId type
		const res = await handleGetGameRequest(req, env as Env, authenticatedUserId);
		expect(res.status).toBe(400);
	});

	it('returns 404 for non-existent gameId for the authenticated user', async () => {
		const req = mockRequest({ gameId: 'not-a-real-id' });
		const res = await handleGetGameRequest(req, env as Env, authenticatedUserId);
		expect(res.status).toBe(404); // Or 403/401 if you differentiate not found vs not authorized
	});

	it('returns 404 if gameId belongs to another user', async () => {
		// 1. Create another user
		const anotherUserId = 'another-user-get';
		await (env as Env).DB.prepare(
			'INSERT OR IGNORE INTO users (id, email, name, image) VALUES (?, ?, ?, ?)',
		).bind(anotherUserId, 'another-get@example.com', 'Another User Get', null).run();

		// 2. Create a game for that other user
		const createOtherReq = mockRequest({});
		const createOtherRes = await handleCreateGameRequest(createOtherReq, env as Env, anotherUserId);
		expect(createOtherRes.status).toBe(200);
		const otherGameData = await (env as Env).DB.prepare(
			'SELECT id FROM games WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
		).bind(anotherUserId).first();
		if (!otherGameData || !otherGameData.id) {
			throw new Error('Test setup failed: Could not create game for another user.');
		}
		const otherUserGameId = otherGameData.id as string;

		// 3. Try to fetch the other user's game as the original authenticatedUser
		const req = mockRequest({ gameId: otherUserGameId });
		const res = await handleGetGameRequest(req, env as Env, authenticatedUserId);
		expect(res.status).toBe(404); // Game not found *for this user*
	});
});
