-- Adicionar novo departamento: Alvarás/Licenças
INSERT INTO departments (name, description)
VALUES ('Alvarás/Licenças', 'Departamento responsável por alvarás e licenças')
ON CONFLICT (name) DO NOTHING;

-- Verificar departamentos existentes
SELECT id, name, description, created_at
FROM departments
ORDER BY name;
