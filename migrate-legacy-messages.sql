-- Instead of deleting, associate old messages to a legacy ticket
-- This preserves history while keeping the new ticket system clean

-- For each conversation that has messages without ticket_id,
-- create a "legacy" closed ticket and associate those messages to it

DO $$
DECLARE
    conv RECORD;
    legacy_ticket_id UUID;
BEGIN
    -- Loop through conversations that have messages without ticket_id
    FOR conv IN 
        SELECT DISTINCT conversation_id 
        FROM messages 
        WHERE ticket_id IS NULL
    LOOP
        -- Create a legacy ticket for this conversation
        INSERT INTO tickets (conversation_id, status, created_at, closed_at)
        VALUES (conv.conversation_id, 'closed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
        RETURNING id INTO legacy_ticket_id;
        
        -- Associate all messages without ticket_id to this legacy ticket
        UPDATE messages
        SET ticket_id = legacy_ticket_id
        WHERE conversation_id = conv.conversation_id
        AND ticket_id IS NULL;
        
        RAISE NOTICE 'Created legacy ticket % for conversation %', legacy_ticket_id, conv.conversation_id;
    END LOOP;
END $$;

-- Verify - should show 0 messages without ticket_id
SELECT 
    COUNT(*) as total_messages,
    COUNT(ticket_id) as messages_with_ticket,
    COUNT(*) - COUNT(ticket_id) as messages_without_ticket
FROM messages;
