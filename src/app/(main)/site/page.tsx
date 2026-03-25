import { SiteSettings } from '@/components/site/SiteSettings'
import { Metadata } from 'next'
import { getProfile } from '@/app/_actions/profile'
import { createClient } from '@/lib/supabase/server'
import { ExternalLink } from 'lucide-react'

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
            siteUrl = `/site/${tenant.slug}`
        }
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <div className="flex flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground">
                    Configurações do Site
                </h1>
                
                {siteUrl !== '#' && (
                    <a 
                        href={siteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground hover:opacity-90 text-sm font-bold rounded-lg transition-all active:scale-95 shadow-sm"
                    >
                        <ExternalLink size={16} />
                        Ver site
                    </a>
                )}
            </div>
            <div className="h-px bg-foreground/10 w-full" />

            <SiteSettings />
        </div>
    )
}
