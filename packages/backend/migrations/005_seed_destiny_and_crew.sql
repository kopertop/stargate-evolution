-- Seed Destiny ship, rooms, stargate, technology, and crew

-- Insert Destiny stargate (in stargate room)
INSERT OR IGNORE INTO stargates (id, location_type, location_id, type) VALUES
  ('destiny-stargate', 'room', 'destiny-stargate', 'master');


-- Insert Destiny ship (in Destiny Galaxy)
INSERT OR IGNORE INTO ships (
  id, name, power, max_power, shields, max_shields, hull, max_hull, race_id, stargate_id, location_system_id, location_planet_id
) VALUES (
  'destiny',
  'Destiny',
  1000, 1000, 500, 500, 1000, 1000,
  'ancients',
  'destiny-stargate',
  'sys-destiny',
  NULL
);

-- Insert Destiny rooms
INSERT OR IGNORE INTO rooms (id, ship_id, type) VALUES
  ('destiny-bridge', 'destiny', 'bridge'),
  ('destiny-stargate', 'destiny', 'stargate'),
  ('destiny-engine', 'destiny', 'engine'),
  ('destiny-medbay', 'destiny', 'medbay');

-- Insert Destiny stargate chevrons (example address)
INSERT OR IGNORE INTO chevrons (id, stargate_id, symbol, description, image, position) VALUES
  ('chev-1', 'destiny-stargate', 'A', 'Chevron 1', NULL, 0),
  ('chev-2', 'destiny-stargate', 'B', 'Chevron 2', NULL, 1),
  ('chev-3', 'destiny-stargate', 'C', 'Chevron 3', NULL, 2),
  ('chev-4', 'destiny-stargate', 'D', 'Chevron 4', NULL, 3),
  ('chev-5', 'destiny-stargate', 'E', 'Chevron 5', NULL, 4),
  ('chev-6', 'destiny-stargate', 'F', 'Chevron 6', NULL, 5);

-- Insert Destiny stargate technology
INSERT OR IGNORE INTO technology (id, name, description, unlocked, cost, image) VALUES
  ('stargate', 'Stargate', 'Allows travel via the stargate network.', 1, 0, NULL);

-- Insert Destiny crew
INSERT OR IGNORE INTO people (id, name, race_id, role, location_room_id, location_ship_id, description, image) VALUES
  ('rush', 'Dr. Nicholas Rush', 'human', 'lead scientist', 'destiny-bridge', 'destiny', 'Brilliant but secretive scientist.', NULL),
  ('eli', 'Eli Wallace', 'human', 'jr scientist', 'destiny-bridge', 'destiny', 'Exceptionally gifted with mathematics and computers.', NULL),
  ('young', 'Col. Everett Young', 'human', 'commanding officer', 'destiny-bridge', 'destiny', 'Leader of the Destiny expedition.', NULL),
  ('scott', 'Lt. Matthew Scott', 'human', '2nd in command', 'destiny-bridge', 'destiny', 'Young, resourceful, and loyal officer.', NULL),
  ('greer', 'MSgt. Ronald Greer', 'human', 'security', 'destiny-bridge', 'destiny', 'Tough, loyal, and resourceful marine.', NULL),
  ('chloe', 'Chloe Armstrong', 'human', 'civilian', 'destiny-bridge', 'destiny', 'Daughter of a U.S. Senator, becomes a key member of the crew.', NULL),
  ('tj', 'Lt. Tamara Johansen', 'human', 'medic', 'destiny-medbay', 'destiny', 'Field medic and trusted crew member.', NULL),
  ('volker', 'Dr. Dale Volker', 'human', 'scientist', 'destiny-bridge', 'destiny', 'Astrophysicist, part of the science team.', NULL),
  ('brody', 'Dr. Adam Brody', 'human', 'scientist', 'destiny-bridge', 'destiny', 'Engineer and science team member.', NULL),
  ('park', 'Dr. Lisa Park', 'human', 'scientist', 'destiny-bridge', 'destiny', 'Talented scientist and engineer.', NULL),
  ('james', 'Lt. Vanessa James', 'human', 'security', 'destiny-bridge', 'destiny', 'Security team member.', NULL),
  ('franklin', 'Dr. Jeremy Franklin', 'human', 'scientist', 'destiny-bridge', 'destiny', 'Brilliant but troubled scientist.', NULL),
  ('riley', 'Sgt. Hunter Riley', 'human', 'technician', 'destiny-bridge', 'destiny', 'Technician and support crew.', NULL);
