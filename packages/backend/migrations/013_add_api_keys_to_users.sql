-- Add API key field to users table for MCP authentication
-- This allows users to use a persistent API key instead of expiring JWT tokens

ALTER TABLE users ADD COLUMN api_key TEXT;

-- Create index for API key lookups (for performance)
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
