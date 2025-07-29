-- Migration: Create room_template_furniture junction table
-- This table stores furniture placement data for room templates (not room instances)

CREATE TABLE IF NOT EXISTS room_template_furniture (
	id TEXT PRIMARY KEY,
	room_template_id TEXT NOT NULL,
	furniture_template_id TEXT NOT NULL,
	name TEXT NOT NULL,
	description TEXT,

	-- Template-relative positioning (normalized 0-1 coordinates)
	x REAL NOT NULL,
	y REAL NOT NULL,
	z REAL NOT NULL DEFAULT 0,
	width REAL NOT NULL DEFAULT 32,
	height REAL NOT NULL DEFAULT 32,
	rotation REAL NOT NULL DEFAULT 0,

	-- Visual properties override
	image TEXT, -- Override template image if needed
	color TEXT, -- Override template color if needed
	style TEXT, -- Override template style if needed

	-- Functional properties override
	interactive INTEGER, -- SQLite boolean (0/1), NULL = use template default
	blocks_movement INTEGER, -- SQLite boolean (0/1), NULL = use template default
	power_required INTEGER, -- NULL = use template default

	-- State properties
	required INTEGER NOT NULL DEFAULT 1, -- Whether this furniture is required in rooms using this template
	optional_variants TEXT, -- JSON array of alternative furniture template IDs
	placement_order INTEGER DEFAULT 0, -- Order for placement when creating room instances

	created_at INTEGER DEFAULT (strftime('%s','now')),
	updated_at INTEGER DEFAULT (strftime('%s','now')),

	FOREIGN KEY (room_template_id) REFERENCES room_templates(id) ON DELETE CASCADE,
	FOREIGN KEY (furniture_template_id) REFERENCES furniture_templates(id) ON DELETE CASCADE,

	-- Ensure unique furniture placement per template
	UNIQUE(room_template_id, furniture_template_id, x, y)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_room_template_furniture_template ON room_template_furniture(room_template_id);
CREATE INDEX IF NOT EXISTS idx_room_template_furniture_type ON room_template_furniture(furniture_template_id);
CREATE INDEX IF NOT EXISTS idx_room_template_furniture_order ON room_template_furniture(placement_order);
CREATE INDEX IF NOT EXISTS idx_room_template_furniture_required ON room_template_furniture(required);