-- Create users table for authentication
-- This table is already referenced in the existing auth code in index.ts

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  image TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index for created_at for potential sorting/pagination
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Add myself as the admin user
INSERT OR IGNORE INTO users (id, email, name, is_admin, created_at, updated_at)
VALUES (
	'104484237747096649136',
	'kopertop@gmail.com',
	'Chris Moyer',
	TRUE,
	strftime('%s','now'),
	strftime('%s','now')
);