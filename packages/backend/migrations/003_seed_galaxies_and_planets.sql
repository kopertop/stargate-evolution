-- Seed galaxy templates
INSERT INTO galaxy_templates (id, name, description, x, y) VALUES
	('galaxy-milky-way', 'Milky Way', 'The home galaxy of Earth.', 0, 0),
	('galaxy-jades', 'JADES-GS-z14-0', 'A distant galaxy.', 1000, 1000);

-- Seed star system templates
INSERT INTO star_system_templates (id, name, galaxy_id, description, x, y) VALUES
	('system-sol', 'Sol System', 'galaxy-milky-way', 'The home system of Earth.', 0, 0),
	('system-icarus', 'Icarus System', 'galaxy-milky-way', 'Remote system with Icarus planet.', 100, 200),
	('system-destiny', 'Destiny System', 'galaxy-jades', 'System where Destiny is found.', 500, 500);

-- Seed planet templates with stargate address, technology, and resources
INSERT INTO planet_templates (id, name, type, star_system_template_id, description, stargate_address, technology, resources) VALUES
	('planet-earth', 'Earth', 'habitable', 'system-sol', 'Homeworld of humanity.', '["A","B","C","D","E","F","G"]', '["tech-hyperdrive","tech-naquadah"]', '{"naquadah":100,"water":1000,"food":500}'),
	('planet-mars', 'Mars', 'desert', 'system-sol', 'The red planet.', '["H","I","J","K","L","M","N"]', '["tech-terraforming"]', '{"iron":200,"water":50}'),
	('planet-icarus', 'Icarus', 'rocky', 'system-icarus', 'A remote, rocky planet.', '["O","P","Q","R","S","T","U"]', '["tech-ancient"]', '{"ancient_tech":5,"crystals":20}'),
	('planet-destiny', 'Destiny', 'unknown', 'system-destiny', 'Mysterious planet near Destiny.', '["V","W","X","Y","Z","A","B"]', '["tech-unknown"]', '{"unknown_resource":999}');
