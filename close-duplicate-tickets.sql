-- Script para fechar tickets duplicados, mantendo apenas o mais recente aberto por conversa
-- Este script fecha automaticamente tickets duplicados que foram criados antes da correção de duplicação

-- Close duplicate open tickets, keeping only the most recent one per conversation
WITH ranked_tickets AS (
  SELECT 
    id,
    conversation_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY conversation_id 
      ORDER BY created_at DESC
    ) as rn
  FROM tickets
  WHERE status = 'open'
)
UPDATE tickets
SET 
  status = 'closed',
  closed_at = NOW(),
  subject = 'Fechado automaticamente - ticket duplicado'
WHERE id IN (
  SELECT id 
  FROM ranked_tickets 
  WHERE rn > 1
);

-- Verificar quantos tickets foram fechados
SELECT 
  conversation_id,
  COUNT(*) as total_tickets,
  SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
  SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_tickets
FROM tickets
GROUP BY conversation_id
HAVING COUNT(*) > 1
ORDER BY total_tickets DESC;
