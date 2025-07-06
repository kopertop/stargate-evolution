-- Add NPC access control fields to door_templates table
-- These fields control which doors NPCs can access

ALTER TABLE door_templates ADD COLUMN cleared BOOLEAN DEFAULT FALSE;
ALTER TABLE door_templates ADD COLUMN restricted BOOLEAN DEFAULT FALSE;

-- Add comments for clarity
-- cleared: Track when user opens door for first time (enables NPC access)
-- restricted: Mark doors as user-only (blocks all NPC access)

-- Create index for NPC access queries
CREATE INDEX IF NOT EXISTS idx_door_templates_npc_access ON door_templates(cleared, restricted);