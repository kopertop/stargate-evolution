-- Seed initial galaxies, star systems, and planets

-- Insert Milky Way galaxy
INSERT OR IGNORE INTO galaxies (id, name) VALUES
  ('milkyway', 'Milky Way');

-- Insert Destiny Galaxy (unnamed, but often called "Seed Ship Galaxy")
INSERT OR IGNORE INTO galaxies (id, name) VALUES
  ('destiny-galaxy', 'Destiny Galaxy');

-- Milky Way: Earth system
INSERT OR IGNORE INTO star_systems (id, galaxy_id, name, x, y, description, image) VALUES
  ('sys-earth', 'milkyway', 'Sol System', 0, 0, 'The home system of Earth, containing a yellow dwarf star.', NULL);

-- Milky Way: Icarus system
INSERT OR IGNORE INTO star_systems (id, galaxy_id, name, x, y, description, image) VALUES
  ('sys-icarus', 'milkyway', 'Icarus System', 100, 200, 'Remote system with a planet rich in naquadria, used for the Icarus Project.', NULL);

-- Destiny Galaxy: Destiny system
INSERT OR IGNORE INTO star_systems (id, galaxy_id, name, x, y, description, image) VALUES
  ('sys-destiny', 'destiny-galaxy', 'Destiny System', 500, 500, 'A distant system where the Destiny ship is first encountered by the crew.', NULL);

-- Stars
INSERT OR IGNORE INTO stars (id, star_system_id, name, type, description, image, radius, mass, temperature, luminosity, age) VALUES
  ('star-sol', 'sys-earth', 'Sol', 'yellow dwarf', 'The Sun, a G-type main-sequence star.', NULL, 696340, 1.989e30, 5778, 1.0, 4.6e9),
  ('star-icarus', 'sys-icarus', 'Icarus', 'yellow dwarf', 'Star powering the Icarus planet.', NULL, 700000, 2.0e30, 6000, 1.2, 5.0e9),
  ('star-destiny', 'sys-destiny', 'Unknown', 'yellow dwarf', 'Star near Destiny at the start of the series.', NULL, 700000, 2.0e30, 6000, 1.2, 5.0e9);

-- Planets
INSERT OR IGNORE INTO planets (id, star_system_id, name, type, stargate_id) VALUES
  ('earth', 'sys-earth', 'Earth', 'terrestrial', NULL),
  ('icarus', 'sys-icarus', 'Icarus', 'terrestrial', NULL);

-- Insert required races for foreign key constraints
INSERT OR IGNORE INTO races (id, name) VALUES
  ('ancients', 'Ancients'),
  ('human', 'Human');
