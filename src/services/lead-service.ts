import { createAdminClient } from '@/lib/supabase/admin';
import { evolutionService } from '@/lib/evolution';
import { notificationService } from './notification-service';

export interface LeadCreateData {
    tenant_id: string;
    name: string;
    phone: string;
    email?: string;
    property_id?: string;
    source?: string;
    tags?: string[];
    utm_data?: Record<string, any>;
    status?: string;
    property_interest?: string;
}

export interface LeadCreateResult {
    contact_id: string;
    lead_id: string;
    assigned_to: string | null;
    already_exists?: boolean;
}

export async function processLeadInbound(data: LeadCreateData) {
    const { tenant_id, name, phone, email, property_id, source, tags, utm_data, status = 'new', property_interest } = data;

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
                tags: tags || [] 
            },
            { onConflict: 'tenant_id,phone' }
        )
        .select('id')
        .single();

    if (contactError) throw contactError;

    // 2. Verificar se já existe lead ativo para este contato (evitar duplicados)
    const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('tenant_id', tenant_id)
        .not('status', 'in', '(closed,lost)')
        .eq('is_archived', false)
        .maybeSingle();

    if (existingLead) {
        return { contact_id: contact.id, lead_id: existingLead.id, assigned_to: null, already_exists: true };
    }

    // 3. Buscar o primeiro estágio do pipeline (ex: "Novo") para atribuir ao lead
    const { data: firstStage } = await supabase
        .from('lead_stages')
        .select('id')
        .eq('tenant_id', tenant_id)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

    // 4. Criar o lead vinculado
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
            contact_id: contact.id,
            tenant_id,
            property_id: property_id || null,
            source: source || 'Direct',
            utm_data: utm_data || {},
            status,
            property_interest: property_interest || null,
            stage_id: firstStage?.id || null
        })
        .select('id')
        .single();

    if (leadError) throw leadError;

    // 4. Distribuição Automática (Round Robin)
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

            // 5. Notificação Interna e WhatsApp via Service
            await notificationService.create({
                user_id: assignedTo,
                tenant_id,
                title: 'Novo Lead Recebido',
                message: `Você recebeu um novo lead: ${name}. Origem: ${source || 'Direto'}`,
                type: 'new_lead',
                metadata: { lead_id: lead.id },
                send_whatsapp: !!broker.whatsapp_number,
                whatsapp_number: broker.whatsapp_number || undefined
            });
        }
    } catch (distError) {
        console.error('Erro na distribuição/notificação de lead:', distError);
    }

    return { contact_id: contact.id, lead_id: lead.id, assigned_to: assignedTo };
}
