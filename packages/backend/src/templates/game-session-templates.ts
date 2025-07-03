import { D1Database } from '@cloudflare/workers-types';
import { GameSchema, GameType } from '@stargate/common';

export async function saveGameSession(db: D1Database, userId: string, characterId: string, sessionData: GameType): Promise<void> {
	const now = Date.now();
	const serializedData = JSON.stringify(sessionData);

	await db.prepare(
		'INSERT OR REPLACE INTO game_sessions (id, user_id, character_id, session_data, created_at, updated_at) VALUES (?, ?, ?, ?, COALESCE((SELECT created_at FROM game_sessions WHERE id = ?), ?), ?)',
	)
		.bind(characterId, userId, characterId, serializedData, characterId, now, now)
		.run();
}

export async function loadGameSession(db: D1Database, characterId: string): Promise<GameType | null> {
	const result = await db.prepare('SELECT session_data FROM game_sessions WHERE character_id = ?').bind(characterId).first<{ session_data: string }>();

	if (result) {
		const parsedData = JSON.parse(result.session_data);
		const validationResult = GameSchema.safeParse(parsedData);
		
		if (!validationResult.success) {
			console.error('Failed to validate loaded game session data:', validationResult.error);
			return null;
		}
		return validationResult.data;
	}
	return null;
}
