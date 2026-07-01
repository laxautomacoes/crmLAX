require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, tenant_id, role')
    .limit(1)
    .single();
    
  console.log("Profile:", profile);

  if (profile) {
    const { data: props, error } = await supabase
      .from('properties')
      .select('id, tenant_id')
      .eq('tenant_id', profile.tenant_id);
    console.log("Properties for this tenant:", props ? props.length : 0);
  }
}

test();
