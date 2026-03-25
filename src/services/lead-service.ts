import { createAdminClient } from '@/lib/supabase/admin';
import { evolutionService } from '@/lib/evolution';

export interface LeadCreateData {
    tenant_id: string;
    name: string;
    phone: string;
    email?: string;
    asset_id?: string;
    source?: string;
    tags?: string[];
    utm_data?: Record<string, any>;
    status?: string;
}

export async function processLeadInbound(data: LeadCreateData) {
    const { tenant_id, name, phone, email, asset_id, source, tags, utm_data, status = 'new' } = data;

    if (!tenant_id || !phone) {
        throw new Error('Missing tenant_id or phone');
    }

    // Usamos admin client para garantir bypass de RLS na criação inicial se necessário,
    // ou podemos usar o client comum se preferirmos. O specs citou RLS por tenant_id.
    const supabase = createAdminClient();

    // 1. Upsert no contato pelo telefone
    const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .upsert(
            { 
                tenant_id, 
                name, 
                phone, 
                email, 
                tags: JSON.stringify(tags || []) 
            },
            { onConflict: 'tenant_id,phone' }
        )
        .select('id')
        .single();

    if (contactError) throw contactError;

    // 2. Criar o lead vinculado
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
            contact_id: contact.id,
            tenant_id,
            asset_id: asset_id || null,
            source: source || 'Direct',
            utm_data: utm_data || {},
            status
        })
        .select('id')
        .single();

    if (leadError) throw leadError;

    // 3. Distribuição Automática (Round Robin)
    let assignedTo = null;
    try {
        const { data: broker, error: brokerError } = await supabase
            .from('profiles')
            .select('id, full_name, whatsapp_number')
            .eq('tenant_id', tenant_id)
            .eq('is_active_for_service', true)
            .order('last_lead_assigned_at', { ascending: true, nullsFirst: true })
            .limit(1)
            .single();

        if (broker && !brokerError) {
            assignedTo = broker.id;
            await supabase
                .from('leads')
                .update({ assigned_to: assignedTo })
                .eq('id', lead.id);

            await supabase
                .from('profiles')
                .update({ last_lead_assigned_at: new Date().toISOString() })
                .eq('id', assignedTo);

            // 4. Notificação Interna (Sininho)
            await supabase
                .from('notifications')
                .insert({
                    user_id: assignedTo,
                    tenant_id,
                    title: 'Novo Lead Recebido',
                    message: `Você recebeu um novo lead: ${name}. Origem: ${source || 'Direto'}`,
                    type: 'new_lead',
                    metadata: { lead_id: lead.id }
                });

            // 5. Notificação via WhatsApp para o Corretor
            if (broker.whatsapp_number) {
                const { data: instance } = await supabase
                    .from('whatsapp_instances')
                    .select('instance_name')
                    .eq('tenant_id', tenant_id)
                    .eq('status', 'connected')
                    .limit(1)
                    .single();

                if (instance?.instance_name) {
                    const message = `🔔 *Novo Lead Recebido!*\n\n*Nome:* ${name}\n*Origem:* ${source || 'Direto'}\n*Interesse:* ${data.asset_id ? 'Ver no CRM' : 'Geral'}\n\n_Acesse o CRM para iniciar o atendimento._`;
                    await evolutionService.sendMessage(
                        instance.instance_name,
                        broker.whatsapp_number.replace(/\D/g, ''),
                        message
                    ).catch(err => console.error('Erro ao enviar WhatsApp de notificação:', err));
                }
            }
        }
    } catch (distError) {
        console.error('Erro na distribuição/notificação de lead:', distError);
    }

    return { contact_id: contact.id, lead_id: lead.id, assigned_to: assignedTo };
}
