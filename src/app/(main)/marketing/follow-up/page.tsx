import { Metadata } from 'next'
import { getProfile } from '@/app/_actions/profile'
import { redirect } from 'next/navigation'
import FollowUpDashboard from '@/components/marketing/FollowUpDashboard'
import { PageHeader } from '@/components/shared/PageHeader'

export const metadata: Metadata = {
    title: 'Follow-Up Programável | CRM LAX',
    description: 'Automatize o acompanhamento dos seus leads com sequências de mensagens programáveis.',
}

export const dynamic = 'force-dynamic'

export default async function FollowUpPage() {
    const { profile, error } = await getProfile()

    if (error || !profile || !profile.tenant_id) {
        redirect('/login')
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader
                title="Follow-Up Programável"
                subtitle="Crie sequências automatizadas de mensagens para nutrir seus leads."
            />

            <FollowUpDashboard
                tenantId={profile.tenant_id}
                profileId={profile.id}
                isAdmin={isAdmin}
                userRole={profile.role}
            />
        </div>
    )
}
