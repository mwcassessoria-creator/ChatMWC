-- Add password_hash column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add first_login flag
ALTER TABLE agents ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;
