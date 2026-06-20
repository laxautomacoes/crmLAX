import { SiteSettings } from '@/components/site/SiteSettings'
import { Metadata } from 'next'
import { getProfile } from '@/app/_actions/profile'
import { createClient } from '@/lib/supabase/server'
import { checkIsDev } from '@/lib/utils/domain'

export const metadata: Metadata = {
    title: 'Configurações do Site | CRM LAX',
    description: 'Gerencie o branding, endereço e domínio do seu site vitrine.',
}

export default async function SitePage() {
    const { profile } = await getProfile()
    let siteUrl = '#'

    if (profile?.tenant_id) {
        const supabase = await createClient()
        const { data: tenant } = await supabase
            .from('tenants')
            .select('slug, custom_domain, custom_domain_verified')
            .eq('id', profile.tenant_id)
            .single()

        if (tenant) {
            const isSuperAdmin = ['superadmin', 'super_admin', 'super administrador'].includes(profile?.role?.toLowerCase() || '');
            if (isSuperAdmin) {
                siteUrl = '/conheca'
            } else if (!checkIsDev() && tenant.custom_domain && tenant.custom_domain_verified) {
                siteUrl = `https://${tenant.custom_domain}`
            } else {
                siteUrl = `/site/${tenant.slug}`
            }
        }
    }

    return <SiteSettings siteUrl={siteUrl} />
}
