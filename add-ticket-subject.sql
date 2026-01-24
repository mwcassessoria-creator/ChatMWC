-- Add subject column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS subject TEXT;
