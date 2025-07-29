-- Seed Destiny ship layout with coordinate-based room system
-- Designed specifically for Swift SpriteKit with 32-point grid system
-- Coordinate system: (0,0) at center, positive X right, positive Y down
-- Canvas: 1200x800 with 32-point grid, center at (600,400) in canvas coordinates

-- ====================
-- FLOOR 0 (Main Deck)
-- ====================

-- ====================
-- ALL DESTINY ROOMS FROM EXPORT DATA
-- ====================

INSERT INTO rooms (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status,
	template_id
) VALUES
-- Gate Room - Central hub (Floor 0)
(
	'gate_room', 'destiny', 'gate_room', 'Gate Room',
	'Central chamber housing the Stargate. Primary transportation hub connecting to other worlds.',
	-400, 400, -200, 200, 0,
	TRUE, FALSE, TRUE, 'stargate-room.png', 5, 'ok',
	'gate-room-template'
),
-- Corridors and connectors
(
	'east_corridor_top', 'destiny', 'corridor', 'East Corridor (Top)',
	NULL, 400, 800, -220, -80, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
(
	'east_corridor_bottom', 'destiny', 'corridor', 'East Corridor (Bottom)',
	NULL, 400, 800, 80, 220, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
(
	'stargate_corridor_north_connector', 'destiny', 'corridor', 'Connector',
	'', -64, 64, -350, -200, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
(
	'stargate_corridor_south_connector', 'destiny', 'corridor', 'South Corridor Connector',
	'', -64, 64, 200, 350, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
(
	'stargate_corridor_east_connector', 'destiny', 'corridor', 'East Connector',
	'', -550, -400, -64, 64, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
(
	'east_corridor', 'destiny', 'corridor', 'East Corridor',
	'', -700, -550, -500, 500, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
(
	'north_corridor', 'destiny', 'corridor', 'North Corridor',
	'', -550, 1500, -500, -350, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
(
	'south_corridor', 'destiny', 'corridor', 'South Corridor',
	'', -550, 1500, 350, 500, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
(
	'cr_corridor_2', 'destiny', 'corridor', 'Corridor',
	'', 1500, 1900, -70, 70, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
(
	'cr_north', 'destiny', 'corridor', 'Corridor',
	'', 1100, 1200, -350, -280, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
(
	'room_1751649578881', 'destiny', 'corridor', 'Corridor',
	'', 1100, 1200, 280, 350, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
-- Control Room
(
	'control_interface_room', 'destiny', 'control_room', 'Control Interface Room',
	NULL, 800, 1500, -280, 280, 0,
	FALSE, FALSE, FALSE, '/images/rooms/control-room.png', 2, 'ok',
	'control-room-template'
),
-- Elevators
(
	'elevator_north', 'destiny', 'elevator', 'Elevator',
	'Elevator on the north side', 1500, 1628, -500, -350, 0,
	FALSE, FALSE, FALSE, '/images/rooms/elevator.png', 2, 'ok',
	'elevator-template'
),
(
	'elevator_room_floor_1', 'destiny', 'elevator', 'Elevator',
	'', -64, 64, -64, 64, 1,
	FALSE, FALSE, FALSE, '/images/rooms/elevator.png', 2, 'ok',
	'elevator-template'
),
-- Kino Room
(
	'kino_room', 'destiny', 'kino_room', 'Kino Room',
	'', 1900, 2100, -120, 120, 0,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'kino-room-template'
),
-- Hydroponics
(
	'hydroponics', 'destiny', 'hydroponics', 'Hydroponics',
	'', 64, 672, -288, 256, 1,
	FALSE, FALSE, FALSE, '/images/rooms/hydroponics.png', 2, 'ok',
	'hydroponics-template'
),
-- Floor 1 Corridor
(
	'room_1753576770763', 'destiny', 'corridor', 'corridor',
	'', -672, -64, -64, 64, 1,
	FALSE, FALSE, FALSE, NULL, 2, 'ok',
	'corridor-template'
),
-- Quarters Room (Floor 1)
(
	'quarters_room_1', 'destiny', 'quarters', 'Crew Quarters Alpha',
	'Personal quarters for crew accommodation and rest.',
	64, 320, 200, 288, 1,
	FALSE, FALSE, FALSE, '/images/rooms/quarters.png', 3, 'ok',
	'quarters-template'
);

-- ====================
-- ROOM TEMPLATES (True Templates)
-- ====================

INSERT INTO room_templates (
	id, layout_id, type, name, description,
	default_width, default_height, default_image, category,
	min_width, max_width, min_height, max_height,
	placement_requirements, compatible_layouts,
	tags, version, is_active
) VALUES
-- Gate Room Template
(
	'gate-room-template', 'destiny', 'gate_room', 'Gate Room Template',
	'Central chamber template for housing Stargate facilities',
	800, 400, 'stargate-room.png', 'command',
	600, 1200, 300, 500,
	'{"requires_central_location":true,"needs_large_clearance":true,"min_ceiling_height":10,"max_per_layout":1}',
	'["destiny","atlantis","earth"]',
	'["stargate","central","transport","command"]',
	'1.0', TRUE
),
-- Corridor Template
(
	'corridor-template', 'destiny', 'corridor', 'Corridor Template',
	'Standard corridor template for ship navigation and connection',
	400, 150, 'corridor.png', 'corridors',
	64, 2100, 32, 1000,
	'{"connects_rooms":true,"requires_clearance":true,"flexible_dimensions":true}',
	'["destiny","atlantis","earth"]',
	'["corridor","passage","navigation","connector"]',
	'1.0', TRUE
),
-- Control Room Template
(
	'control-room-template', 'destiny', 'control_room', 'Control Room Template',
	'Command and control interface room template with multiple consoles',
	700, 560, 'control-room.png', 'command',
	400, 1000, 300, 700,
	'{"requires_command_access":true,"needs_multiple_consoles":true,"power_intensive":true}',
	'["destiny","atlantis","earth"]',
	'["control","command","interface","bridge"]',
	'1.0', TRUE
),
-- Elevator Template
(
	'elevator-template', 'destiny', 'elevator', 'Elevator Template',
	'Vertical transportation elevator template with console',
	128, 150, 'elevator.png', 'transport',
	96, 200, 96, 200,
	'{"requires_vertical_shaft":true,"needs_elevator_console":true,"connects_floors":true}',
	'["destiny","atlantis","earth"]',
	'["elevator","transport","vertical","lift"]',
	'1.0', TRUE
),
-- Kino Room Template
(
	'kino-room-template', 'destiny', 'kino_room', 'Kino Room Template',
	'Storage and deployment room for Kino reconnaissance devices',
	200, 240, 'kino-room.png', 'science',
	150, 300, 180, 350,
	'{"requires_kino_storage":true,"needs_deployment_system":true,"surveillance_access":true}',
	'["destiny"]',
	'["kino","reconnaissance","surveillance","storage"]',
	'1.0', TRUE
),
-- Hydroponics Template
(
	'hydroponics-template', 'destiny', 'hydroponics', 'Hydroponics Template',
	'Agricultural growing facility template for food production',
	608, 544, 'hydroponics.png', 'life_support',
	400, 800, 400, 700,
	'{"requires_water_access":true,"needs_growing_lights":true,"climate_controlled":true}',
	'["destiny","atlantis","earth"]',
	'["hydroponics","agriculture","food","growing","life_support"]',
	'1.0', TRUE
),
-- Quarters Template
(
	'quarters-template', 'destiny', 'quarters', 'Quarters Template',
	'Personal quarters template for crew accommodation',
	128, 96, 'quarters.png', 'quarters',
	96, 200, 80, 150,
	'{"requires_privacy":true,"needs_bed_space":true}',
	'["destiny","atlantis","earth"]',
	'["quarters","sleeping","personal","accommodation"]',
	'1.0', TRUE
),
-- Engineering Template
(
	'engineering-template', 'destiny', 'engineering', 'Engineering Template',
	'Engineering section template for ship maintenance',
	200, 160, 'engineering.png', 'engineering',
	150, 300, 120, 250,
	'{"requires_power_access":true,"needs_maintenance_space":true}',
	'["destiny","atlantis","earth"]',
	'["engineering","maintenance","technical","power"]',
	'1.0', TRUE
),
-- Medical Template
(
	'medical-template', 'destiny', 'medical', 'Medical Template',
	'Medical facility template for crew healthcare',
	160, 128, 'medical.png', 'medical',
	120, 250, 100, 200,
	'{"requires_sterile_environment":true,"needs_equipment_space":true}',
	'["destiny","atlantis","earth"]',
	'["medical","healthcare","treatment","emergency"]',
	'1.0', TRUE
),
-- Science Template
(
	'science-template', 'destiny', 'science', 'Science Template',
	'Science laboratory template for research activities',
	180, 140, 'science.png', 'science',
	130, 280, 110, 220,
	'{"requires_research_equipment":true,"needs_data_access":true}',
	'["destiny","atlantis","earth"]',
	'["science","research","laboratory","analysis"]',
	'1.0', TRUE
);

-- ====================
-- ROOM FURNITURE
-- ====================

-- Gate Room Furniture (Stargate and DHD)
INSERT INTO room_furniture (
	id, room_id, furniture_type, name, description,
	x, y, z, width, height, rotation,
	image, interactive, power_required, active
) VALUES
-- Stargate in Gate Room (slightly off-center for DHD placement)
(
	'gate_room_stargate', 'gate_room', 'stargate', 'Ancient Stargate',
	'Ancient stargate device for interplanetary travel. The primary means of transportation between worlds.',
	-50, 0, 1, 64, 64, 0,
	'/images/furniture/stargate.png', 1, 100, 1
),
-- DHD near the Stargate (using control interface tower as closest available image)
(
	'gate_room_dhd', 'gate_room', 'dhd', 'Dial Home Device',
	'Control device for operating the Stargate, allowing dialing of gate addresses.',
	80, 60, 1, 32, 32, 0,
	'/images/furniture/control-interface-tower.png', 1, 25, 1
);

-- Control Room Furniture (Multiple Consoles)
INSERT INTO room_furniture (
	id, room_id, furniture_type, name, description,
	x, y, z, width, height, rotation,
	image, interactive, power_required, active
) VALUES
-- Main Command Console
(
	'control_room_main_console', 'control_interface_room', 'console', 'Main Command Console',
	'Primary command and control interface for ship operations.',
	0, -100, 1, 64, 48, 0,
	'/images/furniture/destiny-console.png', 1, 75, 1
),
-- Navigation Console
(
	'control_room_nav_console', 'control_interface_room', 'console', 'Navigation Console',
	'Ship navigation and flight control systems.',
	-150, 0, 1, 48, 32, 0,
	'/images/furniture/ship-console-active.png', 1, 50, 1
),
-- Systems Console
(
	'control_room_sys_console', 'control_interface_room', 'console', 'Systems Console',
	'Ship systems monitoring and maintenance controls.',
	150, 0, 1, 48, 32, 0,
	'/images/furniture/destiny-console-active.png', 1, 50, 1
),
-- Communications Console
(
	'control_room_comms_console', 'control_interface_room', 'console', 'Communications Console',
	'Long-range communications and sensor systems.',
	0, 100, 1, 48, 32, 0,
	'/images/furniture/destiny-console-transparent.png', 1, 40, 1
);

-- Elevator Furniture (Consoles)
INSERT INTO room_furniture (
	id, room_id, furniture_type, name, description,
	x, y, z, width, height, rotation,
	image, interactive, power_required, active
) VALUES
-- Elevator Console (North)
(
	'elevator_north_console', 'elevator_north', 'console', 'Elevator Control Console',
	'Control panel for vertical transportation between ship decks.',
	0, 0, 1, 32, 24, 0,
	'/images/furniture/elevator-console.png', 1, 30, 1
),
-- Elevator Console (Floor 1)
(
	'elevator_floor1_console', 'elevator_room_floor_1', 'console', 'Elevator Control Console',
	'Control panel for vertical transportation between ship decks.',
	0, 0, 1, 32, 24, 0,
	'/images/furniture/elevator-console.png', 1, 30, 1
);

-- Kino Room Furniture (Storage and Deployment Systems)
INSERT INTO room_furniture (
	id, room_id, furniture_type, name, description,
	x, y, z, width, height, rotation,
	image, interactive, power_required, active
) VALUES
-- Kino Storage Rack
(
	'kino_room_storage', 'kino_room', 'storage', 'Kino Storage Rack',
	'Storage and charging station for Kino reconnaissance devices.',
	-50, -80, 1, 80, 32, 0,
	'/images/furniture/storage-crate.png', 1, 20, 1
),
-- Kino Control Console
(
	'kino_room_console', 'kino_room', 'console', 'Kino Control Console',
	'Command interface for deploying and controlling Kino devices.',
	50, 0, 1, 48, 32, 0,
	'/images/furniture/destiny-console.png', 1, 40, 1
),
-- Kino Workbench
(
	'kino_room_workbench', 'kino_room', 'table', 'Kino Maintenance Workbench',
	'Technical workstation for Kino device maintenance and repairs.',
	-50, 80, 1, 64, 32, 0,
	'/images/furniture/storage-crate-open.png', 1, 15, 1
),
-- Additional Kino Room Furniture
-- Observation Bench for monitoring Kino feeds
(
	'kino_room_observation_bench', 'kino_room', 'bench', 'Observation Bench',
	'Comfortable seating for extended Kino monitoring sessions.',
	0, -40, 1, 80, 32, 0,
	'/images/furniture/bench-observation.png', 0, 0, 1
),
-- Observation Chair for operator
(
	'kino_room_observation_chair', 'kino_room', 'chair', 'Observation Chair',
	'Ergonomic chair for Kino operations personnel.',
	50, -40, 1, 32, 32, 0,
	'/images/furniture/chair-observation.png', 0, 0, 1
);

-- Hydroponics Furniture (Growing Equipment)
INSERT INTO room_furniture (
	id, room_id, furniture_type, name, description,
	x, y, z, width, height, rotation,
	image, interactive, power_required, active
) VALUES
-- Growing Beds (multiple)
(
	'hydro_bed_1', 'hydroponics', 'table', 'Growing Bed Alpha',
	'Hydroponic growing bed for food crop cultivation.',
	-200, -180, 1, 120, 60, 0,
	'table.png', 0, 25, 1
),
(
	'hydro_bed_2', 'hydroponics', 'table', 'Growing Bed Beta',
	'Hydroponic growing bed for food crop cultivation.',
	0, -180, 1, 120, 60, 0,
	'table.png', 0, 25, 1
),
(
	'hydro_bed_3', 'hydroponics', 'table', 'Growing Bed Gamma',
	'Hydroponic growing bed for food crop cultivation.',
	200, -180, 1, 120, 60, 0,
	'table.png', 0, 25, 1
),
(
	'hydro_bed_4', 'hydroponics', 'table', 'Growing Bed Delta',
	'Hydroponic growing bed for food crop cultivation.',
	-200, 0, 1, 120, 60, 0,
	'table.png', 0, 25, 1
),
(
	'hydro_bed_5', 'hydroponics', 'table', 'Growing Bed Epsilon',
	'Hydroponic growing bed for food crop cultivation.',
	0, 0, 1, 120, 60, 0,
	'table.png', 0, 25, 1
),
(
	'hydro_bed_6', 'hydroponics', 'table', 'Growing Bed Zeta',
	'Hydroponic growing bed for food crop cultivation.',
	200, 0, 1, 120, 60, 0,
	'table.png', 0, 25, 1
),
-- Environmental Control Console
(
	'hydro_env_console', 'hydroponics', 'console', 'Environmental Control Console',
	'Climate and nutrient control system for hydroponics facility.',
	-250, 180, 1, 64, 32, 0,
	'console.png', 1, 60, 1
),
-- Water Management Console
(
	'hydro_water_console', 'hydroponics', 'console', 'Water Management Console',
	'Water circulation and nutrient distribution controls.',
	0, 180, 1, 64, 32, 0,
	'console.png', 1, 45, 1
),
-- Harvest Processing Table
(
	'hydro_harvest_table', 'hydroponics', 'table', 'Harvest Processing Station',
	'Work surface for processing and preparing harvested crops.',
	250, 180, 1, 80, 40, 0,
	'table.png', 1, 10, 1
);

-- ====================
-- DOORS (Connecting Rooms)
-- ====================

INSERT INTO doors (
	id, name, from_room_id, to_room_id,
	x, y, floor, width, height, rotation,
	state, is_automatic, open_direction,
	style, color, power_required
) VALUES
-- Gate Room to East Corridors
(
	'door_gate_to_east_top', 'Gate to East Top', 'gate_room', 'east_corridor_top',
	400, -150, 0, 32, 8, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),
(
	'door_gate_to_east_bottom', 'Gate to East Bottom', 'gate_room', 'east_corridor_bottom',
	400, 150, 0, 32, 8, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- Gate Room to North/South Connectors
(
	'door_gate_to_north_connector', 'Gate to North Connector', 'gate_room', 'stargate_corridor_north_connector',
	0, -200, 0, 32, 8, 0,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),
(
	'door_gate_to_south_connector', 'Gate to South Connector', 'gate_room', 'stargate_corridor_south_connector',
	0, 200, 0, 32, 8, 0,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- Gate Room to East Connector
(
	'door_gate_to_east_connector', 'Gate to East Connector', 'gate_room', 'stargate_corridor_east_connector',
	-400, 0, 0, 8, 32, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- East Corridors to Control Room
(
	'door_east_top_to_control', 'East Top to Control', 'east_corridor_top', 'control_interface_room',
	800, -150, 0, 8, 32, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),
(
	'door_east_bottom_to_control', 'East Bottom to Control', 'east_corridor_bottom', 'control_interface_room',
	800, 150, 0, 8, 32, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- North/South Connectors to Main Corridors
(
	'door_north_connector_to_north_corridor', 'North Connector to North Corridor', 'stargate_corridor_north_connector', 'north_corridor',
	0, -350, 0, 32, 8, 0,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),
(
	'door_south_connector_to_south_corridor', 'South Connector to South Corridor', 'stargate_corridor_south_connector', 'south_corridor',
	0, 350, 0, 32, 8, 0,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- East Connector to East Corridor
(
	'door_east_connector_to_east_corridor', 'East Connector to East Corridor', 'stargate_corridor_east_connector', 'east_corridor',
	-550, 0, 0, 8, 32, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- Control Room to CR Corridor 2
(
	'door_control_to_cr_corridor_2', 'Control to CR Corridor 2', 'control_interface_room', 'cr_corridor_2',
	1500, 0, 0, 8, 32, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- CR Corridor 2 to Kino Room
(
	'door_cr_corridor_2_to_kino', 'CR Corridor 2 to Kino', 'cr_corridor_2', 'kino_room',
	1900, 0, 0, 8, 32, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- Control Room to North/South CR Connectors
(
	'door_control_to_cr_north', 'Control to CR North', 'control_interface_room', 'cr_north',
	1150, -280, 0, 32, 8, 0,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),
(
	'door_control_to_cr_south', 'Control to CR South', 'control_interface_room', 'room_1751649578881',
	1150, 280, 0, 32, 8, 0,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- CR North/South to North/South Corridors
(
	'door_cr_north_to_north_corridor', 'CR North to North Corridor', 'cr_north', 'north_corridor',
	1150, -350, 0, 32, 8, 0,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),
(
	'door_cr_south_to_south_corridor', 'CR South to South Corridor', 'room_1751649578881', 'south_corridor',
	1150, 350, 0, 32, 8, 0,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- Elevator to North Corridor
(
	'door_elevator_north_to_north_corridor', 'Elevator North to North Corridor', 'elevator_north', 'north_corridor',
	1564, -350, 0, 32, 8, 0,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- Floor 1 Connections
-- Elevator to Floor 1 Corridor
(
	'door_elevator_floor1_to_corridor', 'Elevator Floor 1 to Corridor', 'elevator_room_floor_1', 'room_1753576770763',
	-64, 0, 1, 8, 32, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
),

-- Floor 1 Corridor to Hydroponics
(
	'door_floor1_corridor_to_hydroponics', 'Floor 1 Corridor to Hydroponics', 'room_1753576770763', 'hydroponics',
	64, 0, 1, 8, 32, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
);

-- ====================
-- ADDITIONAL FURNITURE (Using All Available Images)
-- ====================

-- Quarters Room Furniture (Beds and Personal Items)
INSERT INTO room_furniture (
	id, room_id, furniture_type, name, description,
	x, y, z, width, height, rotation,
	image, interactive, power_required, active
) VALUES
-- Standard Bed
(
	'quarters_bed_1', 'quarters_room_1', 'bed', 'Crew Bed',
	'Standard crew sleeping quarters with integrated storage.',
	0, 0, 1, 64, 32, 0,
	'/images/furniture/bed.png', 1, 0, 1
),
-- Personal Storage Crate
(
	'quarters_storage_1', 'quarters_room_1', 'storage', 'Personal Storage',
	'Personal belongings storage container.',
	-50, 30, 1, 32, 32, 0,
	'/images/furniture/storage-crate.png', 1, 0, 1
);

-- Gate Room Additional Furniture (Alternative Stargate States)
INSERT INTO room_furniture (
	id, room_id, furniture_type, name, description,
	x, y, z, width, height, rotation,
	image, interactive, power_required, active, discovered
) VALUES
-- Active Stargate (hidden initially - appears when gate is dialing)
(
	'gate_room_stargate_active', 'gate_room', 'stargate_active', 'Active Stargate',
	'Ancient stargate in active dialing state with energy vortex.',
	-50, 0, 2, 64, 64, 0,
	'/images/furniture/stargate-active.png', 1, 150, 0, 0
),
-- Flush Stargate (alternate state - appears when gate is powered down)
(
	'gate_room_stargate_flush', 'gate_room', 'stargate_flush', 'Flush Stargate',
	'Ancient stargate in flush/standby configuration.',
	-50, 0, 0, 64, 64, 0,
	'/images/furniture/stargate-flush.png', 1, 50, 0, 0
);

-- ====================
-- DOOR CONNECTIONS FOR NEW ROOMS
-- ====================

-- Quarters room connections
INSERT INTO doors (
	id, name, from_room_id, to_room_id,
	x, y, floor, width, height, rotation,
	state, is_automatic, open_direction,
	style, color, power_required
) VALUES
-- Hydroponics to Quarters
(
	'door_hydroponics_to_quarters', 'Hydroponics to Quarters', 'hydroponics', 'quarters_room_1',
	368, 244, 1, 8, 32, 90,
	'closed', FALSE, 'sliding', 'standard', '#4A90E2', 0
);
