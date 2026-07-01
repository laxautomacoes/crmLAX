const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    let query = supabase
        .from('contacts')
        .select(`
      *,
      leads (
        * ,
        profiles:assigned_to (
            full_name
        ),
        properties (
            id,
            title,
            price,
            type,
            details
        ),
        lead_stages (
            name,
            color
        ),
        interactions (
            content,
            type,
            created_at
        ),
        proposals ( id )
      )
    `)
        .eq('tenant_id', 'fab0d1cb-a25f-46b6-a8a1-3b153cd8f743')
        .order('created_at', { ascending: false })
        .eq('is_owner_only', false);

    const { data: contacts, error } = await query;
    console.log("Error:", error?.message);
    console.log("Contacts count:", contacts?.length);
}
test();
