-- Create saved_games table for save/load functionality
CREATE TABLE IF NOT EXISTS saved_games (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	game_time INTEGER DEFAULT 0,
	name TEXT NOT NULL,
	description TEXT,
	game_data TEXT NOT NULL, -- JSON blob containing complete game state
	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_games_user_id ON saved_games(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_games_created_at ON saved_games(created_at);
