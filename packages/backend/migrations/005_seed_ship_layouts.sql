-- Seed Destiny ship layout as normalized room_templates and door_templates

-- Rooms (using rectangle positioning based on Destiny blueprint)
INSERT INTO room_templates (id, layout_id, type, name, description, start_x, start_y, end_x, end_y, floor, initial_state, connection_north, connection_south, connection_east, connection_west, base_exploration_time) VALUES
	-- Gate Room/Storage Room (large central room with stargate)
	('gate_room', 'destiny', 'gate_room', 'Gate Room', 'Main Stargate room with storage', -2, -2, 2, 2, 0, '{"found":true,"locked":false,"explored":false}', 'south_corridor', NULL, 'control_interface', 'north_corridor', 2),

	-- Corridors around the gate room
	('north_corridor', 'destiny', 'corridor_basic', 'North Corridor', 'Corridor west of gate room', -4, -1, -2, 1, 0, '{"found":false,"locked":false,"explored":false}', NULL, NULL, 'gate_room', NULL, 0),
	('south_corridor', 'destiny', 'corridor_basic', 'South Corridor', 'Corridor north of gate room', -1, 2, 1, 4, 0, '{"found":false,"locked":false,"explored":false}', NULL, 'gate_room', NULL, NULL, 0),

	-- Control Interface and Kino Room (to the right of gate room)
	('control_interface', 'destiny', 'control_room', 'Control Interface', 'Ship control systems', 2, -1, 4, 1, 0, '{"found":false,"locked":false,"explored":false}', NULL, NULL, 'kino_room', 'gate_room', 4),
	('kino_room', 'destiny', 'kino_room', 'Kino Room', 'Kino storage and control', 4, -1, 6, 1, 0, '{"found":false,"locked":false,"explored":false}', NULL, NULL, NULL, 'control_interface', 2),

	-- Additional rooms for future expansion (simplified for now)
	('bridge', 'destiny', 'bridge_command', 'Bridge', 'Command center', -1, 4, 1, 6, 0, '{"found":false,"locked":true,"explored":false}', NULL, 'south_corridor', NULL, NULL, 48),
	('medical_bay', 'destiny', 'medical_bay_standard', 'Medical Bay', 'Medical bay', 6, -1, 8, 1, 0, '{"found":false,"locked":true,"explored":false}', NULL, NULL, NULL, 'kino_room', 4),
	('mess_hall', 'destiny', 'mess_hall_standard', 'Mess Hall', 'Mess hall', -6, -1, -4, 1, 0, '{"found":false,"locked":false,"explored":false}', NULL, NULL, 'north_corridor', NULL, 2),

	-- Multi-level rooms (for future expansion)
	('engineering', 'destiny', 'engineering_main', 'Engineering', 'Engineering section', -2, -2, 2, 2, 1, '{"found":false,"locked":false,"explored":false}', NULL, NULL, NULL, NULL, 12),
	('hydroponics', 'destiny', 'hydroponics_bay', 'Hydroponics', 'Hydroponics bay', -2, -2, 2, 2, -1, '{"found":false,"locked":true,"explored":false}', NULL, NULL, NULL, NULL, 6);

-- Doors (updated for new room layout)
INSERT INTO door_templates (id, layout_id, from_room_id, to_room_id, requirements, initial_state, description) VALUES
	-- Main gate room connections
	('door_gate_north', 'destiny', 'gate_room', 'north_corridor', '[]', 'closed', 'North corridor access'),
	('door_gate_south', 'destiny', 'gate_room', 'south_corridor', '[]', 'closed', 'South corridor access'),
	('door_gate_control', 'destiny', 'gate_room', 'control_interface', '[]', 'closed', 'Control interface access'),

	-- Control interface to kino room
	('door_control_kino', 'destiny', 'control_interface', 'kino_room', '[{"type":"technology","value":"kino_systems","description":"Kino room requires functional remote systems","met":false}]', 'locked', 'Kino room - Systems lock'),

	-- Extended connections
	('door_south_bridge', 'destiny', 'south_corridor', 'bridge', '[{"type":"code","value":"bridge_access_code","description":"Bridge requires an access code found in the ship command protocols","met":false}]', 'locked', 'Bridge command center - Code required'),
	('door_north_mess', 'destiny', 'north_corridor', 'mess_hall', '[]', 'closed', 'Mess hall access'),
	('door_kino_medical', 'destiny', 'kino_room', 'medical_bay', '[{"type":"technology","value":"medical_scanner","description":"Medical bay requires functional scanner systems","met":false}]', 'locked', 'Medical bay - Biometric lock');
