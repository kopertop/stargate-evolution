import { ListGamesRequestSchema } from '@stargate/common/types/game-requests';

import type { Env } from '../types';

/**
 * List all games for a user
 */
export async function handleListGamesRequest(request: Request, env: Env, authenticatedUserId: string): Promise<Response> {
	try {
		// const body = await request.json(); // Body might be empty or have other fields
		// const parsed = ListGamesRequestSchema.safeParse(body); // Schema is now empty or for other fields
		// if (!parsed.success) {
		// 	return new Response(JSON.stringify({ error: 'Invalid request body', details: parsed.error.errors }), { status: 400, headers: { 'content-type': 'application/json' } });
		// }
		// userId is now passed as authenticatedUserId
		const games = await env.DB.prepare(
			'SELECT id, name, created_at, updated_at, last_played, current FROM games WHERE user_id = ? ORDER BY created_at DESC',
		).bind(authenticatedUserId).all(); // Use authenticatedUserId
		return new Response(JSON.stringify(games.results), { status: 200, headers: { 'content-type': 'application/json' } });
	} catch (err: any) {
		console.error('ERROR', err);
		return new Response(JSON.stringify({ error: err.message || 'Invalid request' }), { status: 400, headers: { 'content-type': 'application/json' } });
	}
}
