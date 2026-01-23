require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function findEduardo() {
    console.log('Searching for Eduardo...');
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', '%Eduardo%');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Found customers:', JSON.stringify(data, null, 2));
    }
}

findEduardo();
