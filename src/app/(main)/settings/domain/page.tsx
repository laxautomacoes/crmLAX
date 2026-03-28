import { DomainTab } from '@/components/settings/DomainTab'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Configurações de Domínio | CRM LAX',
    description: 'Gerencie o domínio customizado do seu site vitrine.',
}

export default function DomainPage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-[#404F4F] text-center md:text-left">
                    Configurações de Domínio
                </h1>
                <div className="h-px bg-foreground/25 w-full md:hidden mt-2 mb-6" />
            </div>

            <DomainTab />
        </div>
    )
}
