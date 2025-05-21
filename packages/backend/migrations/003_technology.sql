-- Technology table
CREATE TABLE IF NOT EXISTS technology (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  unlocked INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  image TEXT,
  number_on_destiny INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Races table
CREATE TABLE IF NOT EXISTS races (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Ships table
CREATE TABLE IF NOT EXISTS ships (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  name TEXT NOT NULL,
  power REAL NOT NULL,
  max_power REAL NOT NULL,
  shields REAL NOT NULL,
  max_shields REAL NOT NULL,
  hull REAL NOT NULL,
  max_hull REAL NOT NULL,
  race_id TEXT NOT NULL,
  stargate_id TEXT,
  location_system_id TEXT NOT NULL,
  location_planet_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (race_id) REFERENCES races(id),
  FOREIGN KEY (stargate_id) REFERENCES stargates(id),
  FOREIGN KEY (location_system_id) REFERENCES star_systems(id),
  FOREIGN KEY (location_planet_id) REFERENCES planets(id)
);
