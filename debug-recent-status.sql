-- Check status for the most recent tickets/assignments
SELECT 
    t.id as ticket_id,
    t.status as ticket_status,
    t.department_id as ticket_dept_id,
    d_ticket.name as ticket_dept_name,
    ca.id as assignment_id,
    ca.status as assignment_status,
    ca.agent_id as assignment_agent,
    ca.department_id as assignment_dept_id,
    d_assign.name as assignment_dept_name,
    c.name as customer_name,
    c.phone
FROM tickets t
LEFT JOIN conversation_assignments ca ON ca.conversation_id = t.conversation_id
LEFT JOIN conversations c ON c.id = t.conversation_id
LEFT JOIN departments d_ticket ON t.department_id = d_ticket.id
LEFT JOIN departments d_assign ON ca.department_id = d_assign.id
WHERE t.created_at > NOW() - INTERVAL '1 hour'
ORDER BY t.created_at DESC;

-- Also check the agent "Anderson Gomes" id and departments
SELECT 
    a.id, 
    a.name, 
    d.name as department_name,
    d.id as department_id
FROM agents a
JOIN agent_departments ad ON a.id = ad.agent_id
JOIN departments d ON ad.department_id = d.id
WHERE a.email LIKE 'anderson%'; -- Adjust if email is different, or just list all
