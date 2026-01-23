require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function wipeData() {
    console.log('🚨 STARTING FULL DATA WIPE 🚨');

    try {
        // 1. Delete Messages (Child of Conversations/Tickets)
        console.log('Deleting Messages...');
        const { error: msgError } = await supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (msgError) console.error('Error deleting messages:', msgError);

        // 2. Delete Tickets (Child of Conversations, references Agents/Depts)
        console.log('Deleting Tickets...');
        const { error: ticketError } = await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (ticketError) console.error('Error deleting tickets:', ticketError);

        // 3. Delete Assignments (Child of Conversations)
        console.log('Deleting Assignments...');
        const { error: assignError } = await supabase.from('conversation_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (assignError) console.error('Error deleting assignments:', assignError);

        // 4. Delete Conversations (Child of Customers - logically, though currently independent)
        console.log('Deleting Conversations...');
        const { error: convError } = await supabase.from('conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (convError) console.error('Error deleting conversations:', convError);

        // 5. Delete Customers
        console.log('Deleting Customers...');
        const { error: custError } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (custError) console.error('Error deleting customers:', custError);

        console.log('✅ DATA WIPE COMPLETE');
    } catch (error) {
        console.error('❌ FATAL ERROR DURING WIPE:', error);
    }
}

wipeData();
