import { DestinyStatusSchema } from '@stargate/common/models/destiny-status';
import { GameDataSchema } from '@stargate/common/models/game';
import {
	SavedGameSchema,
	SavedGameListItemSchema,
	CreateSavedGameSchema,
	UpdateSavedGameSchema,
} from '@stargate/common/models/saved-game';
import { Hono } from 'hono';

import type { Env, User } from '../../types';
import { verifyJwt } from '../middleware/auth';

const games = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Only UPDATE operations require authentication
// GET and POST operations can work without authentication (with limited functionality)

// Optional authentication middleware - sets user if token is valid, but doesn't require it
const optionalAuth = async (c: any, next: any) => {
	const authHeader = c.req.header('Authorization');

	if (authHeader && authHeader.startsWith('Bearer ')) {
		const token = authHeader.substring(7);

		try {
			const { jwtVerify } = await import('jose');
			const secret = new TextEncoder().encode(c.env.JWT_SECRET);
			const { payload } = await jwtVerify(token, secret, { issuer: 'stargate-evolution' });

			const { validateUser } = await import('../../auth-types');
			const userResult = validateUser(payload.user);

			if (userResult.success && userResult.data) {
				c.set('user', userResult.data);
				console.log('[OPTIONAL-AUTH] User authenticated:', userResult.data.id);
			} else {
				console.log('[OPTIONAL-AUTH] Invalid user data in token');
			}
		} catch (error) {
			console.log('[OPTIONAL-AUTH] Token verification failed, proceeding without user:', error);
		}
	} else {
		console.log('[OPTIONAL-AUTH] No authorization header, proceeding without user');
	}

	await next();
};

games.get('/status', async (c) => {
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

// ===== SAVED GAMES API =====

// List all saved games for the authenticated user (requires auth)
games.get('/saves', verifyJwt, async (c) => {
	try {
		const user = c.get('user');

		const stmt = c.env.DB.prepare(`
			SELECT id, user_id, name, description, created_at, updated_at
			FROM saved_games
			WHERE user_id = ?
			ORDER BY updated_at DESC
		`);

		const results = await stmt.bind(user.id).all();

		const savedGames = results.results?.map(row => {
			const parsed = SavedGameListItemSchema.safeParse(row);
			if (!parsed.success) {
				console.error('Failed to parse saved game list item:', parsed.error);
				return null;
			}
			return parsed.data;
		}).filter(Boolean) || [];

		return c.json(savedGames);
	} catch (error) {
		console.error('Failed to list saved games:', error);
		return c.json({ error: 'Failed to list saved games' }, 500);
	}
});

// Get a specific saved game by ID (requires auth)
games.get('/saves/:id', verifyJwt, async (c) => {
	try {
		const user = c.get('user');
		const gameId = c.req.param('id');

		const stmt = c.env.DB.prepare(`
			SELECT * FROM saved_games
			WHERE id = ? AND user_id = ?
		`);

		const result = await stmt.bind(gameId, user.id).first();

		if (!result) {
			return c.json({ error: 'Saved game not found' }, 404);
		}

		// Parse the game_data from JSON string to object
		const gameDataParsed = JSON.parse(result.game_data as string);
		const resultWithParsedData = {
			...result,
			game_data: gameDataParsed,
		};

		const parsed = SavedGameSchema.safeParse(resultWithParsedData);
		if (!parsed.success) {
			console.error('Failed to parse saved game:', parsed.error);
			return c.json({ error: 'Failed to parse saved game' }, 500);
		}

		return c.json(parsed.data);
	} catch (error) {
		console.error('Failed to get saved game:', error);
		return c.json({ error: 'Failed to get saved game' }, 500);
	}
});

// Create a new saved game (works with or without auth)
games.post('/saves', optionalAuth, async (c) => {
	try {
		const user = c.get('user') as User | undefined;
		const body = await c.req.json();

		console.log('[GAMES] POST /saves - User:', user ? `${user.id} (${user.email})` : 'none');
		console.log('[GAMES] POST /saves - Auth header:', c.req.header('Authorization') ? 'present' : 'none');

		const parsed = CreateSavedGameSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: 'Invalid request body', details: parsed.error }, 400);
		}

		// Validate the GameData object with Zod
		const gameDataValidation = GameDataSchema.safeParse(parsed.data.game_data);
		if (!gameDataValidation.success) {
			return c.json({
				error: 'Invalid game data structure',
				details: gameDataValidation.error,
			}, 400);
		}

		if (user) {
			// Authenticated user - save to database
			console.log('[GAMES] Creating authenticated game for user:', user.id);

			// Generate a unique ID prefixed with user ID
			const gameId = `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Stringify the validated GameData for database storage
			const gameDataString = JSON.stringify(parsed.data.game_data);

			const stmt = c.env.DB.prepare(`
				INSERT INTO saved_games (id, user_id, name, description, game_data)
				VALUES (?, ?, ?, ?, ?)
			`);

			await stmt.bind(
				gameId,
				user.id,
				parsed.data.name,
				parsed.data.description || null,
				gameDataString,
			).run();

			// Return the created saved game
			const newGame = await c.env.DB.prepare(`
				SELECT * FROM saved_games WHERE id = ?
			`).bind(gameId).first();

			// Parse the game_data from JSON string to object for response
			const gameDataParsed = JSON.parse(newGame!.game_data as string);
			const newGameWithParsedData = {
				...newGame,
				game_data: gameDataParsed,
			};

			const newGameParsed = SavedGameSchema.safeParse(newGameWithParsedData);
			if (!newGameParsed.success) {
				console.error('Failed to parse newly created saved game:', newGameParsed.error);
				return c.json({ error: 'Failed to create saved game' }, 500);
			}

			return c.json(newGameParsed.data, 201);
		} else {
			// Unauthenticated user - return fake game data without saving to database
			console.log('[GAMES] Creating unauthenticated game (local only)');

			// Generate a local-only game ID
			const gameId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Create a fake saved game response that matches the schema
			const fakeGame = {
				id: gameId,
				user_id: 'local_user',
				name: parsed.data.name,
				description: parsed.data.description || null,
				game_data: parsed.data.game_data,
				created_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000),
			};

			const fakeGameParsed = SavedGameSchema.safeParse(fakeGame);
			if (!fakeGameParsed.success) {
				console.error('Failed to parse fake saved game:', fakeGameParsed.error);
				return c.json({ error: 'Failed to create local game' }, 500);
			}

			return c.json(fakeGameParsed.data, 201);
		}
	} catch (error) {
		console.error('Failed to create saved game:', error);
		return c.json({ error: 'Failed to create saved game' }, 500);
	}
});

// Update an existing saved game (requires auth)
games.put('/saves/:id', verifyJwt, async (c) => {
	try {
		const user = c.get('user') as User;
		const gameId = c.req.param('id');
		const body = await c.req.json();

		const parsed = UpdateSavedGameSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: 'Invalid request body', details: parsed.error }, 400);
		}

		// Check if the saved game exists and belongs to the user
		const existingGame = await c.env.DB.prepare(`
			SELECT id FROM saved_games WHERE id = ? AND user_id = ?
		`).bind(gameId, user.id).first();

		if (!existingGame) {
			return c.json({ error: 'Saved game not found' }, 404);
		}

		// Build update query dynamically
		const updates = [];
		const values = [];

		// Validate and process game_data if provided
		if (parsed.data.game_data) {
			const gameDataValidation = GameDataSchema.safeParse(parsed.data.game_data);
			if (!gameDataValidation.success) {
				return c.json({
					error: 'Invalid game data structure',
					details: gameDataValidation.error,
				}, 400);
			}

			// Extract current_time for game_time field if it exists
			if (parsed.data.game_data.destinyStatus?.current_time) {
				updates.push('game_time = ?');
				values.push(parsed.data.game_data.destinyStatus.current_time);
			}

			// Stringify the validated GameData for database storage
			updates.push('game_data = ?');
			values.push(JSON.stringify(parsed.data.game_data));
		}

		if (parsed.data.name) {
			updates.push('name = ?');
			values.push(parsed.data.name);
		}

		if (parsed.data.description !== undefined) {
			updates.push('description = ?');
			values.push(parsed.data.description || null);
		}

		if (updates.length === 0) {
			return c.json({ error: 'No fields to update' }, 400);
		}

		updates.push('updated_at = strftime(\'%s\',\'now\')');
		values.push(gameId, user.id);

		const stmt = c.env.DB.prepare(`
			UPDATE saved_games
			SET ${updates.join(', ')}
			WHERE id = ? AND user_id = ?
		`);

		await stmt.bind(...values).run();

		// Return the updated saved game
		const updatedGame = await c.env.DB.prepare(`
			SELECT * FROM saved_games WHERE id = ?
		`).bind(gameId).first();

		// Parse the game_data from JSON string to object for response
		const gameDataParsed = JSON.parse(updatedGame!.game_data as string);
		const updatedGameWithParsedData = {
			...updatedGame,
			game_data: gameDataParsed,
		};

		const updatedGameParsed = SavedGameSchema.safeParse(updatedGameWithParsedData);
		if (!updatedGameParsed.success) {
			console.error('Failed to parse updated saved game:', updatedGameParsed.error);
			return c.json({ error: 'Failed to update saved game' }, 500);
		}

		return c.json(updatedGameParsed.data);
	} catch (error) {
		console.error('Failed to update saved game:', error);
		return c.json({ error: 'Failed to update saved game' }, 500);
	}
});

// Delete a saved game (requires auth)
games.delete('/saves/:id', verifyJwt, async (c) => {
	try {
		const user = c.get('user');
		const gameId = c.req.param('id');

		// Check if the saved game exists and belongs to the user
		const existingGame = await c.env.DB.prepare(`
			SELECT id FROM saved_games WHERE id = ? AND user_id = ?
		`).bind(gameId, user.id).first();

		if (!existingGame) {
			return c.json({ error: 'Saved game not found' }, 404);
		}

		const stmt = c.env.DB.prepare(`
			DELETE FROM saved_games WHERE id = ? AND user_id = ?
		`);

		await stmt.bind(gameId, user.id).run();

		return c.json({ message: 'Saved game deleted successfully' });
	} catch (error) {
		console.error('Failed to delete saved game:', error);
		return c.json({ error: 'Failed to delete saved game' }, 500);
	}
});

export default games;
