-- Delete old messages that don't have a ticket_id (legacy messages from before ticket system)
DELETE FROM messages 
WHERE ticket_id IS NULL;

-- Verify - should show 0 messages without ticket_id
SELECT 
    COUNT(*) as total_messages,
    COUNT(ticket_id) as messages_with_ticket,
    COUNT(*) - COUNT(ticket_id) as messages_without_ticket
FROM messages;
