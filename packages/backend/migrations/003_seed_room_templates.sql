-- Seed room templates extracted from game-service.ts
-- These are the room "blueprints" that games will be created from

-- Gate Room Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'gate_room_large',
  'gate_room',
  'Stargate Room',
  'Large chamber housing the Stargate with dialing computer and shield controls. The heart of the ship.',
  3, 3,
  '["stargate", "dialing_computer", "shields"]',
  'stargate-room.png',
  4,
  'ok'
);

-- Basic Corridor Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'corridor_basic',
  'corridor',
  'Basic Corridor',
  'Standard ship corridor with basic lighting and atmospheric sensors.',
  1, 1,
  '["lighting", "atmosphere_sensors"]',
  'corridor.png',
  1,
  'ok'
);

-- Emergency Corridor Template (for damaged areas)
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'corridor_emergency',
  'corridor',
  'Emergency Corridor',
  'Damaged corridor with only emergency lighting systems functional.',
  1, 1,
  '["emergency_lighting"]',
  'corridor.png',
  1,
  'damaged'
);

-- Bridge Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'bridge_command',
  'bridge',
  'Command Bridge',
  'Ship command center with FTL controls, sensors, communications, and navigation systems.',
  2, 2,
  '["ftl_drive_controls", "sensors", "communications", "navigation"]',
  'bridge.png',
  3,
  'ok'
);

-- Medical Bay Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'medical_bay_standard',
  'medical_bay',
  'Medical Bay',
  'Advanced medical facility with scanners, healing pods, and surgical equipment.',
  1, 2,
  '["medical_scanners", "healing_pods", "surgical_equipment"]',
  'medical-bay.png',
  3,
  'ok'
);

-- Mess Hall Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'mess_hall_standard',
  'mess_hall',
  'Mess Hall',
  'Crew dining area with food processors and water recycling systems.',
  1, 2,
  '["food_processors", "water_recycling"]',
  'mess-hall.png',
  2,
  'ok'
);

-- Crew Quarters Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'quarters_standard',
  'quarters',
  'Crew Quarters',
  'Living quarters with personal storage and sleep pods for crew members.',
  1, 1,
  '["personal_storage", "sleep_pods"]',
  'quarters.png',
  2,
  'ok'
);

-- Elevator Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'elevator_main',
  'elevator',
  'Main Elevator',
  'Primary elevator system connecting different ship levels with artificial gravity controls.',
  1, 1,
  '["elevator_controls", "artificial_gravity"]',
  'elevator.png',
  1,
  'ok'
);

-- Engineering Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'engineering_main',
  'engineering',
  'Main Engineering',
  'Primary engineering section with power systems, FTL drive, life support, and reactor controls.',
  2, 2,
  '["power_systems", "ftl_drive", "life_support", "reactor_controls"]',
  'engineering.png',
  4,
  'ok'
);

-- Hydroponics Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'hydroponics_bay',
  'hydroponics',
  'Hydroponics Bay',
  'Agricultural facility with growing systems, air recycling, and water filtration.',
  2, 1,
  '["growing_systems", "air_recycling", "water_filtration"]',
  'hydroponics.png',
  3,
  'ok'
);

-- Storage Bay Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'storage_bay_standard',
  'storage',
  'Storage Bay',
  'Cargo storage area with automated systems and inventory management.',
  1, 2,
  '["cargo_systems", "inventory_management"]',
  'storage.png',
  2,
  'ok'
);

-- Destroyed Storage Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'storage_destroyed',
  'storage',
  'Destroyed Storage',
  'Completely destroyed storage room open to space. Extremely dangerous.',
  1, 1,
  '[]',
  'storage.png',
  1,
  'destroyed'
);

-- Shuttle Bay Template
INSERT INTO room_templates (
  id, type, name, description, grid_width, grid_height,
  technology, image, base_exploration_time, default_status
) VALUES (
  'shuttle_bay_main',
  'shuttle_bay',
  'Main Shuttle Bay',
  'Primary shuttle hangar with docking systems and hangar controls.',
  2, 2,
  '["shuttle_systems", "docking_clamps", "hangar_controls"]',
  'shuttle-bay.png',
  3,
  'damaged'
);
