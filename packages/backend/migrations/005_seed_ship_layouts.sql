-- Seed Destiny ship layout as normalized room_templates and door_templates

-- Rooms
INSERT INTO room_templates (id, layout_id, type, name, description, position_x, position_y, floor, initial_state, size_factor, connection_north, connection_south, connection_east, connection_west) VALUES
	('gate_room', 'destiny', 'gate_room_large', 'Gate Room', 'Main Stargate room', -1, -1, 0, '{"found":true,"locked":false,"explored":false}', 2, 'corridor_north', 'corridor_south', 'corridor_east', 'corridor_west'),
	('corridor_north', 'destiny', 'corridor_basic', 'North Corridor', 'Corridor north of gate room', 0, 2, 0, '{"found":false,"locked":false,"explored":false}', 1, 'bridge', 'gate_room', NULL, NULL),
	('corridor_south', 'destiny', 'corridor_basic', 'South Corridor', 'Corridor south of gate room', 0, -2, 0, '{"found":false,"locked":false,"explored":false}', 1, 'gate_room', 'damaged_corridor', 'elevator_main', NULL),
	('corridor_east', 'destiny', 'corridor_basic', 'East Corridor', 'Corridor east of gate room', 2, 0, 0, '{"found":false,"locked":false,"explored":false}', 1, NULL, NULL, 'medical_bay', 'gate_room'),
	('corridor_west', 'destiny', 'corridor_basic', 'West Corridor', 'Corridor west of gate room', -2, 0, 0, '{"found":false,"locked":false,"explored":false}', 1, NULL, NULL, 'gate_room', 'mess_hall'),
	('bridge', 'destiny', 'bridge_command', 'Bridge', 'Command center', -1, 3, 0, '{"found":false,"locked":true,"explored":false}', 2, NULL, 'corridor_north', NULL, NULL),
	('damaged_corridor', 'destiny', 'corridor_emergency', 'Damaged Corridor', 'Damaged corridor', -1, -4, 0, '{"found":false,"locked":true,"explored":false}', 1, 'corridor_south', NULL, 'destroyed_storage', NULL),
	('destroyed_storage', 'destiny', 'storage_destroyed', 'Destroyed Storage', 'Destroyed storage room', 0, -4, 0, '{"found":false,"locked":true,"explored":false}', 1, NULL, NULL, NULL, 'damaged_corridor'),
	('medical_bay', 'destiny', 'medical_bay_standard', 'Medical Bay', 'Medical bay', 3, -1, 0, '{"found":false,"locked":true,"explored":false}', 1, NULL, NULL, NULL, 'corridor_east'),
	('mess_hall', 'destiny', 'mess_hall_standard', 'Mess Hall', 'Mess hall', -3, -1, 0, '{"found":false,"locked":false,"explored":false}', 1, NULL, NULL, 'corridor_west', NULL),
	('quarters_a', 'destiny', 'quarters_standard', 'Quarters A', 'Crew quarters A', 2, 1, 0, '{"found":false,"locked":false,"explored":false}', 1, NULL, NULL, NULL, 'corridor_east'),
	('quarters_b', 'destiny', 'quarters_standard', 'Quarters B', 'Crew quarters B', -2, -1, 0, '{"found":false,"locked":false,"explored":false}', 1, NULL, NULL, 'corridor_west', NULL),
	('elevator_main', 'destiny', 'elevator_main', 'Main Elevator', 'Main elevator', 1, -2, 0, '{"found":false,"locked":false,"explored":false}', 1, 'upper_corridor', 'lower_corridor', NULL, 'corridor_south'),
	('upper_corridor', 'destiny', 'corridor_basic', 'Upper Corridor', 'Upper corridor', 0, 0, 1, '{"found":false,"locked":true,"explored":false}', 1, NULL, NULL, 'engineering', 'elevator_main'),
	('engineering', 'destiny', 'engineering_main', 'Engineering', 'Engineering section', -1, -1, 1, '{"found":false,"locked":false,"explored":false}', 2, NULL, NULL, NULL, 'upper_corridor'),
	('lower_corridor', 'destiny', 'corridor_basic', 'Lower Corridor', 'Lower corridor', 1, -2, -1, '{"found":false,"locked":true,"explored":false}', 1, 'elevator_main', NULL, 'hydroponics', 'storage_bay'),
	('hydroponics', 'destiny', 'hydroponics_bay', 'Hydroponics', 'Hydroponics bay', -1, -2, -1, '{"found":false,"locked":true,"explored":false}', 1, NULL, NULL, NULL, 'lower_corridor'),
	('storage_bay', 'destiny', 'storage_bay_standard', 'Storage Bay', 'Storage bay', 2, -3, -1, '{"found":false,"locked":false,"explored":false}', 1, NULL, NULL, NULL, 'lower_corridor'),
	('shuttle_bay', 'destiny', 'shuttle_bay_main', 'Shuttle Bay', 'Shuttle bay', 3, -3, -1, '{"found":false,"locked":true,"explored":false}', 2, NULL, NULL, NULL, 'lower_corridor');

-- Doors
INSERT INTO door_templates (id, layout_id, from_room_id, to_room_id, requirements, initial_state, description) VALUES
	('door_gate_north', 'destiny', 'gate_room', 'corridor_north', '[]', 'closed', 'Northern corridor access'),
	('door_gate_south', 'destiny', 'gate_room', 'corridor_south', '[]', 'closed', 'Southern corridor access'),
	('door_gate_east', 'destiny', 'gate_room', 'corridor_east', '[]', 'closed', 'Eastern corridor access'),
	('door_gate_west', 'destiny', 'gate_room', 'corridor_west', '[]', 'closed', 'Western corridor access'),
	('door_north_bridge', 'destiny', 'corridor_north', 'bridge', '[{"type":"code","value":"bridge_access_code","description":"Bridge requires an access code found in the ship command protocols","met":false}]', 'locked', 'Bridge command center - Code required'),
	('door_south_damaged', 'destiny', 'corridor_south', 'damaged_corridor', '[]', 'locked', 'Damaged corridor - DANGER: Atmospheric breach detected'),
	('door_east_medical', 'destiny', 'corridor_east', 'medical_bay', '[{"type":"technology","value":"medical_scanner","description":"Medical bay requires functional scanner systems","met":false}]', 'locked', 'Medical bay - Biometric lock'),
	('door_elevator_upper', 'destiny', 'elevator_main', 'upper_corridor', '[{"type":"power_level","value":"100","description":"Elevator to upper levels requires full power","met":false},{"type":"technology","value":"elevator_controls","description":"Elevator systems must be operational","met":false}]', 'locked', 'Upper levels - Full power required'),
	('door_elevator_lower', 'destiny', 'elevator_main', 'lower_corridor', '[{"type":"power_level","value":"75","description":"Elevator to lower levels requires significant power","met":false},{"type":"technology","value":"elevator_controls","description":"Elevator systems must be operational","met":false}]', 'locked', 'Lower levels - Power required'),
	('door_lower_hydroponics', 'destiny', 'lower_corridor', 'hydroponics', '[{"type":"story_progress","value":"food_shortage","description":"Access to hydroponics is critical during food shortages","met":false},{"type":"technology","value":"air_recycling","description":"Hydroponics requires functioning life support systems","met":false}]', 'locked', 'Hydroponics bay - Environmental lock'),
	('door_lower_shuttle', 'destiny', 'lower_corridor', 'shuttle_bay', '[{"type":"item","value":"shuttle_repair_kit","description":"Shuttle bay door is damaged and requires repair","met":false},{"type":"crew_skill","value":"pilot_certification","description":"Shuttle bay requires qualified pilot access","met":false}]', 'locked', 'Shuttle bay - Damaged door');
