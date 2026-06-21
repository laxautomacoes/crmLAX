import { PageHeader } from '@/components/shared/PageHeader'
import { Metadata } from 'next'
import { getProfile } from '@/app/_actions/profile'
import { redirect } from 'next/navigation'
import { EmailBulkSenderForm } from '@/components/dashboard/tools/EmailBulkSenderForm'

export const metadata: Metadata = {
    title: 'Disparador Email | CRM LAX',
    description: 'Envie e-mails em massa para seus leads e contatos.',
}

export const dynamic = 'force-dynamic'

export default async function EmailBulkPage() {
    const { profile, error } = await getProfile()

    if (error || !profile || !profile.tenant_id) {
        redirect('/login')
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader 
                title="Disparador Email"
                subtitle="Crie campanhas, gerencie leads e acompanhe os relatórios de envio."
            />

            <hr className="hidden md:block border-border" />

            <div className="grid grid-cols-1 gap-6">
                <EmailBulkSenderForm 
                    tenantId={profile.tenant_id}
                    profileId={profile.id}
                    isAdmin={isAdmin}
                />
            </div>
        </div>
    )
}
