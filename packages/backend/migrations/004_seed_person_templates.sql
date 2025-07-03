-- Seed person templates extracted from game-service.ts
-- These are the crew member "archetypes" that games will be created from

-- First, create the race templates that person templates reference
INSERT INTO race_templates (
	id, name, description, default_technology, default_ships
) VALUES (
	'human',
	'Human',
	'Humans from Earth, part of the Stargate program with advanced technology and military training.',
	'["weapons", "medical", "engineering"]',
	'["destiny"]'
);

INSERT INTO race_templates (
	id, name, description, default_technology, default_ships
) VALUES (
	'ancients',
	'Ancients',
	'Advanced race that built the Stargate network and ships like Destiny. Masters of technology.',
	'["stargate", "ftl_drive", "ancient_technology", "shields"]',
	'["destiny", "atlantis"]'
);

-- Colonel Young - Commanding Officer
INSERT INTO person_templates (
	id, name, role, race_template_id, skills, description, image, default_location
) VALUES (
	'colonel_young',
	'Colonel Young',
	'commanding_officer',
	'human',
	'["leadership", "military_tactics", "weapons"]',
	'Commanding officer of the Destiny expedition. Military leader with extensive combat experience.',
	'colonel-young.png',
	'{"shipId": "destiny"}'
);

-- Eli Wallace - Systems Specialist
INSERT INTO person_templates (
	id, name, role, race_template_id, skills, description, image, default_location
) VALUES (
	'eli_wallace',
	'Eli Wallace',
	'systems_specialist',
	'human',
	'["ancient_technology", "computer_systems", "mathematics"]',
	'Brilliant young mathematician and gamer recruited for his problem-solving abilities.',
	'eli-wallace.png',
	'{"shipId": "destiny"}'
);

-- Dr. Nicholas Rush - Chief Scientist
INSERT INTO person_templates (
	id, name, role, race_template_id, skills, description, image, default_location
) VALUES (
	'dr_rush',
	'Dr. Nicholas Rush',
	'chief_scientist',
	'human',
	'["ancient_technology", "physics", "engineering"]',
	'Brilliant but obsessive scientist specializing in Ancient technology.',
	'dr-rush.png',
	'{"shipId": "destiny"}'
);

-- Lt. Matthew Scott - Military Officer
INSERT INTO person_templates (
	id, name, role, race_template_id, skills, description, image, default_location
) VALUES (
	'lt_scott',
	'Lt. Matthew Scott',
	'military_officer',
	'human',
	'["military_tactics", "piloting", "reconnaissance"]',
	'Young military officer and pilot with strong leadership potential.',
	'lt-scott.png',
	'{"shipId": "destiny"}'
);

-- Sergeant Greer - Security Chief
INSERT INTO person_templates (
	id, name, role, race_template_id, skills, description, image, default_location
) VALUES (
	'sergeant_greer',
	'Sergeant Greer',
	'security_chief',
	'human',
	'["weapons", "security", "combat"]',
	'Tough marine sergeant responsible for ship security and combat operations.',
	'greer.png',
	'{"shipId": "destiny"}'
);

-- Dr. Tamara James - Chief Medical Officer
INSERT INTO person_templates (
	id, name, role, race_template_id, skills, description, image, default_location
) VALUES (
	'dr_james',
	'Dr. Tamara James',
	'chief_medical_officer',
	'human',
	'["medical", "surgery", "biology"]',
	'Chief medical officer responsible for crew health and medical research.',
	'dr-james.png',
	'{"shipId": "destiny"}'
);

-- Dr. Lisa Park - Scientist
INSERT INTO person_templates (
	id, name, role, race_template_id, skills, description, image, default_location
) VALUES (
	'dr_park',
	'Dr. Lisa Park',
	'scientist',
	'human',
	'["biology", "medical", "research"]',
	'Scientist specializing in biological research and environmental analysis.',
	'dr-park.png',
	'{"shipId": "destiny"}'
);

-- Chloe Armstrong - Civilian
INSERT INTO person_templates (
	id, name, role, race_template_id, skills, description, image, default_location
) VALUES (
	'chloe_armstrong',
	'Chloe Armstrong',
	'civilian',
	'human',
	'["diplomacy", "linguistics", "research"]',
	'Civilian member of the expedition with diplomatic and research skills.',
	'chloe-armstrong.png',
	'{"shipId": "destiny"}'
);
