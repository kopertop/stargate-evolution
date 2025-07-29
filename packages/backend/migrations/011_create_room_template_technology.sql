-- Migration: Create room_template_technology junction table
-- This table stores technology assignments for room templates (not room instances)

CREATE TABLE IF NOT EXISTS room_template_technology (
	id TEXT PRIMARY KEY,
	room_template_id TEXT NOT NULL,
	technology_template_id TEXT NOT NULL,
	count INTEGER NOT NULL DEFAULT 1,
	description TEXT,

	-- Discovery properties for template
	discovery_chance REAL DEFAULT 1.0, -- Chance (0.0-1.0) this tech is discovered when exploring room
	discovery_requirements TEXT, -- JSON object with discovery requirements
	discovery_message TEXT, -- Custom message when tech is discovered

	-- Positioning (optional - for visual placement in room)
	x REAL, -- X coordinate within room (optional)
	y REAL, -- Y coordinate within room (optional)
	hidden_until_discovered INTEGER DEFAULT 0, -- Whether tech is visually hidden until found

	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),

	FOREIGN KEY (room_template_id) REFERENCES room_templates(id) ON DELETE CASCADE,
	FOREIGN KEY (technology_template_id) REFERENCES technology_templates(id) ON DELETE CASCADE,

	-- Ensure unique technology assignment per template
	UNIQUE(room_template_id, technology_template_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_room_template_technology_template ON room_template_technology(room_template_id);
CREATE INDEX IF NOT EXISTS idx_room_template_technology_tech ON room_template_technology(technology_template_id);
CREATE INDEX IF NOT EXISTS idx_room_template_technology_chance ON room_template_technology(discovery_chance);