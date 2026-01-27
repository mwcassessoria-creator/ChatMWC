require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTickets() {
    console.log('Testing Tickets Query...');

    // Test 1: Simple Select
    const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting * from tickets:', error);
    } else {
        console.log('Success selecting *:', Object.keys(data[0] || {}));
    }

    // Test 2: The exact query causing error
    console.log('\nTesting Full Query...');
    try {
        const { data: tickets, error: fullError } = await supabase
            .from('tickets')
            .select(`
                id,
                status,
                created_at,
                subject,
                priority,
                department_id,
                agent_id,
                conversation_id,
                conversations (
                    id,
                    name,
                    phone
                ),
                agents (
                    id,
                    name
                ),
                departments (
                    id,
                    name
                )
            `)
            .limit(1);

        if (fullError) {
            console.error('Full Query Error:', fullError);
        } else {
            console.log('Full Query Success!');
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

checkTickets();
