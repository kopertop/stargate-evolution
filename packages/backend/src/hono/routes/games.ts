import { DestinyStatusSchema } from '@stargate/common/models/destiny-status';
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

// All game routes require authentication
games.use('*', verifyJwt);

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

// List all saved games for the authenticated user
games.get('/saves', async (c) => {
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

// Get a specific saved game by ID
games.get('/saves/:id', async (c) => {
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

		const parsed = SavedGameSchema.safeParse(result);
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

// Create a new saved game
games.post('/saves', async (c) => {
	try {
		const user = c.get('user') as User;
		const body = await c.req.json();

		const parsed = CreateSavedGameSchema.safeParse(body);
		if (!parsed.success) {
			return c.json({ error: 'Invalid request body', details: parsed.error }, 400);
		}

		// Generate a unique ID prefixed with user ID
		const gameId = `${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Validate that game_data is valid JSON
		try {
			JSON.parse(parsed.data.game_data);
		} catch {
			return c.json({ error: 'Invalid JSON in game_data' }, 400);
		}

		const stmt = c.env.DB.prepare(`
			INSERT INTO saved_games (id, user_id, name, description, game_data)
			VALUES (?, ?, ?, ?, ?)
		`);

		await stmt.bind(
			gameId,
			user.id,
			parsed.data.name,
			parsed.data.description || null,
			parsed.data.game_data,
		).run();

		// Return the created saved game
		const newGame = await c.env.DB.prepare(`
			SELECT * FROM saved_games WHERE id = ?
		`).bind(gameId).first();

		const newGameParsed = SavedGameSchema.safeParse(newGame);
		if (!newGameParsed.success) {
			console.error('Failed to parse newly created saved game:', newGameParsed.error);
			return c.json({ error: 'Failed to create saved game' }, 500);
		}

		return c.json(newGameParsed.data, 201);
	} catch (error) {
		console.error('Failed to create saved game:', error);
		return c.json({ error: 'Failed to create saved game' }, 500);
	}
});

// Update an existing saved game
games.put('/saves/:id', async (c) => {
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

		// Validate game_data if provided
		if (parsed.data.game_data) {
			try {
				JSON.parse(parsed.data.game_data);
			} catch {
				return c.json({ error: 'Invalid JSON in game_data' }, 400);
			}
		}

		// Build update query dynamically
		const updates = [];
		const values = [];

		if (parsed.data.name) {
			updates.push('name = ?');
			values.push(parsed.data.name);
		}

		if (parsed.data.description !== undefined) {
			updates.push('description = ?');
			values.push(parsed.data.description || null);
		}

		if (parsed.data.game_data) {
			updates.push('game_data = ?');
			values.push(parsed.data.game_data);
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

		const updatedGameParsed = SavedGameSchema.safeParse(updatedGame);
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

// Delete a saved game
games.delete('/saves/:id', async (c) => {
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
