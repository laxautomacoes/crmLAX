import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { processLeadInbound } from '@/services/lead-service';
import { parseWhatsAppLeadMessage, parseAudioLead } from '@/services/whatsapp-lead-parser';
import { evolutionService } from '@/lib/evolution';

export async function POST(req: Request) {
    try {
    const body = await req.json();
    const supabase = createAdminClient();

    // Evolution API Webhook payload structure
    // We are interested in MESSAGES_UPSERT or similar
    if (body.event !== 'messages.upsert') {
        return NextResponse.json({ received: true });
    }

    const message = body.data;
    if (!message?.key) {
        return NextResponse.json({ received: true, note: 'no message key' });
    }

    const instanceName = body.instance;
    const remoteJid = message.key.remoteJid;
    const fromMe = message.key.fromMe;
    const pushName = message.pushName;
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const audioMessage = message.message?.audioMessage;

    // Se não tem texto nem áudio, ignorar
    if (!text && !audioMessage) return NextResponse.json({ received: true });

    // 1. Find the instance to get tenant_id and user_id
    const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('tenant_id, user_id')
        .eq('instance_name', instanceName)
        .single();

    if (!instance) return NextResponse.json({ error: 'Instance not found' }, { status: 404 });

    // ─── CRIAÇÃO DE LEAD VIA WHATSAPP ───────────────────────────────────
    // Apenas mensagens enviadas pelo próprio corretor (fromMe: true)
    // Suporta: texto (#lead, #ia, /lead) e áudio (transcrição automática)
    if (fromMe) {

        // ─── ÁUDIO: Transcrição + Extração via Gemini ────────────────────
        if (audioMessage) {
            try {
                // 1. Notificar que está processando
                await sendWhatsAppReply(
                    instanceName,
                    remoteJid.split('@')[0],
                    '🎙️ Processando áudio...'
                );

                // 2. Obter base64 do áudio
                // Prioridade: base64 inline no webhook (webhookBase64: true) → fallback via API
                let audioBase64 = audioMessage.base64 || null;
                let audioMimeType = audioMessage.mimetype || 'audio/ogg';

                if (!audioBase64) {
                    try {
                        const mediaResult = await evolutionService.getBase64FromMediaMessage(
                            instanceName,
                            message.key.id
                        );
                        audioBase64 = mediaResult?.base64 || null;
                        audioMimeType = mediaResult?.mimetype || audioMimeType;
                    } catch (mediaError: any) {
                        console.error('[Evolution Webhook] Fallback getBase64 falhou:', mediaError.message);
                    }
                }

                if (!audioBase64) {
                    await sendWhatsAppReply(
                        instanceName,
                        remoteJid.split('@')[0],
                        '❌ Não foi possível recuperar o áudio. Tente enviar novamente.'
                    );
                    return NextResponse.json({ success: false, error: 'Could not retrieve audio' });
                }

                // 3. Enviar para o Gemini transcrever e extrair dados
                const audioResult = await parseAudioLead(
                    audioBase64,
                    audioMimeType.split(';')[0].trim() // Remover codecs (ex: "audio/ogg; codecs=opus" → "audio/ogg")
                );

                // 4. Se não identificou dados de lead, ignorar silenciosamente
                if (audioResult === null) {
                    return NextResponse.json({ received: true, note: 'audio_no_lead_data' });
                }

                // 5. Se houve erro de validação, informar o corretor
                if (!audioResult.success || !audioResult.data) {
                    await sendWhatsAppReply(
                        instanceName,
                        remoteJid.split('@')[0],
                        audioResult.error || '❌ Não foi possível extrair dados do áudio.'
                    );
                    return NextResponse.json({ success: false, error: audioResult.error });
                }

                // 6. Criar o lead (mesmo fluxo do texto)
                const sourceLabel = 'WhatsApp (Áudio)';

                const leadResult = await processLeadInbound({
                    tenant_id: instance.tenant_id!,
                    name: audioResult.data.name,
                    phone: audioResult.data.phone,
                    email: audioResult.data.email,
                    source: sourceLabel,
                    property_interest: audioResult.data.interest,
                    status: 'new'
                });

                if (leadResult.already_exists) {
                    await sendWhatsAppReply(
                        instanceName,
                        remoteJid.split('@')[0],
                        `ℹ️ *Lead já cadastrado*\n\n👤 *Nome:* ${audioResult.data.name}\n📱 *Telefone:* ${audioResult.data.phone}\n\nJá existe um lead ativo para este contato no sistema.`
                    );
                    return NextResponse.json({ success: true, lead_id: leadResult.lead_id, already_exists: true });
                }

                // Registrar no system_logs
                await supabase.from('system_logs').insert({
                    tenant_id: instance.tenant_id,
                    action: 'create',
                    entity_type: 'lead',
                    entity_id: leadResult.lead_id,
                    details: {
                        method: 'audio',
                        source: 'whatsapp_webhook',
                        phone: audioResult.data.phone,
                        name: audioResult.data.name
                    }
                });

                // Enviar confirmação
                const confirmMsg = [
                    `✅ *Lead criado via áudio!*`,
                    ``,
                    `👤 *Nome:* ${audioResult.data.name}`,
                    `📱 *Telefone:* ${audioResult.data.phone}`,
                    audioResult.data.email ? `📧 *Email:* ${audioResult.data.email}` : null,
                    audioResult.data.interest ? `🏠 *Interesse:* ${audioResult.data.interest}` : null,
                    `🔗 *Origem:* WhatsApp (Áudio)`,
                    leadResult.assigned_to ? `\n👥 *Distribuído para corretor automaticamente*` : null
                ].filter(Boolean).join('\n');

                await sendWhatsAppReply(instanceName, remoteJid.split('@')[0], confirmMsg);

                return NextResponse.json({
                    success: true,
                    lead_id: leadResult.lead_id,
                    contact_id: leadResult.contact_id
                });
            } catch (error: any) {
                console.error('[Evolution Webhook] Erro ao processar áudio:', error.message);
                await sendWhatsAppReply(
                    instanceName,
                    remoteJid.split('@')[0],
                    `❌ Erro ao processar áudio: ${error.message}`
                );
                return NextResponse.json({ success: false, error: error.message });
            }
        }
        const parseResult = await parseWhatsAppLeadMessage(text);

        if (parseResult) {
            const { result, type } = parseResult;

            if (!result.success || !result.data) {
                // Enviar mensagem de erro para o corretor
                await sendWhatsAppReply(
                    instanceName,
                    remoteJid.split('@')[0],
                    `❌ *Erro ao criar lead*\n\n${result.error}`
                );
                return NextResponse.json({ success: false, error: result.error });
            }

            try {
                // Validar se o número possui WhatsApp ativo
                let phoneWarning: string | null = null;
                try {
                    const numberCheck = await evolutionService.checkNumber(instanceName, result.data.phone);
                    const checkResult = Array.isArray(numberCheck) ? numberCheck[0] : numberCheck;
                    if (checkResult && checkResult.exists === false) {
                        phoneWarning = `⚠️ O número ${result.data.phone} pode não possuir WhatsApp ativo.`;
                    }
                } catch {
                    // Não bloquear a criação se a validação falhar
                }

                // Diferenciar source por método de parsing
                const sourceLabel = type === 'ai' ? 'WhatsApp (IA)' : 'WhatsApp';

                // Criar o lead via processLeadInbound
                const leadResult = await processLeadInbound({
                    tenant_id: instance.tenant_id!,
                    name: result.data.name,
                    phone: result.data.phone,
                    email: result.data.email,
                    source: sourceLabel,
                    property_interest: result.data.interest,
                    status: 'new'
                });

                // Se o lead já existia, enviar aviso diferente
                if (leadResult.already_exists) {
                    await sendWhatsAppReply(
                        instanceName,
                        remoteJid.split('@')[0],
                        `ℹ️ *Lead já cadastrado*\n\n👤 *Nome:* ${result.data.name}\n📱 *Telefone:* ${result.data.phone}\n\nJá existe um lead ativo para este contato no sistema.`
                    );
                    return NextResponse.json({
                        success: true,
                        lead_id: leadResult.lead_id,
                        already_exists: true
                    });
                }

                // Registrar no system_logs para auditoria
                await supabase.from('system_logs').insert({
                    tenant_id: instance.tenant_id,
                    action: 'create',
                    entity_type: 'lead',
                    entity_id: leadResult.lead_id,
                    details: {
                        method: type,
                        source: 'whatsapp_webhook',
                        phone: result.data.phone,
                        name: result.data.name
                    }
                });

                // Enviar confirmação via WhatsApp
                const methodLabel = type === 'structured' ? 'Estruturado' : 'IA';
                const confirmMsg = [
                    `✅ *Lead criado com sucesso!*`,
                    ``,
                    `👤 *Nome:* ${result.data.name}`,
                    `📱 *Telefone:* ${result.data.phone}`,
                    result.data.email ? `📧 *Email:* ${result.data.email}` : null,
                    result.data.interest ? `🏠 *Interesse:* ${result.data.interest}` : null,
                    `🔗 *Origem:* WhatsApp (${methodLabel})`,
                    leadResult.assigned_to ? `\n👥 *Distribuído para corretor automaticamente*` : null,
                    phoneWarning ? `\n${phoneWarning}` : null
                ].filter(Boolean).join('\n');

                await sendWhatsAppReply(
                    instanceName,
                    remoteJid.split('@')[0],
                    confirmMsg
                );

                return NextResponse.json({
                    success: true,
                    lead_id: leadResult.lead_id,
                    contact_id: leadResult.contact_id
                });
            } catch (error: any) {
                console.error('[Evolution Webhook] Erro ao criar lead:', error.message);
                await sendWhatsAppReply(
                    instanceName,
                    remoteJid.split('@')[0],
                    `❌ *Erro ao criar lead*\n\n${error.message}`
                );
                return NextResponse.json({ success: false, error: error.message });
            }
        }
    }

    // ─── FLUXO ORIGINAL: SALVAR MENSAGEM NO CHAT ────────────────────────

    // 2. Clean the phone number from remoteJid (e.g., 5548999999999@s.whatsapp.net)
    const phone = remoteJid.split('@')[0].replace(/\D/g, '');
    // Remove '55' if it exists to match our format if needed, but leads might store it with 55.
    // Let's assume we search for the phone containing these digits.

    // 3. Find the lead
    const { data: leads } = await supabase
        .from('leads')
        .select('id, whatsapp_chat, contact_id')
        .eq('tenant_id', instance.tenant_id!)
        .filter('contact_id', 'not.is', null as any);

    // Since phone is in contacts, we need to join or filter
    const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('tenant_id', instance.tenant_id!)
        .ilike('phone', `%${phone.slice(-8)}%`) // Match last 8 digits for safety
        .maybeSingle();

    if (!contact) return NextResponse.json({ received: true });

    const { data: lead } = await supabase
        .from('leads')
        .select('id, whatsapp_chat')
        .eq('contact_id', contact.id)
        .maybeSingle();

    if (!lead) return NextResponse.json({ received: true });

    // 4. Update the chat history (keep last 20 messages)
    const newMessage = {
        id: message.key.id,
        text,
        fromMe,
        timestamp: new Date().toISOString(),
        senderName: fromMe ? 'Você' : pushName
    };

    const currentChat = Array.isArray(lead.whatsapp_chat) ? lead.whatsapp_chat : [];
    const updatedChat = [...currentChat, newMessage].slice(-20);

    await supabase
        .from('leads')
        .update({ whatsapp_chat: updatedChat })
        .eq('id', lead.id);

    // 5. Log interaction
    await supabase.from('interactions').insert({
        lead_id: lead.id,
        type: 'whatsapp',
        content: text,
        metadata: { fromMe, messageId: message.key.id }
    });

    return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Evolution Webhook] Unhandled error:', {
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
        return NextResponse.json(
            { error: 'Internal webhook error', message: error.message },
            { status: 500 }
        );
    }
}

// ─── Helper: Enviar resposta no WhatsApp ────────────────────────────────────

async function sendWhatsAppReply(instanceName: string, number: string, message: string) {
    try {
        await evolutionService.sendMessage(instanceName, number, message);
    } catch (error: any) {
        console.error('[Evolution Webhook] Erro ao enviar reply:', error.message);
    }
}
