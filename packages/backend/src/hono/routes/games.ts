import { DestinyStatusSchema } from '@stargate/common/models/destiny-status';
import { Hono } from 'hono';

import type { Env } from '../../types';
import { verifyJwt } from '../middleware/auth';

const games = new Hono<{ Bindings: Env }>();

// All game routes require authentication
games.use('/api/games/*', verifyJwt);

games.get('/api/games/status', async (c) => {
	try {
		// For now, this fetches the global destiny status.
		// Later, this could be adapted to fetch status for a specific game session.
		const result = await c.env.DB.prepare('SELECT * FROM destiny_status LIMIT 1').first();

		if (!result) {
			return c.json({ error: 'Game status not found' }, 404);
		}

		const parsedStatus = DestinyStatusSchema.safeParse(result);
		if (!parsedStatus.success) {
			console.error('Failed to parse game status from DB:', parsedStatus.error);
			return c.json({ error: 'Failed to parse game status' }, 500);
		}

		return c.json(parsedStatus.data);
	} catch (error) {
		console.error('Failed to fetch game status:', error);
		return c.json({ error: 'Failed to fetch game status' }, 500);
	}
});

// We will add routes for starting, saving, and loading games here later.

export default games;
