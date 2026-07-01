require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('properties')
    .select(`
        *,
        owner_contact:contacts!owner_contact_id (
            id,
            name,
            contact_type
        ),
        created_by_profile:profiles!created_by (
            id,
            full_name,
            whatsapp_number,
            avatar_url
        )
    `)
    .eq('is_archived', false)
    .limit(5);
    
  console.log("Data:", data ? data.length : "null");
  console.log("Error:", error);
}

test();
