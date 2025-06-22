-- Seed technology templates
-- These define the types of technology that can be found, researched, or used in the game

-- Ship Systems
INSERT INTO technology_templates (id, name, description, category, cost, image) VALUES
	('life_support', 'Life Support Systems', 'Advanced atmospheric recycling and life support technology maintaining breathable air.', 'ship_systems', 100, 'life-support.png'),
	('ftl_drive', 'FTL Drive', 'Faster-than-light propulsion system allowing interstellar travel.', 'ship_systems', 500, 'ftl-drive.png'),
	('shields', 'Energy Shields', 'Protective energy barrier technology defending against attacks and radiation.', 'ship_systems', 300, 'shields.png'),
	('power_core', 'Power Core', 'Advanced energy generation system powering ship operations.', 'ship_systems', 250, 'power-core.png'),
	('navigation', 'Navigation Systems', 'Sophisticated stellar navigation and positioning technology.', 'ship_systems', 150, 'navigation.png'),
	('artificial_gravity', 'Artificial Gravity', 'Gravity generation technology creating comfortable living conditions.', 'ship_systems', 200, 'gravity.png');

-- Ancient Technology
INSERT INTO technology_templates (id, name, description, category, cost, image) VALUES
	('ancient_database', 'Ancient Database', 'Vast repository of Ancient knowledge and technical specifications.', 'ancient_technology', 1000, 'ancient-database.png'),
	('ancient_crystal', 'Ancient Crystal', 'Crystalline technology component used in various Ancient devices.', 'ancient_technology', 50, 'ancient-crystal.png'),
	('stargate_dialer', 'Stargate Dialer', 'Control system for operating Stargate transportation network.', 'ancient_technology', 400, 'stargate-dialer.png'),
	('ancient_interface', 'Ancient Interface', 'Neural interface technology allowing direct mental control of systems.', 'ancient_technology', 300, 'ancient-interface.png'),
	('ascension_device', 'Ascension Device', 'Mysterious technology related to Ancient ascension process.', 'ancient_technology', 2000, 'ascension.png');

-- Weapons
INSERT INTO technology_templates (id, name, description, category, cost, image) VALUES
	('plasma_cannon', 'Plasma Cannon', 'High-energy plasma weapon system for ship defense.', 'weapons', 350, 'plasma-cannon.png'),
	('rail_gun', 'Rail Gun', 'Electromagnetic projectile weapon with devastating kinetic impact.', 'weapons', 400, 'rail-gun.png'),
	('pulse_weapon', 'Pulse Weapon', 'Rapid-fire energy weapon system.', 'weapons', 200, 'pulse-weapon.png'),
	('drone_weapon', 'Drone Weapon', 'Self-guided weapon system with advanced targeting.', 'weapons', 600, 'drone.png');

-- Medical
INSERT INTO technology_templates (id, name, description, category, cost, image) VALUES
	('medical_scanner', 'Medical Scanner', 'Advanced diagnostic equipment for health analysis.', 'medical', 100, 'medical-scanner.png'),
	('healing_device', 'Healing Device', 'Ancient medical technology capable of rapid healing.', 'medical', 800, 'healing-device.png'),
	('sarcophagus', 'Sarcophagus', 'Ancient resurrection and healing chamber with dangerous side effects.', 'medical', 1500, 'sarcophagus.png'),
	('medical_supplies', 'Medical Supplies', 'Standard medical equipment and pharmaceuticals.', 'medical', 50, 'medical-supplies.png');

-- Research & Science
INSERT INTO technology_templates (id, name, description, category, cost, image) VALUES
	('scanner', 'Scanner', 'Multi-purpose scanning device for analysis and detection.', 'research', 75, 'scanner.png'),
	('laboratory', 'Laboratory Equipment', 'Advanced scientific research and analysis equipment.', 'research', 300, 'laboratory.png'),
	('computer_core', 'Computer Core', 'Advanced computational system for data processing and AI.', 'research', 400, 'computer-core.png'),
	('quantum_processor', 'Quantum Processor', 'Quantum computing technology for complex calculations.', 'research', 750, 'quantum-processor.png');

-- Engineering & Maintenance
INSERT INTO technology_templates (id, name, description, category, cost, image) VALUES
	('engineering_tools', 'Engineering Tools', 'Specialized tools for maintenance and construction.', 'engineering', 100, 'engineering-tools.png'),
	('fabricator', 'Fabricator', 'Matter replication technology for manufacturing components.', 'engineering', 500, 'fabricator.png'),
	('repair_drones', 'Repair Drones', 'Automated maintenance systems for ship repairs.', 'engineering', 250, 'repair-drones.png'),
	('naquadah_generator', 'Naquadah Generator', 'Compact high-energy power source using naquadah.', 'engineering', 600, 'naquadah-generator.png');

-- Communication & Sensors
INSERT INTO technology_templates (id, name, description, category, cost, image) VALUES
	('communication_array', 'Communication Array', 'Long-range communication system for interplanetary contact.', 'communication', 200, 'comm-array.png'),
	('sensor_array', 'Sensor Array', 'Advanced detection and scanning system.', 'communication', 250, 'sensor-array.png'),
	('hologram', 'Hologram Projector', 'Three-dimensional display and communication technology.', 'communication', 300, 'hologram.png');

-- Defense Systems
INSERT INTO technology_templates (id, name, description, category, cost, image) VALUES
	('force_field', 'Force Field Generator', 'Energy barrier for area protection and containment.', 'defense', 400, 'force-field.png'),
	('cloaking_device', 'Cloaking Device', 'Advanced stealth technology rendering objects invisible.', 'defense', 1000, 'cloaking.png'),
	('automated_turret', 'Automated Defense Turret', 'Automated weapon system for perimeter defense.', 'defense', 350, 'turret.png');
