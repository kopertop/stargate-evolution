-- Seed Destiny ship layout with coordinate-based room system
-- Designed specifically for Swift SpriteKit with 32-point grid system
-- Coordinate system: (0,0) at center, positive X right, positive Y down
-- Canvas: 1200x800 with 32-point grid, center at (600,400) in canvas coordinates

-- ====================
-- FLOOR 0 (Main Deck)
-- ====================

-- Gate Room - Central hub (Floor 0)
-- 8 grid units wide (8 * 32 = 256 points), 4 grid units tall (4 * 32 = 128 points)
-- Centered at (0,0) in SpriteKit coordinates
-- startX = -128, endX = 128, startY = -64, endY = 64
INSERT INTO room_templates (
	id, layout_id, type, name, description,
	startX, endX, startY, endY, floor,
	found, locked, explored, image, base_exploration_time, status
) VALUES (
	'gate_room', 'destiny', 'gate_room', 'Gate Room',
	'Central chamber housing the Stargate. Primary transportation hub connecting to other worlds.',
	-400, 400, -200, 200, 0,
	TRUE, FALSE, TRUE, 'stargate-room.png', 5, 'ok'
);

-- ====================
-- ROOM FURNITURE - Stargate
-- ====================

-- Add a stargate in the Gate Room
-- Room-relative coordinates: slightly left of center (-32, 0) with standard stargate size
-- The room is 1024x256 points, so center is at (0,0) in room coordinates
INSERT INTO room_furniture (
	id, room_id, furniture_type, name, description,
	x, y, z, width, height, rotation,
	image, interactive, power_required, active
) VALUES (
	'gate_room_stargate', 'gate_room', 'stargate', 'Ancient Stargate',
	'Ancient stargate device for interplanetary travel. The primary means of transportation between worlds.',
	-32, 0, 1, 64, 64, 0,
	'stargate.png', 1, 0, 1
);
