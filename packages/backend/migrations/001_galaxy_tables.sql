-- Galaxies table
CREATE TABLE IF NOT EXISTS galaxies (
  id TEXT PRIMARY KEY, -- seed or unique id
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Star Systems table
CREATE TABLE IF NOT EXISTS star_systems (
  id TEXT PRIMARY KEY,
  galaxy_id TEXT NOT NULL,
  name TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  description TEXT,
  image TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (galaxy_id) REFERENCES galaxies(id) ON DELETE CASCADE
);

-- Stars table
CREATE TABLE IF NOT EXISTS stars (
  id TEXT PRIMARY KEY,
  star_system_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., yellow dwarf, red giant
  description TEXT,
  image TEXT,
  radius REAL,
  mass REAL,
  temperature REAL,
  luminosity REAL,
  age REAL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (star_system_id) REFERENCES star_systems(id) ON DELETE CASCADE
);

-- Planets table
CREATE TABLE IF NOT EXISTS planets (
  id TEXT PRIMARY KEY,
  star_system_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  stargate_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (star_system_id) REFERENCES star_systems(id) ON DELETE CASCADE,
  FOREIGN KEY (stargate_id) REFERENCES stargates(id)
);

-- Stargates table
CREATE TABLE IF NOT EXISTS stargates (
  id TEXT PRIMARY KEY,
  location_type TEXT NOT NULL, -- 'planet', 'ship', 'room', 'star_system'
  location_id TEXT NOT NULL,   -- id of the location
  type TEXT NOT NULL,          -- 'planetary', 'ship', 'master'
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Chevrons table
CREATE TABLE IF NOT EXISTS chevrons (
  id TEXT PRIMARY KEY,
  stargate_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  image TEXT,
  position INTEGER NOT NULL, -- 0-5 for address
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (stargate_id) REFERENCES stargates(id) ON DELETE CASCADE
);
