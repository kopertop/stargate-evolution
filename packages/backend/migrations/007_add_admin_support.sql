-- Add admin support to users table
-- Migration 007: Add admin functionality and set default admin

-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- Set kopertop@gmail.com as the default admin
UPDATE users SET is_admin = TRUE WHERE email = 'kopertop@gmail.com';

-- If the user doesn't exist yet, insert them as admin
INSERT OR IGNORE INTO users (id, email, name, is_admin, created_at, updated_at)
VALUES ('admin-default', 'kopertop@gmail.com', 'Admin', TRUE, strftime('%s','now'), strftime('%s','now'));

-- Update the default admin record to ensure admin flag is set
UPDATE users SET is_admin = TRUE WHERE email = 'kopertop@gmail.com';
