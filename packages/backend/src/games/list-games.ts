import { ListGamesRequestSchema } from '@stargate/common/types/game-requests';

import type { Env } from '../types';

/**
 * List all games for a user
 */
export async function handleListGamesRequest(request: Request, env: Env): Promise<Response> {
	try {
		const body = await request.json();
		const parsed = ListGamesRequestSchema.safeParse(body);
		if (!parsed.success) {
			return new Response(JSON.stringify({ error: 'Invalid request body', details: parsed.error.errors }), { status: 400, headers: { 'content-type': 'application/json' } });
		}
		const { userId } = parsed.data;
		const games = await env.DB.prepare(
			'SELECT id, name, created_at, updated_at, last_played, current FROM games WHERE user_id = ? ORDER BY created_at DESC',
		).bind(userId).all();
		return new Response(JSON.stringify(games.results), { status: 200, headers: { 'content-type': 'application/json' } });
	} catch (err: any) {
		console.error('ERROR', err);
		return new Response(JSON.stringify({ error: err.message || 'Invalid request' }), { status: 400, headers: { 'content-type': 'application/json' } });
	}
}
