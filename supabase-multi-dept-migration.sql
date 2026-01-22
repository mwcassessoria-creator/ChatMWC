-- Migration: Multi-Department System Enhancements
-- Run this in Supabase SQL Editor

-- 1. Add department_id to conversation_assignments
ALTER TABLE conversation_assignments 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- 2. Allow agent_id to be null (for queued conversations)
DO $$ 
BEGIN
    ALTER TABLE conversation_assignments 
    ALTER COLUMN agent_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. Add priority to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- 4. Add tags to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 5. Add unread_count to conversations
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_department 
ON conversation_assignments(department_id);

CREATE INDEX IF NOT EXISTS idx_conversations_priority 
ON conversations(priority);

CREATE INDEX IF NOT EXISTS idx_conversations_unread 
ON conversations(unread_count) WHERE unread_count > 0;

-- 7. Update existing assignments to have department_id
-- This will populate department_id based on the agent's department
UPDATE conversation_assignments ca
SET department_id = (
  SELECT ad.department_id 
  FROM agent_departments ad 
  WHERE ad.agent_id = ca.agent_id 
  LIMIT 1
)
WHERE ca.department_id IS NULL AND ca.agent_id IS NOT NULL;

-- 8. Create function to get unread count
CREATE OR REPLACE FUNCTION get_unread_count(conv_id UUID, agent_email TEXT)
RETURNS INTEGER AS $$
DECLARE
  last_read TIMESTAMPTZ;
  unread INTEGER;
BEGIN
  -- Get last time agent read this conversation (simplified - you can enhance this)
  -- For now, we'll count messages after the assignment
  SELECT assigned_at INTO last_read
  FROM conversation_assignments
  WHERE conversation_id = conv_id
  AND agent_id = (SELECT id FROM agents WHERE email = agent_email LIMIT 1)
  LIMIT 1;
  
  IF last_read IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*) INTO unread
  FROM messages
  WHERE conversation_id = conv_id
  AND from_me = false
  AND timestamp > last_read;
  
  RETURN unread;
END;
$$ LANGUAGE plpgsql;

-- 9. Add RLS policies for new columns
-- (Policies already allow all, but good to document)

COMMENT ON COLUMN conversation_assignments.department_id IS 'Department this conversation is assigned to';
COMMENT ON COLUMN conversations.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN conversations.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN conversations.unread_count IS 'Number of unread messages';
