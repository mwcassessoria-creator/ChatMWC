-- Migration: Add company column to conversations table
-- Run this in Supabase SQL Editor

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS company TEXT;

COMMENT ON COLUMN conversations.company IS 'Company name associated with the client';
