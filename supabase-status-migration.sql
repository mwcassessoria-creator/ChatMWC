-- Migration: Add status column for soft delete
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Optional: Update existing rows
UPDATE conversations SET status = 'active' WHERE status IS NULL;
