
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndSeed() {
    console.log('Checking database status...');

    // 1. Check Departments
    const { count: deptCount, error: deptError } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true });

    if (deptError) {
        console.error('Error checking departments:', deptError.message);
    } else {
        console.log(`Departments found: ${deptCount}`);
        if (deptCount === 0) {
            console.log('Seeding departments...');
            const { error: insertError } = await supabase.from('departments').insert([
                { name: 'Fiscal', description: 'Departamento Fiscal' },
                { name: 'Contábil', description: 'Departamento Contábil' },
                { name: 'DP', description: 'Departamento Pessoal' },
                { name: 'Societário', description: 'Departamento Societário' },
                { name: 'Financeiro', description: 'Departamento Financeiro' }
            ]);
            if (insertError) console.error('Error seeding departments:', insertError.message);
            else console.log('Departments seeded successfully.');
        }
    }

    // 2. Check Agents
    const { count: agentCount, error: agentError } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true });

    if (agentError) {
        console.error('Error checking agents:', agentError.message);
    } else {
        console.log(`Agents found: ${agentCount}`);
        if (agentCount === 0) {
            console.log('No agents found. Please use the "Cadastrar Atendente" button in the app to create the first agent.');
        }
    }
}

checkAndSeed();
