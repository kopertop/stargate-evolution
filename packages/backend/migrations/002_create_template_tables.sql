-- Create template tables for game data definitions
-- These tables store the "blueprints" that games are created from

-- Race templates (needed first for foreign keys)
CREATE TABLE IF NOT EXISTS race_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_technology TEXT, -- JSON array of technology IDs
  default_ships TEXT, -- JSON array of ship template IDs
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Technology templates
CREATE TABLE IF NOT EXISTS technology_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- 'ship_systems', 'weapons', 'medical', etc.
  unlock_requirements TEXT, -- JSON array of requirement objects
  cost INTEGER DEFAULT 0,
  image TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Room templates (now includes layout and connection info)
CREATE TABLE IF NOT EXISTS room_templates (
	id TEXT PRIMARY KEY,
	layout_id TEXT NOT NULL, -- e.g. 'destiny', 'atlantis'
	type TEXT NOT NULL, -- 'corridor', 'bridge', 'quarters', etc.
	name TEXT NOT NULL,
	description TEXT,
	start_x INTEGER NOT NULL, -- Left edge of room rectangle
	start_y INTEGER NOT NULL, -- Top edge of room rectangle
	end_x INTEGER NOT NULL,   -- Right edge of room rectangle
	end_y INTEGER NOT NULL,   -- Bottom edge of room rectangle
	floor INTEGER NOT NULL,
	initial_state TEXT, -- JSON: { found, locked, explored }
	image TEXT,
	base_exploration_time INTEGER DEFAULT 2,
	default_status TEXT DEFAULT 'ok', -- 'ok', 'damaged', 'destroyed'
	connection_north TEXT,
	connection_south TEXT,
	connection_east TEXT,
	connection_west TEXT,
	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Person templates (crew member archetypes)
CREATE TABLE IF NOT EXISTS person_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  race_template_id TEXT,
  skills TEXT, -- JSON array of skill names
  description TEXT,
  image TEXT,
  default_location TEXT, -- JSON for initial location assignment
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (race_template_id) REFERENCES race_templates(id)
);

-- Door templates (now includes layout and room connection info)
CREATE TABLE IF NOT EXISTS door_templates (
	id TEXT PRIMARY KEY,
	layout_id TEXT NOT NULL, -- e.g. 'destiny', 'atlantis'
	from_room_id TEXT NOT NULL,
	to_room_id TEXT NOT NULL,
	requirements TEXT, -- JSON array of requirement objects
	initial_state TEXT DEFAULT 'closed', -- 'closed', 'opened', 'locked'
	description TEXT,
	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Galaxy templates
CREATE TABLE IF NOT EXISTS galaxy_templates (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	description TEXT,
	x INTEGER NOT NULL, -- X coordinate
	y INTEGER NOT NULL, -- Y coordinate
	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Star system templates
CREATE TABLE IF NOT EXISTS star_system_templates (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	galaxy_id TEXT,
	description TEXT,
	x INTEGER NOT NULL, -- X coordinate relative to galaxy
	y INTEGER NOT NULL, -- Y coordinate relative to galaxy
	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),
	FOREIGN KEY (galaxy_id) REFERENCES galaxy_templates(id)
);

-- Stargate templates
CREATE TABLE IF NOT EXISTS stargate_templates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'milky_way', 'pegasus', 'universe'
  address_pattern TEXT, -- JSON array defining address structure
  location_template_id TEXT, -- Reference to planet or ship template
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Planet templates
CREATE TABLE IF NOT EXISTS planet_templates (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	type TEXT NOT NULL, -- 'habitable', 'desert', 'ice', etc.
	star_system_template_id TEXT,
	description TEXT,
	stargate_address TEXT, -- JSON array or string
	technology TEXT,       -- JSON array of technology template IDs
	resources TEXT,        -- JSON object/array
	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),
	FOREIGN KEY (star_system_template_id) REFERENCES star_system_templates(id)
);

-- Create room_technology table for technology found in rooms during exploration
CREATE TABLE IF NOT EXISTS room_technology (
	id TEXT PRIMARY KEY,
	room_id TEXT NOT NULL,
	technology_template_id TEXT NOT NULL,
	count INTEGER NOT NULL DEFAULT 1,
	description TEXT,
	discovered BOOLEAN DEFAULT FALSE, -- Whether this tech has been found through exploration
	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),
	FOREIGN KEY (room_id) REFERENCES room_templates(id),
	FOREIGN KEY (technology_template_id) REFERENCES technology_templates(id)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_room_technology_room ON room_technology(room_id);
CREATE INDEX IF NOT EXISTS idx_room_technology_tech ON room_technology(technology_template_id);


-- Create indexes for foreign key relationships
CREATE INDEX IF NOT EXISTS idx_person_templates_race ON person_templates(race_template_id);
CREATE INDEX IF NOT EXISTS idx_star_system_templates_galaxy ON star_system_templates(galaxy_id);
CREATE INDEX IF NOT EXISTS idx_planet_templates_star_system ON planet_templates(star_system_template_id);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_room_templates_type ON room_templates(type);
CREATE INDEX IF NOT EXISTS idx_person_templates_role ON person_templates(role);
CREATE INDEX IF NOT EXISTS idx_technology_templates_category ON technology_templates(category);
