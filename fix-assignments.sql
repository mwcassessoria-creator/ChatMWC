DO $$
DECLARE
    ticket RECORD;
    assignment_id UUID;
BEGIN
    FOR ticket IN 
        SELECT * FROM tickets WHERE status = 'open'
    LOOP
        -- Check for ACTIVE assignment
        SELECT id INTO assignment_id FROM conversation_assignments 
        WHERE conversation_id = ticket.conversation_id AND status = 'active';
        
        IF assignment_id IS NULL THEN
            -- No active assignment found!
            
            -- 1. Try to find a CLOSED assignment to reopen
            SELECT id INTO assignment_id FROM conversation_assignments 
            WHERE conversation_id = ticket.conversation_id 
            ORDER BY assigned_at DESC LIMIT 1;
            
            IF assignment_id IS NOT NULL THEN
                -- Reopen existing assignment
                UPDATE conversation_assignments 
                SET status = 'active', assigned_at = NOW()
                WHERE id = assignment_id;
                RAISE NOTICE 'Reopened assignment % for ticket %', assignment_id, ticket.id;
            ELSE
                -- 2. No assignment exists. Create one if department is known.
                IF ticket.department_id IS NOT NULL THEN
                    INSERT INTO conversation_assignments (conversation_id, department_id, agent_id, status, assigned_at)
                    VALUES (ticket.conversation_id, ticket.department_id, ticket.agent_id, 'active', NOW());
                    RAISE NOTICE 'Created new assignment for ticket %', ticket.id;
                END IF;
            END IF;
        ELSE
             -- Active assignment exists. Ensure department matches if set
             IF ticket.department_id IS NOT NULL THEN
                 UPDATE conversation_assignments 
                 SET department_id = ticket.department_id
                 WHERE id = assignment_id AND department_id IS NULL;
             END IF;
        END IF;
    END LOOP;
END $$;
