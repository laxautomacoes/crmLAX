import { SiteSettings } from '@/components/site/SiteSettings'
import { Metadata } from 'next'
import { getProfile } from '@/app/_actions/profile'
import { createClient } from '@/lib/supabase/server'
import { ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'

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
            siteUrl = isSuperAdmin ? '/conheca' : `/site/${tenant.slug}`
        }
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader title="Configurações do Site">
                {siteUrl !== '#' && (
                    <a 
                        href={siteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-secondary hover:opacity-90 text-secondary-foreground rounded-lg transition-all text-sm font-bold shadow-sm active:scale-[0.99] whitespace-nowrap"
                    >
                        <ExternalLink size={16} />
                        Ver site
                    </a>
                )}
            </PageHeader>

            <SiteSettings />
        </div>
    )
}
