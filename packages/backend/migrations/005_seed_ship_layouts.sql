-- Seed Destiny ship layout as normalized room_templates and door_templates

-- Rooms (using width/height and connections)
INSERT INTO room_templates (
	id,
	layout_id,
	type,
	name,
	description,
	width,
	height,
	floor,
	found,
	connection_north,
	connection_south,
	connection_east,
	connection_west,
	base_exploration_time,
	locked,
	status
) VALUES
	-- Gate Room/Storage Room (large central room with stargate)
	(
		'gate_room',                    -- id
		'destiny',                      -- layout_id
		'gate_room',                    -- type
		'Gate Room',                    -- name
		'Main Stargate room with storage', -- description
		4,                              -- width
		4,                              -- height
		0,                              -- floor
		true,                           -- found
		'north_corridor',               -- connection_north
		'south_corridor',               -- connection_south
		'east_corridor',                -- connection_east
		'west_corridor',                -- connection_west
		2,                              -- base_exploration_time
		false,                          -- locked
		'ok'                            -- status
	),

	-- Corridors around the gate room
	(
		'north_corridor',               -- id
		'destiny',                      -- layout_id
		'corridor_basic',               -- type
		'North Corridor',               -- name
		'Corridor west of gate room',   -- description
		2,                              -- width
		2,                              -- height
		0,                              -- floor
		false,                          -- found
		'mess_hall',                           -- connection_north
		'gate_room',                    -- connection_south
		NULL,                           -- connection_east
		NULL,                           -- connection_west
		0,                              -- base_exploration_time
		false,                          -- locked
		'ok'                            -- status
	),
	(
		'south_corridor',               -- id
		'destiny',                      -- layout_id
		'corridor_basic',               -- type
		'South Corridor',               -- name
		'Corridor north of gate room',  -- description
		2,                              -- width
		2,                              -- height
		0,                              -- floor
		false,                          -- found
		'gate_room',                    -- connection_north
		'engineering',                  -- connection_south
		NULL,                           -- connection_east
		NULL,                           -- connection_west
		0,                              -- base_exploration_time
		false,                          -- locked
		'ok'                            -- status
	),
	(
		'east_corridor',               -- id
		'destiny',                     -- layout_id
		'corridor_basic',              -- type
		'East Corridor',               -- name
		'Corridor east of gate room',  -- description
		2,                             -- width
		2,                             -- height
		0,                             -- floor
		false,                         -- found
		NULL,                          -- connection_north
		NULL,                          -- connection_south
		'control_interface',           -- connection_east
		'gate_room',                   -- connection_west
		0,                             -- base_exploration_time
		false,                         -- locked
		'ok'                            -- status
	),
	(
		'west_corridor',               -- id
		'destiny',                     -- layout_id
		'corridor_basic',              -- type
		'West Corridor',               -- name
		'Corridor west of gate room',  -- description
		2,                             -- width
		2,                             -- height
		0,                             -- floor
		false,                         -- found
		NULL,                          -- connection_north
		NULL,                          -- connection_south
		'gate_room',                   -- connection_east
		NULL,                          -- connection_west
		0,                             -- base_exploration_time
		false,                         -- locked
		'damaged'                      -- status
	),

	-- Control Interface and Kino Room (to the right of gate room)
	(
		'control_interface',            -- id
		'destiny',                      -- layout_id
		'control_room',                 -- type
		'Control Interface',            -- name
		'Ship control systems',         -- description
		4,                              -- width
		4,                              -- height
		0,                              -- floor
		false,                          -- found
		NULL,                           -- connection_north
		'observation_deck_corridor',    -- connection_south
		'kino_room',                    -- connection_east
		'east_corridor',                -- connection_west
		4,                              -- base_exploration_time
		false,                          -- locked
		'ok'                            -- status
	),
	(
		'kino_room',                    -- id
		'destiny',                      -- layout_id
		'kino_room',                    -- type
		'Kino Room',                    -- name
		'Kino storage and control',     -- description
		2,                              -- width
		2,                              -- height
		0,                              -- floor
		false,                          -- found
		NULL,                           -- connection_north
		NULL,                           -- connection_south
		'bridge_corridor',              -- connection_east
		'control_interface',            -- connection_west
		2,                              -- base_exploration_time
		false,                          -- locked
		'ok'                            -- status
	),
	(
		'observation_deck_corridor',    -- id
		'destiny',                      -- layout_id
		'corridor_basic',               -- type
		'Observation Deck Corridor',    -- name
		'Corridor leading to the observation deck', -- description
		2,                              -- width
		8,                              -- height
		0,                              -- floor
		false,                          -- found
		'control_interface',             -- connection_north
		'observation_deck',            -- connection_south
		NULL,                           -- connection_east
		NULL,                           -- connection_west
		4,                              -- base_exploration_time
		false,                          -- locked
		'ok'                            -- status
	),
	(
		'observation_deck',             -- id
		'destiny',                      -- layout_id
		'observation_deck',             -- type
		'Observation Deck',             -- name
		'Large observation deck with panoramic views', -- description
		8,                              -- width
		2,                              -- height
		0,                              -- floor
		false,                          -- found
		'observation_deck_corridor',    -- connection_north
		NULL,                           -- connection_south
		NULL,                           -- connection_east
		NULL,                           -- connection_west
		16,                             -- base_exploration_time
		false,                          -- locked
		'ok'                            -- status
	),

	(
		'bridge_corridor',    -- id
		'destiny',            -- layout_id
		'corridor_basic',     -- type
		'Bridge Corridor',    -- name
		'Corridor leading to the bridge', -- description
		8,                    -- width
		2,                    -- height
		0,                    -- floor
		false,                -- found
		NULL,                    -- connection_north
		'hydroponics_corridor',  -- connection_south
		'bridge',             -- connection_east
		NULL,                 -- connection_west
		0,                    -- base_exploration_time
		false,                -- locked
		'damaged'             -- status
	),
	(
		'bridge',           -- id
		'destiny',          -- layout_id
		'bridge_command',   -- type
		'Bridge',           -- name
		'Command center',   -- description
		2,                  -- width
		2,                  -- height
		0,                  -- floor
		false,              -- found
		NULL,               -- connection_north
		NULL,               -- connection_south
		NULL,               -- connection_east
		'bridge_corridor',  -- connection_west
		336,                 -- base_exploration_time (336 hours = 14 days)
		true,               -- locked
		'locked'                -- status
	),
	(
		'medical_bay',      -- id
		'destiny',          -- layout_id
		'medical_bay_standard', -- type
		'Medical Bay',      -- name
		'Medical bay',      -- description
		2,                  -- width
		2,                  -- height
		0,                  -- floor
		false,              -- found
		NULL,               -- connection_north
		NULL,               -- connection_south
		NULL,               -- connection_east
		'kino_room',        -- connection_west
		4,                  -- base_exploration_time
		false,              -- locked
		'ok'                 -- status
	),
	(
		'mess_hall',        -- id
		'destiny',          -- layout_id
		'mess_hall_standard', -- type
		'Mess Hall',        -- name
		'Mess hall',        -- description
		4,                  -- width
		2,                  -- height
		0,                  -- floor
		false,              -- found
		NULL,               -- connection_north
		'north_corridor',   -- connection_south
		NULL,               -- connection_east
		NULL,               -- connection_west
		2,                  -- base_exploration_time
		false,              -- locked
		'ok'                 -- status
	),

	-- Above the Control Interface Room is a corridor connecting to multiple other corridors going to
	-- the right. Each corridor is south of a small crew quarters room.
	(
		'crew_corridor_1',      -- id
		'destiny',              -- layout_id
		'corridor_basic',       -- type
		'Crew Corridor 1',      -- name
		'Corridor to the right of the control interface', -- description
		2,                      -- width
		2,                      -- height
		0,                      -- floor
		false,                  -- found
		'crew_quarters_1',      -- connection_north
		'control_interface',    -- connection_south
		'control_interface',    -- connection_east
		NULL,                   -- connection_west
		2,                      -- base_exploration_time
		false,                  -- locked
		'ok'                     -- status
	),
	(
		'crew_quarters_1',      -- id
		'destiny',              -- layout_id
		'crew_quarters',        -- type
		'Crew Quarters 1',      -- name
		'Crew quarters',        -- description
		2,                      -- width
		2,                      -- height
		0,                      -- floor
		false,                  -- found
		NULL,                   -- connection_north
		'crew_corridor_1',      -- connection_south
		NULL,                   -- connection_east
		NULL,                   -- connection_west
		4,                      -- base_exploration_time
		false,                  -- locked
		'ok'                     -- status
	),
	(
		'crew_corridor_2',      -- id
		'destiny',              -- layout_id
		'corridor_basic',       -- type
		'Crew Corridor 2',      -- name
		'Corridor to the right of the control interface', -- description
		2,                      -- width
		2,                      -- height
		0,                      -- floor
		false,                  -- found
		'crew_quarters_2',      -- connection_north
		'crew_corridor_1',      -- connection_south
		'crew_corridor_1',      -- connection_east
		NULL,                   -- connection_west
		6,                      -- base_exploration_time
		false,                  -- locked
		'ok'                     -- status
	),
	(
		'crew_quarters_2',      -- id
		'destiny',              -- layout_id
		'crew_quarters',        -- type
		'Crew Quarters 2',      -- name
		'Crew quarters',        -- description
		2,                      -- width
		2,                      -- height
		0,                      -- floor
		false,                  -- found
		NULL,                   -- connection_north
		'crew_corridor_2',      -- connection_south
		NULL,                   -- connection_east
		NULL,                   -- connection_west
		8,                      -- base_exploration_time
		false,                  -- locked
		'ok'                     -- status
	),
	(
		'crew_corridor_3',      -- id
		'destiny',              -- layout_id
		'corridor_basic',       -- type
		'Crew Corridor 3',      -- name
		'Corridor to the right of the control interface', -- description
		2,                      -- width
		2,                      -- height
		0,                      -- floor
		false,                  -- found
		'crew_quarters_3',      -- connection_north
		'crew_corridor_2',      -- connection_south
		'crew_corridor_2',      -- connection_east
		NULL,                   -- connection_west
		10,                     -- base_exploration_time
		false,                  -- locked
		'ok'                     -- status
	),
	(
		'crew_quarters_3',      -- id
		'destiny',              -- layout_id
		'crew_quarters',        -- type
		'Crew Quarters 3',      -- name
		'Crew quarters',        -- description
		2,                      -- width
		2,                      -- height
		0,                      -- floor
		false,                  -- found
		NULL,                   -- connection_north
		'crew_corridor_3',      -- connection_south
		NULL,                   -- connection_east
		NULL,                   -- connection_west
		12,                     -- base_exploration_time
		false,                  -- locked
		'ok'                     -- status
	),
	(
		'crew_corridor_4',      -- id
		'destiny',              -- layout_id
		'corridor_basic',       -- type
		'Crew Corridor 4',      -- name
		'Corridor to the right of the control interface', -- description
		2,                      -- width
		2,                      -- height
		0,                      -- floor
		false,                  -- found
		'crew_quarters_4',      -- connection_north
		'crew_corridor_3',      -- connection_south
		'crew_corridor_3',      -- connection_east
		NULL,                   -- connection_west
		14,                     -- base_exploration_time
		false,                  -- locked
		'ok'                     -- status
	),
	(
		'crew_quarters_4',      -- id
		'destiny',              -- layout_id
		'crew_quarters',        -- type
		'Crew Quarters 4',      -- name
		'Crew quarters',        -- description
		2,                      -- width
		2,                      -- height
		0,                      -- floor
		false,                  -- found
		NULL,                   -- connection_north
		'crew_corridor_4',      -- connection_south
		NULL,                   -- connection_east
		NULL,                   -- connection_west
		16,                     -- base_exploration_time
		false,                  -- locked
		'ok'                     -- status
	),

	-- Advanced rooms
	(
		'engineering',          -- id
		'destiny',              -- layout_id
		'engineering_main',     -- type
		'Engineering',          -- name
		'Engineering section',  -- description
		4,                      -- width
		4,                      -- height
		0,                      -- floor
		false,                  -- found
		NULL,                   -- connection_north
		NULL,                   -- connection_south
		'west_corridor',        -- connection_east
		NULL,                   -- connection_west
		12,                     -- base_exploration_time
		true,                  -- locked
		'damaged'               -- status
	),
	(
		'hydroponics_corridor',    -- id
		'destiny',                 -- layout_id
		'corridor_basic',          -- type
		'Hydroponics Corridor',    -- name
		'Corridor to hydroponics', -- description
		2,                         -- width
		4,                         -- height
		0,                         -- floor
		false,                     -- found
		'bridge_corridor',         -- connection_north
		'hydroponics',             -- connection_south
		NULL,                      -- connection_east
		NULL,                      -- connection_west
		8,                         -- base_exploration_time
		false,                     -- locked
		'damaged'                       -- status
	),
	(
		'hydroponics',          -- id
		'destiny',              -- layout_id
		'hydroponics_bay',      -- type
		'Hydroponics',          -- name
		'Hydroponics bay',      -- description
		4,                      -- width
		4,                      -- height
		0,                     -- floor
		false,                  -- found
		'hydroponics_corridor', -- connection_north
		NULL,                   -- connection_south
		NULL,                   -- connection_east
		NULL,                   -- connection_west
		6,                      -- base_exploration_time
		true,                  -- locked
		'damaged'               -- status
	);
