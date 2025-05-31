-- Add technology templates that can be found in rooms
INSERT INTO technology_templates (id, name, description, category, unlock_requirements, cost, image) VALUES
	(
		'stargate_device',
		'Stargate',
		'Ancient ring device capable of instantaneous travel across vast distances',
		'stargate',
		'[]',
		0,
		'stargate.png'
	),
	(
		'kino',
		'Kino',
		'Small reconnaissance probe with camera and communication capabilities',
		'reconnaissance',
		'[]',
		0,
		'kino.png'
	),
	(
		'kino_systems',
		'Kino Control Systems',
		'Ship-based systems for managing multiple Kinos',
		'ship_systems',
		'[{"type":"technology","value":"kino_remote","description":"Requires basic kino remote functionality","met":false}]',
		0,
		'kino-systems.png'
	),
	(
		'kino_remote',
		'Kino Remote',
		'Handheld device for controlling and viewing Kino feeds',
		'ship_systems',
		'[]',
		0,
		'kino-remote.png'
	),
	(
		'oxygen_canister',
		'Oxygen Canister',
		'Canister containing oxygen for the ship',
		'consumable',
		'[]',
		0,
		'oxygen-canister.png'
	),
	(
		'ancient_tech',
		'Ancient Tech',
		'Ancient technology parts, used to repair the ship',
		'consumable',
		'[]',
		0,
		'ancient-tech.png'
	),
	(
		'parts',
		'Parts',
		'Spare parts',
		'consumable',
		'[]',
		0,
		'ship-parts.png'
	)
	;

-- Populate room_technology with items found in specific rooms
INSERT INTO room_technology (id, room_id, technology_template_id, count, description) VALUES
	-- Stargate in the gate room (already discovered/visible)
	('rt_gate_stargate', 'gate_room', 'stargate_device', 1, 'The main Stargate ring device in the gate room'),

	-- Kinos in the kino room (need to be discovered through exploration)
	('rt_kino_storage_1', 'kino_room', 'kino', 5, 'Collection of reconnaissance Kinos in storage'),
	('rt_kino_storage_2', 'kino_room', 'kino', 3, 'Additional Kinos in charging station'),

	-- Kino remote in control interface (needs exploration to find)
	('rt_control_kino_remote', 'control_interface', 'kino_remote', 1, 'Handheld Kino remote control device'),

	-- Kino systems in the kino room (advanced system, requires exploration)
	('rt_kino_control_sys', 'kino_room', 'kino_systems', 1, 'Central Kino management and control systems');
