import { DomainTab } from '@/components/settings/DomainTab'
import { PageHeader } from '@/components/shared/PageHeader'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Domínio | CRM LAX',
    description: 'Gerencie o domínio customizado do seu site vitrine.',
}

export default function DomainPage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <PageHeader title="Domínio" subtitle="Configure um domínio oficial para seu site." />

            <hr className="hidden md:block border-border" />

            <DomainTab />
        </div>
    )
}
