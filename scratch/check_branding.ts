
import { createClient } from './src/lib/supabase/server'

async function checkBranding() {
    const supabase = await createClient()
    const { data: tenant } = await supabase
        .from('tenants')
        .select('slug, branding')
        .eq('slug', 'lax')
        .maybeSingle()
    
    console.log('TENANT:', tenant?.slug)
    console.log('BRANDING:', JSON.stringify(tenant?.branding, null, 2))
}

checkBranding().catch(console.error)
