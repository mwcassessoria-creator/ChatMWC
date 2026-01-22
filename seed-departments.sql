-- Seed Departments
INSERT INTO departments (name, description) VALUES
    ('Fiscal', 'Departamento Fiscal'),
    ('Contábil', 'Departamento Contábil'),
    ('DP', 'Departamento Pessoal'),
    ('Societário', 'Departamento Societário'),
    ('Financeiro', 'Departamento Financeiro')
ON CONFLICT DO NOTHING;

-- Verification
SELECT * FROM departments;
