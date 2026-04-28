import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { processLeadInbound } from '@/services/lead-service';
import { parseWhatsAppLeadMessage } from '@/services/whatsapp-lead-parser';
import { evolutionService } from '@/lib/evolution';

export async function POST(req: Request) {
    const body = await req.json();
    const supabase = createAdminClient();

    // Evolution API Webhook payload structure
    // We are interested in MESSAGES_UPSERT or similar
    if (body.event !== 'messages.upsert') {
        return NextResponse.json({ received: true });
    }

    const message = body.data;
    const instanceName = body.instance;
    const remoteJid = message.key.remoteJid;
    const fromMe = message.key.fromMe;
    const pushName = message.pushName;
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';

    if (!text) return NextResponse.json({ received: true });

    // 1. Find the instance to get tenant_id and user_id
    const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('tenant_id, user_id')
        .eq('instance_name', instanceName)
        .single();

    if (!instance) return NextResponse.json({ error: 'Instance not found' }, { status: 404 });

    // ─── CRIAÇÃO DE LEAD VIA WHATSAPP ───────────────────────────────────
    // Apenas mensagens enviadas pelo próprio corretor (fromMe: true)
    // com prefixos especiais (#lead, #ia, /lead) ativam a criação de leads
    if (fromMe) {
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
                // Criar o lead via processLeadInbound
                const leadResult = await processLeadInbound({
                    tenant_id: instance.tenant_id!,
                    name: result.data.name,
                    phone: result.data.phone,
                    email: result.data.email,
                    source: 'WhatsApp',
                    property_interest: result.data.interest,
                    status: 'new'
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
                    leadResult.assigned_to ? `\n👥 *Distribuído para corretor automaticamente*` : null
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
}

// ─── Helper: Enviar resposta no WhatsApp ────────────────────────────────────

async function sendWhatsAppReply(instanceName: string, number: string, message: string) {
    try {
        await evolutionService.sendMessage(instanceName, number, message);
    } catch (error: any) {
        console.error('[Evolution Webhook] Erro ao enviar reply:', error.message);
    }
}
