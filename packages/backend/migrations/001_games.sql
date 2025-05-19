-- Users table (must exist before games for FK)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Games table: Each game belongs to a user and is the root for all game data
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  current INTEGER NOT NULL DEFAULT 0, -- 1 if this is the user's current game
  last_played INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ensure only one current game per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_user_current ON games(user_id) WHERE current = 1;
