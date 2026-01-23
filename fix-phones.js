require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function fixPhones() {
    console.log('Sanitizing customer phones...');

    // Fetch all customers
    const { data: customers, error } = await supabase
        .from('customers')
        .select('*');

    if (error) {
        console.error('Error fetching customers:', error);
        return;
    }

    for (const c of customers) {
        if (!c.phone) continue;

        let clean = c.phone.replace(/\D/g, '');
        let changed = false;

        // Add 55 if missing and looks like BR number
        if (clean.length >= 10 && clean.length <= 11) {
            clean = '55' + clean;
            changed = true;
        }

        // Only update if changed OR if original had special chars (we want clean digits in DB ideally)
        // But for now, let's just ensure 55 is there.
        // Actually the previous logic allowed spaces. Let's strictly update if we added 55.
        // Or if the stored value is different from 'clean' (which strips formatting). 
        // Let's standardise to numbers only?
        // The screenshot showed "96 98116-0476".
        // Use clean version.

        if (clean !== c.phone) {
            console.log(`Fixing ${c.name}: ${c.phone} -> ${clean}`);

            // Check for conflict (if sanitized version already exists)
            const { data: existing } = await supabase
                .from('customers')
                .select('id')
                .eq('phone', clean)
                .neq('id', c.id)
                .single();

            if (existing) {
                console.warn(`Skipping ${c.name}, phone ${clean} already taken by another user.`);
                continue;
            }

            const { error: updateError } = await supabase
                .from('customers')
                .update({ phone: clean })
                .eq('id', c.id);

            if (updateError) console.error(`Failed to update ${c.name}:`, updateError);
            else console.log(`Updated ${c.name}.`);
        }
    }
}

fixPhones();
