-- Check status for specific phone number
SELECT 
    c.id as conversation_id,
    c.chat_id,
    c.name,
    t.id as ticket_id,
    t.status as ticket_status,
    t.department_id as ticket_dept,
    ca.id as assignment_id,
    ca.status as assignment_status,
    ca.agent_id,
    ca.department_id as assignment_dept,
    d.name as department_name,
    a.name as agent_name
FROM conversations c
LEFT JOIN tickets t ON t.conversation_id = c.id AND t.status = 'open'
LEFT JOIN conversation_assignments ca ON ca.conversation_id = c.id 
LEFT JOIN departments d ON ca.department_id = d.id
LEFT JOIN agents a ON ca.agent_id = a.id
WHERE c.chat_id LIKE '559691765135%'
ORDER BY ca.assigned_at DESC;
