
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function debugDepartments() {
    console.log('--- DEBUGGING DEPARTMENTS ---');

    // 1. Get Departments
    const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*');

    if (deptError) {
        console.error('Error fetching departments:', deptError);
        return;
    }

    console.log(`Found ${departments.length} departments:`);
    departments.forEach(d => console.log(`- [${d.id}] ${d.name}`));

    // 2. Count Tickets per Department
    console.log('\n--- TICKETS SUMMARY ---');
    const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select('id, department_id, status, created_at');

    if (ticketError) {
        console.error('Error fetching tickets:', ticketError);
        return;
    }

    console.log(`Total Tickets: ${tickets.length}`);

    // Group by department
    const ticketsByDept = {};
    tickets.forEach(t => {
        const deptId = t.department_id || 'unassigned';
        if (!ticketsByDept[deptId]) ticketsByDept[deptId] = 0;
        ticketsByDept[deptId]++;
    });

    console.log('Tickets by Department ID:');
    console.table(ticketsByDept);

    // 3. Check for mismatched IDs
    console.log('\n--- VERIFICATION ---');
    Object.keys(ticketsByDept).forEach(deptId => {
        if (deptId === 'unassigned') {
            console.log(`⚠️ ${ticketsByDept[deptId]} tickets have NO department assigned.`);
        } else {
            const dept = departments.find(d => d.id === deptId);
            if (dept) {
                console.log(`✅ Department ${dept.name} (${deptId}) has ${ticketsByDept[deptId]} tickets.`);
            } else {
                console.log(`❌ Ticket references unknown Department ID: ${deptId}`);
            }
        }
    });

}

debugDepartments();
