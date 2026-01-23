require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function checkConversation() {
    console.log('Checking conversation for Eduardo...');

    // 1. Get Customer to get the exact phone
    const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', '%Eduardo%')
        .single();

    if (!customer) {
        console.log('Customer Eduardo not found!');
        return;
    }
    console.log('Customer:', customer);

    const chatId = `${customer.phone}@c.us`;
    console.log('Looking for conversation with chat_id:', chatId);

    // 2. Check Conversation
    const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('chat_id', chatId)
        .single();

    if (!conversation) {
        console.log('❌ NO CONVERSATION FOUND.');
    } else {
        console.log('✅ Conversation found:', conversation);
    }
}

checkConversation();
