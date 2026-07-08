import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  const { data: tenants } = await supabase.from('tenants').select('id, slug, branding').limit(1);
  if (tenants && tenants.length > 0) {
    const tenantId = tenants[0].id;
    console.log("Tenant:", tenants[0]);
    const { data: emailSettings } = await supabase.from('email_settings').select('*').eq('tenant_id', tenantId).single();
    console.log("Email Settings:", emailSettings);
  } else {
    console.log("No tenants found.");
  }
}
main();
