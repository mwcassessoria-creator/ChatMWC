-- Diagnostic: Check tickets status and departments
SELECT 
    t.id, 
    t.status, 
    t.created_at, 
    t.closed_at,
    d.name as department
FROM tickets t
LEFT JOIN departments d ON t.department_id = d.id
ORDER BY t.created_at DESC;
