import { BulkSenderForm } from '@/components/dashboard/tools/BulkSenderForm'

export default function WhatsAppBulkPage() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-[#404F4F]">Disparador de WhatsApp</h1>
                <p className="text-gray-500 font-medium">Envie mensagens e mídias em massa para seus leads e contatos.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <BulkSenderForm />
            </div>
        </div>
    )
}
