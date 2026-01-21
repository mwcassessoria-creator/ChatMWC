-- Create conversation_assignments table to track which agent handled which conversation
CREATE TABLE IF NOT EXISTS conversation_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'transferred')),
    closed_at TIMESTAMPTZ,
    notes TEXT,
    UNIQUE(conversation_id, agent_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assignments_agent ON conversation_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_assignments_conversation ON conversation_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON conversation_assignments(status);

-- Enable RLS
ALTER TABLE conversation_assignments ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on conversation_assignments" ON conversation_assignments FOR ALL USING (true);
