-- Auto-generated D1 schema from Sequelize models
-- Generated at: 2025-05-23T16:31:05.329Z
-- WARNING: This file is auto-generated. Do not edit manually.

-- Users table (required for foreign keys)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  image TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Table: games
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  userId TEXT,
  name TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  updatedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_games_createdAt ON games(createdAt);

-- Table: chevrons
CREATE TABLE IF NOT EXISTS chevrons (
  id TEXT PRIMARY KEY,
  symbol TEXT,
  stargateId TEXT,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (stargateId) REFERENCES stargates(id) ON DELETE CASCADE,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chevrons_stargateId ON chevrons(stargateId);
CREATE INDEX IF NOT EXISTS idx_chevrons_gameId ON chevrons(gameId);
CREATE INDEX IF NOT EXISTS idx_chevrons_createdAt ON chevrons(createdAt);

-- Table: destiny_status
CREATE TABLE IF NOT EXISTS destiny_status (
  id TEXT PRIMARY KEY,
  name TEXT,
  power INTEGER,
  maxPower INTEGER,
  shields INTEGER,
  maxShields INTEGER,
  hull INTEGER,
  maxHull INTEGER,
  raceId TEXT,
  crew TEXT,
  location TEXT,
  shield TEXT,
  inventory TEXT,
  unlockedRooms TEXT,
  crewStatus TEXT,
  atmosphere TEXT,
  weapons TEXT,
  shuttles TEXT,
  rooms TEXT,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_destiny_status_gameId ON destiny_status(gameId);
CREATE INDEX IF NOT EXISTS idx_destiny_status_createdAt ON destiny_status(createdAt);

-- Table: galaxies
CREATE TABLE IF NOT EXISTS galaxies (
  id TEXT PRIMARY KEY,
  name TEXT,
  x REAL,
  y REAL,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_galaxies_gameId ON galaxies(gameId);
CREATE INDEX IF NOT EXISTS idx_galaxies_createdAt ON galaxies(createdAt);

-- Table: people
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT,
  raceId TEXT,
  role TEXT,
  location TEXT,
  conditions TEXT,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_people_gameId ON people(gameId);
CREATE INDEX IF NOT EXISTS idx_people_createdAt ON people(createdAt);

-- Table: planets
CREATE TABLE IF NOT EXISTS planets (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  resources TEXT,
  inhabitants TEXT,
  starSystemId TEXT,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (starSystemId) REFERENCES star_systems(id) ON DELETE CASCADE,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planets_starSystemId ON planets(starSystemId);
CREATE INDEX IF NOT EXISTS idx_planets_gameId ON planets(gameId);
CREATE INDEX IF NOT EXISTS idx_planets_createdAt ON planets(createdAt);

-- Table: races
CREATE TABLE IF NOT EXISTS races (
  id TEXT PRIMARY KEY,
  name TEXT,
  technology TEXT,
  ships TEXT,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_races_gameId ON races(gameId);
CREATE INDEX IF NOT EXISTS idx_races_createdAt ON races(createdAt);

-- Table: rooms
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  type TEXT,
  assigned TEXT,
  technology TEXT,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rooms_gameId ON rooms(gameId);
CREATE INDEX IF NOT EXISTS idx_rooms_createdAt ON rooms(createdAt);

-- Table: ships
CREATE TABLE IF NOT EXISTS ships (
  id TEXT PRIMARY KEY,
  name TEXT,
  power INTEGER,
  maxPower INTEGER,
  shields INTEGER,
  maxShields INTEGER,
  hull INTEGER,
  maxHull INTEGER,
  raceId TEXT,
  crew TEXT,
  location TEXT,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ships_gameId ON ships(gameId);
CREATE INDEX IF NOT EXISTS idx_ships_createdAt ON ships(createdAt);

-- Table: star_systems
CREATE TABLE IF NOT EXISTS star_systems (
  id TEXT PRIMARY KEY,
  name TEXT,
  x REAL,
  y REAL,
  galaxyId TEXT,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (galaxyId) REFERENCES galaxies(id) ON DELETE CASCADE,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_star_systems_galaxyId ON star_systems(galaxyId);
CREATE INDEX IF NOT EXISTS idx_star_systems_gameId ON star_systems(gameId);
CREATE INDEX IF NOT EXISTS idx_star_systems_createdAt ON star_systems(createdAt);

-- Table: stars
CREATE TABLE IF NOT EXISTS stars (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  radius REAL,
  mass REAL,
  temperature REAL,
  luminosity REAL,
  age REAL,
  starSystemId TEXT,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (starSystemId) REFERENCES star_systems(id) ON DELETE CASCADE,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stars_starSystemId ON stars(starSystemId);
CREATE INDEX IF NOT EXISTS idx_stars_gameId ON stars(gameId);
CREATE INDEX IF NOT EXISTS idx_stars_createdAt ON stars(createdAt);

-- Table: stargates
CREATE TABLE IF NOT EXISTS stargates (
  id TEXT PRIMARY KEY,
  address TEXT,
  type TEXT,
  locationId TEXT,
  connectedTo TEXT,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_stargates_gameId ON stargates(gameId);
CREATE INDEX IF NOT EXISTS idx_stargates_createdAt ON stargates(createdAt);

-- Table: technology
CREATE TABLE IF NOT EXISTS technology (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  unlocked INTEGER,
  cost INTEGER,
  gameId TEXT,
  createdAt INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_technology_gameId ON technology(gameId);
CREATE INDEX IF NOT EXISTS idx_technology_createdAt ON technology(createdAt);

