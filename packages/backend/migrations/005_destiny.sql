-- Destiny Status table
CREATE TABLE IF NOT EXISTS destiny_status (
  id TEXT PRIMARY KEY, -- usually the ship id or a unique id
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  power REAL NOT NULL,
  max_power REAL NOT NULL,
  shields REAL NOT NULL,
  max_shields REAL NOT NULL,
  hull REAL NOT NULL,
  max_hull REAL NOT NULL,
  race_id TEXT NOT NULL,
  rooms_json TEXT NOT NULL, -- JSON string
  crew_json TEXT NOT NULL, -- JSON string
  location_json TEXT NOT NULL, -- JSON string
  stargate TEXT,
  shield_strength REAL NOT NULL,
  shield_max REAL NOT NULL,
  shield_coverage REAL NOT NULL,
  inventory_json TEXT NOT NULL, -- JSON string
  unlocked_rooms_json TEXT NOT NULL, -- JSON string
  crew_status_json TEXT NOT NULL, -- JSON string
  co2 REAL NOT NULL,
  o2 REAL NOT NULL,
  co2_scrubbers INTEGER NOT NULL,
  o2_scrubbers INTEGER NOT NULL,
  weapons_main_gun INTEGER NOT NULL, -- 0/1
  weapons_turrets_total INTEGER NOT NULL,
  weapons_turrets_working INTEGER NOT NULL,
  shuttles_total INTEGER NOT NULL,
  shuttles_working INTEGER NOT NULL,
  shuttles_damaged INTEGER NOT NULL,
  notes_json TEXT, -- JSON string (optional)
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  unit TEXT,
  description TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);