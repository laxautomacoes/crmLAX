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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <h1 className="text-2xl font-bold text-foreground text-center md:text-left">
                        Configurações do Site
                    </h1>
                    {siteUrl !== '#' && (
                        <a 
                            href={siteUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1 bg-secondary/10 hover:bg-secondary/20 text-secondary text-sm font-bold rounded-full transition-colors self-center md:self-auto"
                        >
                            <ExternalLink size={14} />
                            Ver site
                        </a>
                    )}
                </div>
                <div className="h-px bg-foreground/25 w-full md:hidden mt-2 mb-6" />
            </div>

            <SiteSettings />
        </div>
    )
}
