-- Adicionar novo departamento: Alvarás/Licenças
-- Usando WHERE NOT EXISTS para evitar erro caso não haja constraint unique no nome
INSERT INTO departments (name, description)
SELECT 'Alvarás/Licenças', 'Departamento responsável por alvarás e licenças'
WHERE NOT EXISTS (
    SELECT 1 FROM departments WHERE name = 'Alvarás/Licenças'
);

-- Verificar departamentos existentes
SELECT id, name, description, created_at
FROM departments
ORDER BY name;
