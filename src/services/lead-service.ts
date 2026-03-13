import { createAdminClient } from '@/lib/supabase/admin';

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

    return { contact_id: contact.id, lead_id: lead.id };
}
