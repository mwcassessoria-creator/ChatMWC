-- Check if the ticket and assignment have the correct department_id
-- This will help diagnose if the department selection was saved properly

-- 1. Check tickets with their departments
SELECT 
    t.id as ticket_id,
    t.status,
    t.conversation_id,
    c.chat_id,
    c.name,
    d.name as department_name,
    a.name as agent_name
FROM tickets t
LEFT JOIN conversations c ON t.conversation_id = c.id
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN agents a ON t.agent_id = a.id
WHERE t.status = 'open'
ORDER BY t.created_at DESC;

-- 2. Check conversation_assignments with departments
SELECT 
    ca.id as assignment_id,
    ca.status,
    c.chat_id,
    c.name as conversation_name,
    d.name as department_name,
    a.name as agent_name
FROM conversation_assignments ca
LEFT JOIN conversations c ON ca.conversation_id = c.id
LEFT JOIN departments d ON ca.department_id = d.id
LEFT JOIN agents a ON ca.agent_id = a.id
WHERE ca.status = 'active'
ORDER BY ca.assigned_at DESC;
