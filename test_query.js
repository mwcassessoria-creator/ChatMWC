
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function testQuery() {
    // ID from previous debug output for "Contábil"
    const deptId = '2a190ce6-7e9b-47b8-8382-156ed46dc486';
    console.log(`--- TESTING QUERY FOR DEPT: ${deptId} ---`);

    const { data: tickets, error } = await supabase
        .from('tickets')
        .select(`
            id,
            status,
            created_at,
            agent_id,
            department_id,
            conversations (
                id,
                name,
                phone,
                last_message_at,
                unread_count
            ),
            agents (
                name
            )
        `)
        .eq('department_id', deptId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Query Error:', error);
        return;
    }

    console.log(`Raw Results Count: ${tickets.length}`);

    // Simulate formatting
    const conversations = tickets.map(ticket => ({
        conversation_id: ticket.conversations?.id,
        id: ticket.id,
        status: ticket.status,
        created_at: ticket.created_at,
        conversations: ticket.conversations,
        agents: ticket.agents
    })).filter(t => t.conversations);

    console.log(`Formatted Results Count: ${conversations.length}`);

    if (conversations.length > 0) {
        console.log('First Item Sample:', JSON.stringify(conversations[0], null, 2));
    } else {
        console.log('Original tickets sample (why was it filtered?):');
        console.log(JSON.stringify(tickets[0], null, 2));
    }
}

testQuery();
