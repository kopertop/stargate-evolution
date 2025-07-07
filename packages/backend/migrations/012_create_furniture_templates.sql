-- Migration: Create furniture_templates table
-- This table stores furniture template definitions that can be used to create furniture instances

CREATE TABLE IF NOT EXISTS furniture_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    furniture_type TEXT NOT NULL,
    description TEXT,
    category TEXT,
    
    -- Default physical properties
    default_width INTEGER DEFAULT 32,
    default_height INTEGER DEFAULT 32,
    default_rotation INTEGER DEFAULT 0,
    
    -- Default visual properties (stored as JSON strings)
    default_image TEXT, -- JSON object with image mappings
    default_color TEXT, -- Hex color code
    default_style TEXT, -- Style variant
    
    -- Default functional properties
    default_interactive INTEGER DEFAULT 0, -- SQLite boolean (0/1)
    default_blocks_movement INTEGER DEFAULT 1, -- SQLite boolean (0/1)
    default_power_required INTEGER DEFAULT 0,
    default_active INTEGER DEFAULT 1, -- SQLite boolean (0/1)
    default_discovered INTEGER DEFAULT 0, -- SQLite boolean (0/1)
    
    -- Requirements and constraints (stored as JSON strings)
    placement_requirements TEXT, -- JSON object with placement rules
    usage_requirements TEXT, -- JSON object with usage rules
    min_room_size INTEGER, -- Minimum room size needed
    max_per_room INTEGER, -- Maximum number allowed per room
    compatible_room_types TEXT, -- JSON array of compatible room types
    
    -- Template metadata
    tags TEXT, -- JSON array of tags for searching/filtering
    version TEXT DEFAULT '1.0', -- Template version for migration purposes
    is_active INTEGER DEFAULT 1, -- SQLite boolean (0/1)
    
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_furniture_templates_type ON furniture_templates(furniture_type);
CREATE INDEX IF NOT EXISTS idx_furniture_templates_category ON furniture_templates(category);
CREATE INDEX IF NOT EXISTS idx_furniture_templates_active ON furniture_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_furniture_templates_created ON furniture_templates(created_at);

-- Insert some basic furniture templates
INSERT INTO furniture_templates (
    id, name, furniture_type, description, category,
    default_width, default_height, default_rotation,
    default_image, default_color, default_style,
    default_interactive, default_blocks_movement, default_power_required,
    default_active, default_discovered,
    placement_requirements, usage_requirements, min_room_size, max_per_room, compatible_room_types,
    tags, version, is_active, created_at, updated_at
) VALUES
-- Stargate Template
(
    'stargate-template',
    'Stargate Template',
    'stargate',
    'Ancient ring-shaped portal device for instantaneous travel between worlds',
    'tech',
    64, 64, 0,
    '{"default":"/images/stargate-default.png","active":"/images/stargate-active.png","damaged":"/images/stargate-damaged.png","danger":"/images/stargate-danger.png"}',
    '#4A90E2',
    'ancient',
    1, 1, 100,
    0, 1,
    '{"needs_power_source":true,"requires_clearance":true,"min_ceiling_height":10}',
    '{"requires_dhd":true,"power_threshold":50}',
    10, 1, '["gate_room","transport_room"]',
    '["stargate","transport","ancient","portal"]',
    '1.0', 1, 1640995200, 1640995200
),
-- DHD Template
(
    'dhd-template',
    'DHD Template',
    'dhd',
    'Dial Home Device for controlling Stargate operations',
    'tech',
    32, 32, 0,
    '{"default":"/images/dhd-default.png","active":"/images/dhd-active.png","damaged":"/images/dhd-damaged.png","danger":"/images/dhd-danger.png"}',
    '#F5A623',
    'ancient',
    1, 0, 25,
    0, 1,
    '{"must_be_near_stargate":true,"max_distance_from_stargate":5}',
    '{"requires_power":true,"needs_stargate":true}',
    5, 1, '["gate_room","transport_room"]',
    '["dhd","control","ancient","stargate"]',
    '1.0', 1, 1640995200, 1640995200
),
-- Console Template
(
    'console-template',
    'Console Template',
    'console',
    'Control console for ship systems and operations',
    'tech',
    48, 32, 0,
    '{"default":"/images/console-default.png","active":"/images/console-active.png","damaged":"/images/console-damaged.png","danger":"/images/console-danger.png"}',
    '#7ED321',
    'modern',
    1, 1, 50,
    1, 1,
    '{"requires_wall_mount":false,"needs_power_conduit":true}',
    '{"requires_clearance":true,"power_threshold":25}',
    3, 4, '["bridge","control_room","engineering","medical","science"]',
    '["console","control","tech","modern"]',
    '1.0', 1, 1640995200, 1640995200
),
-- Bed Template
(
    'bed-template',
    'Bed Template',
    'bed',
    'Sleeping quarters for crew members',
    'furniture',
    48, 32, 0,
    '{"default":"/images/bed-default.png","active":"/images/bed-default.png","damaged":"/images/bed-damaged.png","danger":"/images/bed-default.png"}',
    '#8B7355',
    'standard',
    1, 1, 0,
    1, 1,
    '{"requires_floor_space":true,"away_from_doors":true}',
    '{"personal_quarters_only":true}',
    4, 2, '["quarters","medical","guest_quarters"]',
    '["bed","furniture","quarters","rest"]',
    '1.0', 1, 1640995200, 1640995200
),
-- Table Template
(
    'table-template',
    'Table Template',
    'table',
    'Multi-purpose work and dining table',
    'furniture',
    32, 32, 0,
    '{"default":"/images/table-default.png","active":"/images/table-default.png","damaged":"/images/table-damaged.png","danger":"/images/table-default.png"}',
    '#9B6B47',
    'standard',
    1, 0, 0,
    1, 1,
    '{"requires_floor_space":true,"clearance_around":true}',
    '{}',
    3, 3, '["mess_hall","quarters","meeting_room","science"]',
    '["table","furniture","dining","work"]',
    '1.0', 1, 1640995200, 1640995200
);