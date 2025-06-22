-- Seed Destiny ship layout with coordinate-based room system
-- Designed specifically for Swift SpriteKit with 32-point grid system
-- Coordinate system: (0,0) top-left, positive X right, positive Y down

-- ====================
-- FLOOR 0 (Main Deck)
-- ====================

-- Gate Room - Central hub (Floor 0)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'gate_room', 'destiny', 'gate_room', 'Gate Room',
	'Central chamber housing the Stargate. Primary transportation hub connecting to other worlds.',
	384, 640, 256, 448, 0,
	TRUE, FALSE, TRUE, 'stargate-room.png', 5, 'ok'
);

-- Bridge - Command center (Floor 0)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'bridge', 'destiny', 'bridge', 'Bridge',
	'Command center of Destiny. Houses primary ship controls and navigation systems.',
	480, 736, 64, 192, 0,
	TRUE, FALSE, TRUE, 'bridge.png', 8, 'ok'
);

-- Main Corridor (Floor 0) - Connects major sections
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'main_corridor', 'destiny', 'corridor', 'Main Corridor',
	'Primary corridor connecting the gate room to other ship sections.',
	256, 768, 448, 512, 0,
	TRUE, FALSE, TRUE, 'corridor.png', 2, 'ok'
);

-- Observation Deck (Floor 0)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'observation_deck', 'destiny', 'observation', 'Observation Deck',
	'Large viewing area with windows showing space outside the ship.',
	64, 256, 128, 320, 0,
	TRUE, FALSE, FALSE, 'observation.png', 3, 'ok'
);

-- Mess Hall (Floor 0)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'mess_hall', 'destiny', 'mess_hall', 'Mess Hall',
	'Dining area where crew gathers for meals and meetings.',
	768, 960, 256, 448, 0,
	TRUE, FALSE, TRUE, 'mess-hall.png', 4, 'ok'
);

-- Elevator to Floor 1 (Floor 0)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'elevator_floor_0', 'destiny', 'elevator', 'Elevator Floor 0',
	'Elevator providing access between ship decks.',
	896, 960, 64, 128, 0,
	TRUE, FALSE, TRUE, 'elevator.png', 1, 'ok'
);

-- ====================
-- FLOOR 1 (Quarters & Living)
-- ====================

-- Quarters Section A (Floor 1)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'quarters_a', 'destiny', 'quarters', 'Quarters Section A',
	'Living quarters for crew members. Contains sleeping areas and personal storage.',
	64, 256, 64, 192, 1,
	TRUE, FALSE, FALSE, 'quarters.png', 3, 'ok'
);

-- Quarters Section B (Floor 1)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'quarters_b', 'destiny', 'quarters', 'Quarters Section B',
	'Additional living quarters for crew members.',
	256, 448, 64, 192, 1,
	TRUE, FALSE, FALSE, 'quarters.png', 3, 'ok'
);

-- Medical Bay (Floor 1)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'medical_bay', 'destiny', 'medical', 'Medical Bay',
	'Medical facility with advanced treatment equipment and surgical capabilities.',
	448, 640, 64, 192, 1,
	TRUE, FALSE, TRUE, 'medical.png', 6, 'ok'
);

-- Hydroponics (Floor 1)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'hydroponics', 'destiny', 'hydroponics', 'Hydroponics Bay',
	'Agricultural facility for growing food and maintaining ship atmosphere.',
	640, 832, 64, 256, 1,
	TRUE, FALSE, FALSE, 'hydroponics.png', 7, 'ok'
);

-- Corridor Floor 1 (Floor 1)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'corridor_floor_1', 'destiny', 'corridor', 'Corridor Floor 1',
	'Main corridor on floor 1 connecting living quarters and facilities.',
	64, 832, 256, 320, 1,
	TRUE, FALSE, TRUE, 'corridor.png', 2, 'ok'
);

-- Elevator to Floor 0 (Floor 1)
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'elevator_floor_1', 'destiny', 'elevator', 'Elevator Floor 1',
	'Elevator providing access between ship decks.',
	896, 960, 64, 128, 1,
	TRUE, FALSE, TRUE, 'elevator.png', 1, 'ok'
);

-- ====================
-- DOORS - Connecting Rooms
-- ====================

-- Floor 0 Doors
INSERT INTO door_templates (
	id, name, from_room_id, to_room_id,
	x, y, width, height, rotation,
	state, is_automatic, open_direction, style
) VALUES
	-- Gate Room to Main Corridor
	('door_gate_corridor', 'Gate Room Exit', 'gate_room', 'main_corridor', 512, 448, 64, 8, 0, 'opened', TRUE, 'sliding', 'blast_door'),

	-- Main Corridor to Bridge
	('door_corridor_bridge', 'Bridge Access', 'main_corridor', 'bridge', 608, 256, 8, 64, 90, 'closed', FALSE, 'inward', 'standard'),

	-- Main Corridor to Observation Deck
	('door_corridor_observation', 'Observation Access', 'main_corridor', 'observation_deck', 256, 384, 8, 64, 90, 'closed', FALSE, 'inward', 'standard'),

	-- Main Corridor to Mess Hall
	('door_corridor_mess', 'Mess Hall Access', 'main_corridor', 'mess_hall', 768, 352, 8, 64, 90, 'opened', TRUE, 'sliding', 'standard'),

	-- Main Corridor to Elevator Floor 0
	('door_corridor_elevator0', 'Elevator Access', 'main_corridor', 'elevator_floor_0', 896, 256, 8, 64, 90, 'opened', TRUE, 'sliding', 'standard');

-- Floor 1 Doors
INSERT INTO door_templates (
	id, name, from_room_id, to_room_id,
	x, y, width, height, rotation,
	state, is_automatic, open_direction, style
) VALUES
	-- Corridor to Quarters A
	('door_corridor1_quartersA', 'Quarters A Access', 'corridor_floor_1', 'quarters_a', 160, 256, 64, 8, 0, 'closed', FALSE, 'inward', 'standard'),

	-- Corridor to Quarters B
	('door_corridor1_quartersB', 'Quarters B Access', 'corridor_floor_1', 'quarters_b', 352, 256, 64, 8, 0, 'closed', FALSE, 'inward', 'standard'),

	-- Corridor to Medical Bay
	('door_corridor1_medical', 'Medical Bay Access', 'corridor_floor_1', 'medical_bay', 544, 256, 64, 8, 0, 'opened', TRUE, 'sliding', 'medical'),

	-- Corridor to Hydroponics
	('door_corridor1_hydro', 'Hydroponics Access', 'corridor_floor_1', 'hydroponics', 736, 256, 64, 8, 0, 'closed', FALSE, 'inward', 'standard'),

	-- Corridor to Elevator Floor 1
	('door_corridor1_elevator1', 'Elevator Access', 'corridor_floor_1', 'elevator_floor_1', 896, 256, 8, 64, 90, 'opened', TRUE, 'sliding', 'standard');

-- Elevator Doors (connecting floors vertically)
INSERT INTO door_templates (
	id, name, from_room_id, to_room_id,
	x, y, width, height, rotation,
	state, is_automatic, open_direction, style
) VALUES
	-- Elevator connecting Floor 0 to Floor 1
	('door_elevator_0_to_1', 'Elevator Floor 0->1', 'elevator_floor_0', 'elevator_floor_1', 928, 96, 32, 8, 0, 'closed', TRUE, 'sliding', 'elevator');

-- ====================
-- ROOM TECHNOLOGY
-- ====================

-- Gate Room Technology
INSERT INTO room_technology (id, room_id, technology_template_id, count, description, discovered) VALUES
	('tech_gate_stargate', 'gate_room', 'stargate_dialer', 1, 'Primary stargate control system', TRUE),
	('tech_gate_shields', 'gate_room', 'shields', 1, 'Gate room protective barriers', TRUE),
	('tech_gate_power', 'gate_room', 'power_core', 1, 'Gate room power distribution', TRUE);

-- Bridge Technology
INSERT INTO room_technology (id, room_id, technology_template_id, count, description, discovered) VALUES
	('tech_bridge_nav', 'bridge', 'navigation', 1, 'Ship navigation and helm control', TRUE),
	('tech_bridge_ftl', 'bridge', 'ftl_drive', 1, 'FTL drive control systems', TRUE),
	('tech_bridge_comm', 'bridge', 'communication_array', 1, 'Long-range communications', TRUE),
	('tech_bridge_sensors', 'bridge', 'sensor_array', 1, 'Ship sensor array control', TRUE);

-- Medical Bay Technology
INSERT INTO room_technology (id, room_id, technology_template_id, count, description, discovered) VALUES
	('tech_med_scanner', 'medical_bay', 'medical_scanner', 2, 'Advanced medical diagnostic equipment', TRUE),
	('tech_med_supplies', 'medical_bay', 'medical_supplies', 5, 'Medical supplies and pharmaceuticals', TRUE),
	('tech_med_ancient', 'medical_bay', 'healing_device', 1, 'Ancient healing technology', FALSE);

-- Hydroponics Technology
INSERT INTO room_technology (id, room_id, technology_template_id, count, description, discovered) VALUES
	('tech_hydro_life', 'hydroponics', 'life_support', 1, 'Atmospheric processing systems', TRUE),
	('tech_hydro_lab', 'hydroponics', 'laboratory', 1, 'Agricultural research equipment', FALSE);

-- Observation Deck Technology
INSERT INTO room_technology (id, room_id, technology_template_id, count, description, discovered) VALUES
	('tech_obs_scanner', 'observation_deck', 'scanner', 1, 'External scanning equipment', FALSE),
	('tech_obs_ancient', 'observation_deck', 'ancient_crystal', 3, 'Ancient power crystals', FALSE);
