import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data, error } = await supabase
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
    .eq('is_owner_only', false)
    .eq('is_archived', false)
    .limit(3);

  if (error) {
    console.error("ERROR FETCHING CLIENTS:", error);
  } else {
    console.log("SUCCESS FETCHING CLIENTS:", data?.length);
    console.dir(data, { depth: null });
  }
}
run();
