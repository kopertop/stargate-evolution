-- Create template tables for game data definitions
-- These tables store the "blueprints" that games are created from
-- Designed from the ground up for coordinate-based room building (Swift SpriteKit)

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

-- Room templates with coordinate-based positioning for Swift SpriteKit
CREATE TABLE IF NOT EXISTS room_templates (
	id TEXT PRIMARY KEY,
	layout_id TEXT NOT NULL, -- e.g. 'destiny', 'atlantis'
	type TEXT NOT NULL, -- 'corridor', 'bridge', 'quarters', etc.
	name TEXT NOT NULL,
	description TEXT,

	-- Coordinate-based positioning (32-point grid system)
	startX INTEGER NOT NULL, -- Left edge X coordinate
	endX INTEGER NOT NULL, -- Right edge X coordinate
	startY INTEGER NOT NULL, -- Top edge Y coordinate
	endY INTEGER NOT NULL, -- Bottom edge Y coordinate
	floor INTEGER NOT NULL,

	-- Legacy width/height for backward compatibility (auto-calculated)
	width INTEGER GENERATED ALWAYS AS ((endX - startX) / 32) STORED,
	height INTEGER GENERATED ALWAYS AS ((endY - startY) / 32) STORED,

	-- Room properties
	found BOOLEAN DEFAULT FALSE,
	locked BOOLEAN DEFAULT FALSE,
	explored BOOLEAN DEFAULT FALSE,
	image TEXT,
	base_exploration_time INTEGER DEFAULT 2,
	status TEXT DEFAULT 'ok' CHECK (status IN ('ok', 'damaged', 'destroyed', 'unknown')),

	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),

	-- Ensure valid coordinates
	CHECK (startX < endX AND startY < endY)
);

-- Door templates for coordinate-based door system
CREATE TABLE IF NOT EXISTS door_templates (
	id TEXT PRIMARY KEY,
	name TEXT,
	from_room_id TEXT NOT NULL,
	to_room_id TEXT NOT NULL,

	-- Precise positioning for Swift SpriteKit
	x INTEGER NOT NULL, -- X coordinate of door center
	y INTEGER NOT NULL, -- Y coordinate of door center
	width INTEGER DEFAULT 32, -- Door width in points
	height INTEGER DEFAULT 8, -- Door height in points
	rotation INTEGER DEFAULT 0 CHECK (rotation IN (0, 90, 180, 270)), -- Rotation in degrees

	-- Door properties
	state TEXT DEFAULT 'closed' CHECK (state IN ('opened', 'closed', 'locked')),
	is_automatic BOOLEAN DEFAULT FALSE,
	open_direction TEXT DEFAULT 'inward' CHECK (open_direction IN ('inward', 'outward', 'sliding')),

	-- Visual properties
	style TEXT DEFAULT 'standard',
	color TEXT, -- Hex color code for tinting

	-- Functional properties
	requirements TEXT, -- JSON array of requirements
	power_required INTEGER DEFAULT 0,
	sound_effect TEXT,

	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),

	FOREIGN KEY (from_room_id) REFERENCES room_templates(id) ON DELETE CASCADE,
	FOREIGN KEY (to_room_id) REFERENCES room_templates(id) ON DELETE CASCADE
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

-- Planet templates
CREATE TABLE IF NOT EXISTS planet_templates (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	type TEXT NOT NULL, -- 'habitable', 'desert', 'ice', etc.
	star_system_template_id TEXT,
	description TEXT,
	stargate_address TEXT, -- JSON array or string
	technology TEXT, -- JSON array of technology template IDs
	resources TEXT, -- JSON object/array
	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),
	FOREIGN KEY (star_system_template_id) REFERENCES star_system_templates(id)
);

-- Room technology (technology found in rooms during exploration)
CREATE TABLE IF NOT EXISTS room_technology (
	id TEXT PRIMARY KEY,
	room_id TEXT NOT NULL,
	technology_template_id TEXT NOT NULL,
	count INTEGER NOT NULL DEFAULT 1,
	description TEXT,
	discovered BOOLEAN DEFAULT FALSE, -- Whether this tech has been found through exploration
	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),
	FOREIGN KEY (room_id) REFERENCES room_templates(id) ON DELETE CASCADE,
	FOREIGN KEY (technology_template_id) REFERENCES technology_templates(id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_room_templates_layout ON room_templates(layout_id);
CREATE INDEX IF NOT EXISTS idx_room_templates_type ON room_templates(type);
CREATE INDEX IF NOT EXISTS idx_room_templates_floor ON room_templates(floor);
CREATE INDEX IF NOT EXISTS idx_room_templates_coords ON room_templates(startX, startY, endX, endY);

CREATE INDEX IF NOT EXISTS idx_door_templates_from_room ON door_templates(from_room_id);
CREATE INDEX IF NOT EXISTS idx_door_templates_to_room ON door_templates(to_room_id);
CREATE INDEX IF NOT EXISTS idx_door_templates_state ON door_templates(state);

CREATE INDEX IF NOT EXISTS idx_room_technology_room ON room_technology(room_id);
CREATE INDEX IF NOT EXISTS idx_room_technology_tech ON room_technology(technology_template_id);

CREATE INDEX IF NOT EXISTS idx_person_templates_race ON person_templates(race_template_id);
CREATE INDEX IF NOT EXISTS idx_person_templates_role ON person_templates(role);
CREATE INDEX IF NOT EXISTS idx_technology_templates_category ON technology_templates(category);
CREATE INDEX IF NOT EXISTS idx_star_system_templates_galaxy ON star_system_templates(galaxy_id);
CREATE INDEX IF NOT EXISTS idx_planet_templates_star_system ON planet_templates(star_system_template_id);
