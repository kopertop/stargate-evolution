-- Technology table
CREATE TABLE IF NOT EXISTS technology (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  unlocked INTEGER NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  image TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Races table
CREATE TABLE IF NOT EXISTS races (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Ships table
CREATE TABLE IF NOT EXISTS ships (
  id TEXT PRIMARY KEY,
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
  FOREIGN KEY (race_id) REFERENCES races(id),
  FOREIGN KEY (stargate_id) REFERENCES stargates(id),
  FOREIGN KEY (location_system_id) REFERENCES star_systems(id),
  FOREIGN KEY (location_planet_id) REFERENCES planets(id)
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  ship_id TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE
);

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  unit TEXT,
  description TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
