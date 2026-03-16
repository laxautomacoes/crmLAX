'use server'

import { createClient } from '@/lib/supabase/server'
import { evolutionService } from '@/lib/evolution'
import { getWhatsAppInstance } from './whatsapp'
import { normalizeWhatsAppNumber } from '@/lib/utils/whatsapp-utils'
import { logInteraction } from './messaging'

interface BulkMessagePayload {
    recipients: { name: string; phone: string; lead_id?: string }[];
    message: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'document';
    fileName?: string;
}

export async function sendBulkWhatsAppMessages(payload: BulkMessagePayload) {
    const { recipients, message, mediaUrl, mediaType, fileName } = payload;
    
    const { data: instance, error: instanceError } = await getWhatsAppInstance();
    if (instanceError || !instance || instance.status !== 'connected') {
        return { success: false, error: 'WhatsApp não conectado. Verifique suas integrações.' };
    }

    const results = [];
    const supabase = await createClient();

    for (const recipient of recipients) {
        const normalizedNumber = normalizeWhatsAppNumber(recipient.phone);
        const personalizedMessage = message.replace(/{nome}/g, recipient.name);
        
        try {
            let sendResult;
            
            // Envia texto se houver mensagem
            if (personalizedMessage) {
                sendResult = await evolutionService.sendMessage(instance.instance_name, normalizedNumber, personalizedMessage);
            }

            // Envia mídia se houver
            if (mediaUrl && mediaType) {
                if (mediaType === 'document') {
                    await evolutionService.sendDocument(instance.instance_name, normalizedNumber, mediaUrl, fileName || 'documento', personalizedMessage);
                } else {
                    await evolutionService.sendMedia(instance.instance_name, normalizedNumber, mediaUrl, mediaType, personalizedMessage);
                }
            }

            // RegistrarLogs
            if (recipient.lead_id) {
                await logInteraction(recipient.lead_id, 'whatsapp', `Mensagem em massa disparada: ${personalizedMessage.substring(0, 50)}...`);
            }

            results.push({ phone: recipient.phone, status: 'sent', data: sendResult });
            
            // Delay preventivo entre mensagens (mínimo 1.2s + random até 2s)
            await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 2000));
            
        } catch (err: any) {
            console.error(`Erro ao enviar para ${recipient.phone}:`, err);
            results.push({ phone: recipient.phone, status: 'error', error: err.message });
        }
    }

    return { success: true, results };
}
