-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL,
	name TEXT NOT NULL,
	role TEXT NOT NULL,
	race_template_id TEXT,
	skills TEXT NOT NULL,
	description TEXT,
	image TEXT,
	current_room_id TEXT NOT NULL,
	health INTEGER DEFAULT 100,
	hunger INTEGER DEFAULT 100,
	thirst INTEGER DEFAULT 100,
	fatigue INTEGER DEFAULT 100,
	progression TEXT DEFAULT '{"total_experience":0,"current_level":0,"skills":[]}',
	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
