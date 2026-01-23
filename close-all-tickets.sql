-- Close all open tickets
UPDATE tickets 
SET 
    status = 'closed',
    closed_at = NOW()
WHERE status = 'open';

-- Close all active assignments
UPDATE conversation_assignments
SET 
    status = 'closed',
    closed_at = NOW()
WHERE status = 'active';

-- Verify results
SELECT 
    'Tickets' as table_name,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count
FROM tickets
UNION ALL
SELECT 
    'Assignments' as table_name,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count
FROM conversation_assignments;
