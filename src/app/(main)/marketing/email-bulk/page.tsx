import { PageHeader } from '@/components/shared/PageHeader'
import { Metadata } from 'next'
import { getProfile } from '@/app/_actions/profile'
import { redirect } from 'next/navigation'
import { EmailBulkSenderForm } from '@/components/dashboard/tools/EmailBulkSenderForm'
import { EmailBulkHistory } from '@/components/dashboard/tools/EmailBulkHistory'
import { Mail, History } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Disparador de E-mail | CRM LAX',
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
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader 
                title="Disparador de E-mail"
                subtitle="Crie campanhas, gerencie leads e acompanhe os relatórios de envio."
            />

            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Mail className="text-secondary-foreground" size={24} />
                    <h2 className="text-xl font-black text-foreground">Nova Campanha</h2>
                </div>
                <EmailBulkSenderForm 
                    tenantId={profile.tenant_id}
                    profileId={profile.id}
                    isAdmin={isAdmin}
                />
            </section>

            <div className="h-px bg-border/50 w-full" />

            <section className="space-y-4 pb-12">
                <div className="flex items-center gap-2 mb-2">
                    <History className="text-secondary-foreground" size={24} />
                    <h2 className="text-xl font-black text-foreground">Histórico e Relatórios</h2>
                </div>
                <EmailBulkHistory tenantId={profile.tenant_id} />
            </section>
        </div>
    )
}
