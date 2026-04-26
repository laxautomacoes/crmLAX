import { BulkSenderForm } from '@/components/dashboard/tools/BulkSenderForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { Metadata } from 'next'
import { getProfile } from '@/app/_actions/profile'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
    title: 'Disparador de WhatsApp | CRM LAX',
    description: 'Envie mensagens e mídias em massa para seus leads e contatos.',
}

export const dynamic = 'force-dynamic'

export default async function WhatsAppBulkPage() {
    const { profile, error } = await getProfile()

    if (error || !profile || !profile.tenant_id) {
        redirect('/login')
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader 
                title="Disparador em Massa"
                subtitle="Envie mensagens e mídias em massa para seus leads e contatos."
            />

            <div className="grid grid-cols-1 gap-6">
                <BulkSenderForm 
                    tenantId={profile.tenant_id}
                    profileId={profile.id}
                    isAdmin={isAdmin}
                />
            </div>
        </div>
    )
}
