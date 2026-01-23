-- ==========================================
-- UNIFIED CLIENT SCHEMA MIGRATION
-- ==========================================

-- 1. Ensure Customers Table exists and has correct constraints for Single Source of Truth
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,  -- Strict Uniqueness
    company TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for phone lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 2. Update Conversations to link to Customers
-- Add customer_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'customer_id') THEN
        ALTER TABLE conversations ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
        CREATE INDEX idx_conversations_customer ON conversations(customer_id);
    END IF;
END $$;

-- 3. Update Tickets to link to Customers (Denormalization for ease of access)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'customer_id') THEN
        ALTER TABLE tickets ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
        CREATE INDEX idx_tickets_customer ON tickets(customer_id);
    END IF;
END $$;

-- 4. Enable RLS for Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on customers" ON customers;
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true);


-- ==========================================
-- VIEW FOR UNIFIED HISTORY (Optional helper)
-- ==========================================
-- This view joins tickets, conversations and customers
CREATE OR REPLACE VIEW view_full_history AS
SELECT 
    t.id as ticket_id,
    t.status as ticket_status,
    c.name as customer_name,
    c.phone as customer_phone,
    conv.id as conversation_id,
    conv.chat_id,
    t.agent_id,
    t.department_id,
    t.created_at
FROM tickets t
JOIN conversations conv ON t.conversation_id = conv.id
JOIN customers c ON t.customer_id = c.id;
