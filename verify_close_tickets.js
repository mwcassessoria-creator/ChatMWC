require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function closeAllTickets() {
    console.log('Iniciando encerramento de todos os tickets...');

    // 1. Close all open tickets
    const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .update({
            status: 'closed',
            closed_at: new Date().toISOString()
        })
        .eq('status', 'open')
        .select();

    if (ticketError) {
        console.error('Erro ao fechar tickets:', ticketError);
    } else {
        console.log(`✅ ${tickets?.length || 0} tickets fechados.`);
    }

    // 2. Close all active assignments
    const { data: assignments, error: assignmentError } = await supabase
        .from('conversation_assignments')
        .update({
            status: 'closed',
            closed_at: new Date().toISOString()
        })
        .eq('status', 'active')
        .select();

    if (assignmentError) {
        console.error('Erro ao fechar atribuições:', assignmentError);
    } else {
        console.log(`✅ ${assignments?.length || 0} atribuições fechadas.`);
    }
}

closeAllTickets();
