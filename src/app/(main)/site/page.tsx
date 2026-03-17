import { SiteSettings } from '@/components/site/SiteSettings'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Configurações do Site | CRM LAX',
    description: 'Gerencie o branding, endereço e domínio do seu site vitrine.',
}

export default function SitePage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground text-center md:text-left">
                    Configurações do Site
                </h1>
                <div className="h-px bg-foreground/25 w-full md:hidden mt-2 mb-6" />
            </div>

            <SiteSettings />
        </div>
    )
}
