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

		// Query the database for games belonging to this user
		const { results } = await env.DB.prepare(
			'SELECT id, name, createdAt, updatedAt FROM games WHERE userId = ? ORDER BY createdAt DESC',
		).bind(userId).all();

		return new Response(JSON.stringify(results), { status: 200, headers: { 'content-type': 'application/json' } });
	} catch (err: any) {
		console.error('ERROR', err);
		return new Response(JSON.stringify({ error: err.message || 'Invalid request' }), { status: 400, headers: { 'content-type': 'application/json' } });
	}
}
