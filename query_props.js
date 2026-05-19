require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, tenant_id');
  console.log("Total properties:", data ? data.length : 0);
  if (data && data.length > 0) {
    console.log("Sample property tenant_id:", data[0].tenant_id);
  }
}
check();
