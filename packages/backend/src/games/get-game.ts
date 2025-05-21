import { normalizeGameFromDb } from '@stargate/common/normalize/normalize-game-from-db';
import { GameSchema } from '@stargate/common/types/game';
import { GetGameRequestSchema } from '@stargate/common/types/game-requests';

import type { Env } from '../types';

/**
 * Get a single game for a user
 */
export async function handleGetGameRequest(request: Request, env: Env): Promise<Response> {
	try {
		const body = await request.json();
		const parsed = GetGameRequestSchema.safeParse(body);
		if (!parsed.success) {
			return new Response(JSON.stringify({ error: 'Invalid request body', details: parsed.error.errors }), { status: 400, headers: { 'content-type': 'application/json' } });
		}
		const { userId, gameId } = parsed.data;
		// Check that the game exists and belongs to the user
		const gameRow = await env.DB.prepare(
			'SELECT * FROM games WHERE id = ? AND user_id = ?',
		).bind(gameId, userId).first();
		if (!gameRow) {
			return new Response(JSON.stringify({ error: 'Game not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
		}
		// Fetch all top-level arrays in parallel
		const [
			galaxies,
			starSystems,
			stars,
			planets,
			stargates,
			chevrons,
			technology,
			races,
			ships,
			rooms,
			people,
		] = await Promise.all([
			env.DB.prepare('SELECT * FROM galaxies WHERE game_id = ?').bind(gameId).all().then(r => r.results),
			env.DB.prepare('SELECT * FROM star_systems WHERE game_id = ?').bind(gameId).all().then(r => r.results),
			env.DB.prepare('SELECT * FROM stars WHERE game_id = ?').bind(gameId).all().then(r => r.results),
			env.DB.prepare('SELECT * FROM planets WHERE game_id = ?').bind(gameId).all().then(r => r.results),
			env.DB.prepare('SELECT * FROM stargates WHERE game_id = ?').bind(gameId).all().then(r => r.results),
			env.DB.prepare('SELECT * FROM chevrons WHERE game_id = ?').bind(gameId).all().then(r => r.results),
			env.DB.prepare('SELECT * FROM technology WHERE game_id = ?').bind(gameId).all().then(r => r.results),
			env.DB.prepare('SELECT * FROM races WHERE game_id = ?').bind(gameId).all().then(r => r.results),
			env.DB.prepare('SELECT * FROM ships WHERE game_id = ?').bind(gameId).all().then(r => r.results),
			env.DB.prepare('SELECT * FROM rooms WHERE game_id = ?').bind(gameId).all().then(r => r.results),
			env.DB.prepare('SELECT * FROM people WHERE game_id = ?').bind(gameId).all().then(r => r.results),
		]);
		const game = normalizeGameFromDb({
			galaxies,
			starSystems,
			stars,
			planets,
			stargates,
			chevrons,
			technology,
			races,
			ships,
			rooms,
			people,
		});
		// Validate before returning
		const valid = GameSchema.safeParse(game);
		if (!valid.success) {
			console.error('GameSchema validation error:', JSON.stringify(valid.error, null, 2));
			console.error('Returned game object:', JSON.stringify(game, null, 2));
			return new Response(JSON.stringify({ error: 'Corrupt game data', details: valid.error.errors }), { status: 500, headers: { 'content-type': 'application/json' } });
		}
		// First, set all games for the user to not current
		await env.DB.prepare('UPDATE games SET current = 0 WHERE user_id = ?').bind(userId).run();
		// Then, set the selected game as current and update last_played
		await env.DB.prepare('UPDATE games SET current = 1, last_played = ? WHERE id = ? AND user_id = ?')
			.bind(Date.now(), gameId, userId).run();
		return new Response(JSON.stringify(game), { status: 200, headers: { 'content-type': 'application/json' } });
	} catch (err: any) {
		console.error('ERROR', err);
		return new Response(JSON.stringify({ error: err.message || 'Invalid request' }), { status: 400, headers: { 'content-type': 'application/json' } });
	}
}
