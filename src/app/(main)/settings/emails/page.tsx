import { PageHeader } from '@/components/shared/PageHeader'
import { EmailSettingsForm } from '@/components/settings/emails/EmailSettingsForm'

export const metadata = {
    title: 'E-mail | CRM LAX',
    description: 'Personalize o visual e os textos dos e-mails enviados pelo sistema.',
}

export default function EmailSettingsPage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <PageHeader 
                title="Configurações de E-mail" 
                subtitle="Personalize a identidade visual e os templates das comunicações automáticas da sua imobiliária."
            />
            
            <EmailSettingsForm />
        </div>
    )
}
