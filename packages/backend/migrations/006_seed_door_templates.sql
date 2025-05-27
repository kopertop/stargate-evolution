-- Seed door templates extracted from game-service.ts
-- These define different types of doors and their access requirements

-- Basic Door - Standard ship door
INSERT INTO door_templates (
  id, name, requirements, default_state, description
) VALUES (
  'basic_door',
  'Basic Door',
  '[]',
  'closed',
  'Standard ship door with no special requirements'
);

-- Code Locked Door - Requires access code
INSERT INTO door_templates (
  id, name, requirements, default_state, description
) VALUES (
  'code_locked_door',
  'Code Locked Door',
  '[
    {
      "type": "code",
      "value": "access_code",
      "description": "Requires an access code",
      "met": false
    }
  ]',
  'locked',
  'Door requiring a specific access code to unlock'
);

-- Biometric Door - Requires technology/scanner
INSERT INTO door_templates (
  id, name, requirements, default_state, description
) VALUES (
  'biometric_door',
  'Biometric Door',
  '[
    {
      "type": "technology",
      "value": "scanner_system",
      "description": "Requires functional biometric scanner",
      "met": false
    }
  ]',
  'locked',
  'Door with biometric lock requiring scanner technology'
);

-- Power Door - Requires ship power level
INSERT INTO door_templates (
  id, name, requirements, default_state, description
) VALUES (
  'power_door',
  'Power Door',
  '[
    {
      "type": "power_level",
      "value": "75",
      "description": "Requires significant ship power",
      "met": false
    }
  ]',
  'locked',
  'Heavy door requiring significant power to operate'
);

-- Environmental Door - Requires life support systems
INSERT INTO door_templates (
  id, name, requirements, default_state, description
) VALUES (
  'environmental_door',
  'Environmental Door',
  '[
    {
      "type": "technology",
      "value": "life_support",
      "description": "Requires functioning life support systems",
      "met": false
    }
  ]',
  'locked',
  'Door with environmental seals requiring life support'
);

-- Emergency Door - Dangerous area access
INSERT INTO door_templates (
  id, name, requirements, default_state, description
) VALUES (
  'emergency_door',
  'Emergency Door',
  '[
    {
      "type": "story_progress",
      "value": "emergency_override",
      "description": "Emergency override required for dangerous areas",
      "met": false
    }
  ]',
  'locked',
  'Emergency sealed door protecting against atmospheric hazards'
);

-- Damaged Door - Requires repair
INSERT INTO door_templates (
  id, name, requirements, default_state, description
) VALUES (
  'damaged_door',
  'Damaged Door',
  '[
    {
      "type": "item",
      "value": "repair_kit",
      "description": "Door is damaged and requires repair",
      "met": false
    }
  ]',
  'locked',
  'Damaged door requiring repair before it can be opened'
);

-- Skill Door - Requires crew with specific skills
INSERT INTO door_templates (
  id, name, requirements, default_state, description
) VALUES (
  'skill_door',
  'Skill Door',
  '[
    {
      "type": "crew_skill",
      "value": "engineering",
      "description": "Requires crew member with engineering skills",
      "met": false
    }
  ]',
  'locked',
  'Door requiring specific crew skills to operate'
);
