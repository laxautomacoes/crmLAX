import { BulkSenderForm } from '@/components/dashboard/tools/BulkSenderForm'
import { PageHeader } from '@/components/shared/PageHeader'

export default function WhatsAppBulkPage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader 
                title="Disparador de WhatsApp"
                subtitle="Envie mensagens e mídias em massa para seus leads e contatos."
            />

            <div className="grid grid-cols-1 gap-6">
                <BulkSenderForm />
            </div>
        </div>
    )
}
