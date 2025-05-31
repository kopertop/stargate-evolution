-- Seed Destiny ship layout as normalized room_templates and door_templates

-- Rooms (using width/height and connections)
INSERT INTO room_templates (id, layout_id, type, name, description, width, height, floor, found, connection_north, connection_south, connection_east, connection_west, base_exploration_time, locked) VALUES
	-- Gate Room/Storage Room (large central room with stargate)
	('gate_room', 'destiny', 'gate_room', 'Gate Room', 'Main Stargate room with storage', 4, 4, 0, true, 'south_corridor', NULL, 'control_interface', 'north_corridor', 2, false),

	-- Corridors around the gate room
	('north_corridor', 'destiny', 'corridor_basic', 'North Corridor', 'Corridor west of gate room', 2, 2, 0, false, NULL, NULL, 'gate_room', NULL, 0, false),
	('south_corridor', 'destiny', 'corridor_basic', 'South Corridor', 'Corridor north of gate room', 2, 2, 0, false, NULL, 'gate_room', NULL, NULL, 0, false),

	-- Control Interface and Kino Room (to the right of gate room)
	('control_interface', 'destiny', 'control_room', 'Control Interface', 'Ship control systems', 2, 2, 0, false, NULL, NULL, 'kino_room', 'gate_room', 4, false),
	('kino_room', 'destiny', 'kino_room', 'Kino Room', 'Kino storage and control', 2, 2, 0, false, NULL, NULL, NULL, 'control_interface', 2, false),

	-- Additional rooms for future expansion (simplified for now)
	('bridge', 'destiny', 'bridge_command', 'Bridge', 'Command center', 2, 2, 0, false, NULL, 'south_corridor', NULL, NULL, 48, true),
	('medical_bay', 'destiny', 'medical_bay_standard', 'Medical Bay', 'Medical bay', 2, 2, 0, false, NULL, NULL, NULL, 'kino_room', 4, false),
	('mess_hall', 'destiny', 'mess_hall_standard', 'Mess Hall', 'Mess hall', 2, 2, 0, false, NULL, 'north_corridor', NULL, NULL, 2, false),

	-- Above the Control Interface Room is a corridor connecting to multiple other corridors going to
	-- the right. Each corridor is south of a small crew quarters room.
	('crew_corridor_1', 'destiny', 'corridor_basic', 'Crew Corridor 1', 'Corridor to the right of the control interface', 2, 2, 0, false, 'crew_quarters_1', 'control_interface', 'control_interface', NULL, 2, false),
	('crew_quarters_1', 'destiny', 'crew_quarters', 'Crew Quarters 1', 'Crew quarters', 2, 2, 0, false, NULL, 'crew_corridor_1', NULL, NULL, 4, false),
	('crew_corridor_2', 'destiny', 'corridor_basic', 'Crew Corridor 2', 'Corridor to the right of the control interface', 2, 2, 0, false, 'crew_quarters_2', 'crew_corridor_1', 'crew_corridor_1', NULL, 6, false),
	('crew_quarters_2', 'destiny', 'crew_quarters', 'Crew Quarters 2', 'Crew quarters', 2, 2, 0, false, NULL, 'crew_corridor_2', NULL, NULL, 8, false),
	('crew_corridor_3', 'destiny', 'corridor_basic', 'Crew Corridor 3', 'Corridor to the right of the control interface', 2, 2, 0, false, 'crew_quarters_3', 'crew_corridor_2', 'crew_corridor_2', NULL, 10, false),
	('crew_quarters_3', 'destiny', 'crew_quarters', 'Crew Quarters 3', 'Crew quarters', 2, 2, 0, false, NULL, 'crew_corridor_3', NULL, NULL, 12, false),
	('crew_corridor_4', 'destiny', 'corridor_basic', 'Crew Corridor 4', 'Corridor to the right of the control interface', 2, 2, 0, false, 'crew_quarters_4', 'crew_corridor_3', 'crew_corridor_3', NULL, 14, false),
	('crew_quarters_4', 'destiny', 'crew_quarters', 'Crew Quarters 4', 'Crew quarters', 2, 2, 0, false, NULL, 'crew_corridor_4', NULL, NULL, 16, false),

	-- Multi-level rooms (for future expansion)
	('engineering', 'destiny', 'engineering_main', 'Engineering', 'Engineering section', 4, 4, 1, false, NULL, NULL, NULL, NULL, 12, false),
	('hydroponics', 'destiny', 'hydroponics_bay', 'Hydroponics', 'Hydroponics bay', 4, 4, -1, false, NULL, NULL, NULL, NULL, 6, false);
