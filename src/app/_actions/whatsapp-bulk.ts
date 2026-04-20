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

interface SingleBulkMessagePayload {
    recipient: { name: string; phone: string; lead_id?: string };
    message: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'document';
    fileName?: string;
    instanceName: string;
}

export async function checkWhatsAppStatus() {
    const { data: instance, error } = await getWhatsAppInstance();
    if (error || !instance || instance.status !== 'connected') {
        return { connected: false, error: 'WhatsApp não conectado. Verifique suas integrações.' };
    }
    return { connected: true, instanceName: instance.instance_name };
}

export async function sendSingleBulkMessage(payload: SingleBulkMessagePayload) {
    const { recipient, message, mediaUrl, mediaType, fileName, instanceName } = payload;
    
    const normalizedNumber = normalizeWhatsAppNumber(recipient.phone);
    const personalizedMessage = message
        .replace(/{nome}/g, recipient.name)
        .replace(/{primeiro_nome}/g, recipient.name.split(' ')[0]);
    
    try {
        let sendResult;
        
        // Envia texto se houver mensagem
        if (personalizedMessage) {
            sendResult = await evolutionService.sendMessage(instanceName, normalizedNumber, personalizedMessage);
        }

        // Envia mídia se houver
        if (mediaUrl && mediaType) {
            if (mediaType === 'document') {
                await evolutionService.sendDocument(instanceName, normalizedNumber, mediaUrl, fileName || 'documento', personalizedMessage);
            } else {
                await evolutionService.sendMedia(instanceName, normalizedNumber, mediaUrl, mediaType, personalizedMessage);
            }
        }

        // Registrar Logs
        if (recipient.lead_id) {
            await logInteraction(recipient.lead_id, 'whatsapp', `Mensagem automatizada (Disparador): ${personalizedMessage.substring(0, 80)}...`);
        }

        return { success: true, phone: recipient.phone, data: sendResult };
    } catch (err: any) {
        console.error(`Erro ao enviar para ${recipient.phone}:`, err);
        return { success: false, phone: recipient.phone, error: err.message };
    }
}

