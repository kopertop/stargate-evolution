-- People table
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  race_id TEXT NOT NULL,
  role TEXT NOT NULL,
  location_room_id TEXT,
  location_planet_id TEXT,
  location_ship_id TEXT,
  description TEXT,
  image TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (race_id) REFERENCES races(id),
  FOREIGN KEY (location_room_id) REFERENCES rooms(id),
  FOREIGN KEY (location_planet_id) REFERENCES planets(id),
  FOREIGN KEY (location_ship_id) REFERENCES ships(id)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
