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
    const imageMessage = message.message?.imageMessage;
    const videoMessage = message.message?.videoMessage;
    const audioMessage = message.message?.audioMessage;
    const documentMessage = message.message?.documentMessage;

    // Extrair o texto da mensagem ou da legenda
    const text = message.message?.conversation 
        || message.message?.extendedTextMessage?.text 
        || imageMessage?.caption 
        || videoMessage?.caption 
        || '';

    const hasMedia = !!(imageMessage || videoMessage || audioMessage || documentMessage);

    // Se não tem texto nem mídia, ignorar
    if (!text && !hasMedia) return NextResponse.json({ received: true });

    // 1. Find the instance to get tenant_id, user_id and connected_phone
    const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('tenant_id, user_id, connected_phone')
        .eq('instance_name', instanceName)
        .single();

    if (!instance) return NextResponse.json({ error: 'Instance not found' }, { status: 404 });

    // ─── CRIAÇÃO DE LEAD VIA WHATSAPP ───────────────────────────────────
    // Apenas mensagens enviadas pelo corretor PARA O PRÓPRIO NÚMERO (self-chat).
    // O corretor precisa enviar a mensagem/áudio para si mesmo no WhatsApp.
    // Suporta: texto (#lead, #ia, /lead) e áudio (transcrição automática)
    const remotePhone = remoteJid.split('@')[0].replace(/\D/g, '');

    // Usar o número conectado na instância (salvo automaticamente ao conectar)
    const connectedPhone = instance.connected_phone?.replace(/\D/g, '') || '';

    // Verificar se é self-chat: compara os últimos 8 dígitos para tolerar variações de DDI/DDD
    const isSelfChat = connectedPhone.length >= 8
        && remotePhone.length >= 8
        && remotePhone.slice(-8) === connectedPhone.slice(-8);

    if (fromMe && isSelfChat) {

        // ─── ÁUDIO: Transcrição + Extração via Gemini ────────────────────
        // IMPORTANTE: NÃO enviar mensagem ao contato antes de confirmar que é um lead.
        // Primeiro transcreve e valida a intenção silenciosamente.
        if (audioMessage) {
            try {
                // 1. Obter base64 do áudio (silenciosamente, sem notificar)
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

                // Se não conseguiu obter o áudio, ignorar silenciosamente
                // (pode ser um áudio comum que não é para criar lead)
                if (!audioBase64) {
                    console.log('[Evolution Webhook] Áudio sem base64 disponível, ignorando.');
                    return NextResponse.json({ received: true, note: 'audio_no_base64' });
                }

                // 2. Transcrever e verificar intenção de lead (SILENCIOSAMENTE)
                const audioResult = await parseAudioLead(
                    audioBase64,
                    audioMimeType.split(';')[0].trim()
                );

                // 3. Se não identificou dados de lead, ignorar silenciosamente
                // (áudio comum, conversa pessoal, etc.)
                if (audioResult === null) {
                    return NextResponse.json({ received: true, note: 'audio_no_lead_data' });
                }

                // ─── A partir daqui, o áudio FOI identificado como lead ─────────

                // 4. Se houve erro de validação (faltou nome/telefone), informar o corretor
                if (!audioResult.success || !audioResult.data) {
                    await sendWhatsAppReply(
                        instanceName,
                        remoteJid.split('@')[0],
                        audioResult.error || '❌ Não foi possível extrair dados do áudio.'
                    );
                    return NextResponse.json({ success: false, error: audioResult.error });
                }

                // 5. Notificar que está processando (SÓ AGORA, após confirmar que é lead)
                await sendWhatsAppReply(
                    instanceName,
                    remoteJid.split('@')[0],
                    '🎙️ Lead identificado no áudio! Processando...'
                );

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

                // Salvar no WhatsApp Mirror do lead
                await saveInitialChat(supabase, leadResult.lead_id, '[🎙️ Áudio transcrito]', confirmMsg, 'áudio');

                return NextResponse.json({
                    success: true,
                    lead_id: leadResult.lead_id,
                    contact_id: leadResult.contact_id
                });
            } catch (error: any) {
                // Erros inesperados são logados mas NÃO enviados ao contato
                // (pode ser um áudio comum que falhou na transcrição)
                console.error('[Evolution Webhook] Erro ao processar áudio:', error.message);
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

                // Salvar no WhatsApp Mirror do lead
                await saveInitialChat(supabase, leadResult.lead_id, text, confirmMsg, methodLabel);

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

    // 3. Find the contact by phone
    // Since phone is in contacts, we need to join or filter
    const { data: contacts } = await supabase
        .from('contacts')
        .select('id, avatar_url')
        .eq('tenant_id', instance.tenant_id!)
        .ilike('phone', `%${phone.slice(-8)}%`) // Match last 8 digits for safety
        .limit(1);

    const contact = contacts?.[0];

    if (!contact) return NextResponse.json({ received: true });

    // Sincronizar foto de perfil do WhatsApp em background para contatos antigos que não têm avatar
    if (contact && !contact.avatar_url) {
        (async () => {
            try {
                const profile = await evolutionService.fetchProfile(instanceName, phone);
                const avatarUrl = profile?.picture || profile?.profilePictureUrl || profile?.profileUrl || null;

                if (avatarUrl) {
                    await supabase
                        .from('contacts')
                        .update({ avatar_url: avatarUrl })
                        .eq('id', contact.id);
                }
            } catch (err) {
                console.error('[Evolution Webhook] Erro ao sincronizar foto de perfil para contato existente:', err);
            }
        })();
    }

    const { data: leads } = await supabase
        .from('leads')
        .select('id, whatsapp_chat')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false })
        .limit(1);

    const lead = leads?.[0];

    if (!lead) return NextResponse.json({ received: true });

    // Se a mensagem contiver mídia, buscar o base64
    let mediaBase64: string | null = null;
    let mediaType: 'image' | 'video' | 'audio' | 'document' | null = null;
    let mediaName: string | null = null;
    let mediaMimeType: string | null = null;

    if (hasMedia) {
        if (imageMessage) {
            mediaType = 'image';
            mediaMimeType = imageMessage.mimetype || 'image/jpeg';
            mediaBase64 = imageMessage.base64 || null;
        } else if (videoMessage) {
            mediaType = 'video';
            mediaMimeType = videoMessage.mimetype || 'video/mp4';
            mediaBase64 = videoMessage.base64 || null;
        } else if (audioMessage) {
            mediaType = 'audio';
            mediaMimeType = audioMessage.mimetype || 'audio/ogg';
            mediaBase64 = audioMessage.base64 || null;
        } else if (documentMessage) {
            mediaType = 'document';
            mediaMimeType = documentMessage.mimetype || 'application/octet-stream';
            mediaBase64 = documentMessage.base64 || null;
            mediaName = documentMessage.title || documentMessage.fileName || 'Documento';
        }

        // Se não tiver base64 embutido, buscar na API da Evolution
        if (!mediaBase64) {
            try {
                const mediaResult = await evolutionService.getBase64FromMediaMessage(
                    instanceName,
                    message.key.id
                );
                if (mediaResult?.base64) {
                    mediaBase64 = mediaResult.base64;
                    if (mediaResult.mimetype) {
                        mediaMimeType = mediaResult.mimetype;
                    }
                }
            } catch (mediaError: any) {
                console.error('[Evolution Webhook] Falha ao obter base64 da mídia:', mediaError.message);
            }
        }
    }

    // 4. Update the chat history (keep last 20 messages)
    const newMessage = {
        id: message.key.id,
        text,
        fromMe,
        timestamp: new Date().toISOString(),
        senderName: fromMe ? 'Você' : pushName,
        mediaType: mediaType || undefined,
        mediaUrl: mediaBase64 ? `data:${mediaMimeType};base64,${mediaBase64}` : undefined,
        mediaName: mediaName || undefined
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
        content: text || `[Mídia: ${mediaType}]`,
        metadata: { 
            fromMe, 
            messageId: message.key.id,
            mediaType: mediaType || undefined,
            mediaName: mediaName || undefined
        }
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

// ─── Helper: Salvar chat inicial no lead (WhatsApp Mirror) ──────────────────

async function saveInitialChat(
    supabase: ReturnType<typeof createAdminClient>,
    leadId: string,
    originalText: string,
    confirmMsg: string,
    method: string
) {
    try {
        const now = new Date().toISOString();
        const initialChat = [
            {
                id: `creation-${Date.now()}`,
                text: originalText || `[Criação via ${method}]`,
                fromMe: true,
                timestamp: now,
                senderName: 'Você'
            },
            {
                id: `confirm-${Date.now()}`,
                text: confirmMsg,
                fromMe: true,
                timestamp: now,
                senderName: 'CRM LAX'
            }
        ];

        await supabase
            .from('leads')
            .update({ whatsapp_chat: initialChat })
            .eq('id', leadId);
    } catch (error: any) {
        console.error('[Evolution Webhook] Erro ao salvar chat inicial:', error.message);
    }
}
