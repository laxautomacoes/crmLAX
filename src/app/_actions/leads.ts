'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cleanPhone } from '@/lib/utils/phone';

export async function getPipelineData(tenantId: string) {
    const supabase = await createClient();

    // 1. Buscar estágios
    const { data: stages, error: stagesError } = await supabase
        .from('lead_stages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('order_index', { ascending: true });

    if (stagesError) {
        return { success: false, error: stagesError.message };
    }

    // 2. Buscar leads com contatos
    const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
            *,
            contacts (
                name,
                phone,
                email,
                tags
            )
        `)
        .eq('tenant_id', tenantId);

    if (leadsError) {
        return { success: false, error: leadsError.message };
    }

    // Mapear leads para o formato do front
    const formattedLeads = leads.map((lead: any) => ({
        id: lead.id,
        name: lead.contacts?.name || 'Sem nome',
        phone: lead.contacts?.phone || '',
        email: lead.contacts?.email || '',
        tags: lead.contacts?.tags || [],
        status: lead.stage_id,
        notes: lead.notes,
        value: lead.value,
        interest: lead.source // Usando source como interesse por enquanto
    }));

    return {
        success: true,
        data: {
            stages,
            leads: formattedLeads
        }
    };
}

export async function createStage(tenantId: string, name: string) {
    const supabase = await createClient();

    // Pegar o último order_index
    const { data: lastStage } = await supabase
        .from('lead_stages')
        .select('order_index')
        .eq('tenant_id', tenantId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

    const nextOrder = lastStage ? lastStage.order_index + 1 : 0;

    const { data, error } = await supabase
        .from('lead_stages')
        .insert({
            tenant_id: tenantId,
            name,
            order_index: nextOrder
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/leads');
    return { success: true, data };
}

export async function updateLeadStage(leadId: string, stageId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('leads')
        .update({ stage_id: stageId })
        .eq('id', leadId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/leads');
    return { success: true };
}

export async function createLead(tenantId: string, data: any) {
    const supabase = await createClient();

    // 1. Criar/Atualizar contato
    const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .upsert(
            {
                tenant_id: tenantId,
                name: data.name,
                phone: cleanPhone(data.phone),
                email: data.email,
                tags: data.tags || []
            },
            { onConflict: 'tenant_id,phone' }
        )
        .select('id')
        .single();

    if (contactError) return { success: false, error: contactError.message };

    // 2. Criar lead
    const { error: leadError } = await supabase
        .from('leads')
        .insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            stage_id: data.stage_id,
            notes: data.notes,
            value: data.value,
            source: data.interest || 'Direto'
        });

    if (leadError) return { success: false, error: leadError.message };

    revalidatePath('/leads');
    return { success: true };
}

export async function updateStageName(stageId: string, name: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('lead_stages')
        .update({ name })
        .eq('id', stageId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/leads');
    return { success: true };
}

export async function deleteStage(stageId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('lead_stages')
        .delete()
        .eq('id', stageId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/leads');
    return { success: true };
}

export async function duplicateStage(tenantId: string, stageId: string) {
    const supabase = await createClient();

    // 1. Buscar estágio original
    const { data: stage } = await supabase
        .from('lead_stages')
        .select('*')
        .eq('id', stageId)
        .single();

    if (!stage) return { success: false, error: 'Estágio não encontrado' };

    // 2. Buscar todos os estágios para verificar nomes existentes
    const { data: allStages } = await supabase
        .from('lead_stages')
        .select('name')
        .eq('tenant_id', tenantId);

    // 3. Gerar nome com sufixo incremental
    const baseName = stage.name.replace(/ \(Cópia \d+\)$/, '');
    let copyNumber = 1;
    let newName = `${baseName} (Cópia ${copyNumber})`;

    const existingNames = allStages?.map(s => s.name) || [];

    while (existingNames.includes(newName)) {
        copyNumber++;
        newName = `${baseName} (Cópia ${copyNumber})`;
    }

    // 4. Criar nova cópia
    return await createStage(tenantId, newName);
}
export async function updateLead(tenantId: string, leadId: string, data: any) {
    const supabase = await createClient();

    // 1. Buscar o lead para pegar o contact_id
    const { data: lead } = await supabase
        .from('leads')
        .select('contact_id')
        .eq('id', leadId)
        .single();

    if (!lead) return { success: false, error: 'Lead não encontrado' };

    // 2. Atualizar contato
    const { error: contactError } = await supabase
        .from('contacts')
        .update({
            name: data.name,
            phone: cleanPhone(data.phone),
            email: data.email,
            tags: data.tags || []
        })
        .eq('id', lead.contact_id);

    if (contactError) return { success: false, error: contactError.message };

    // 3. Atualizar lead
    const { error: leadError } = await supabase
        .from('leads')
        .update({
            stage_id: data.stage_id,
            notes: data.notes,
            value: data.value,
            source: data.interest
        })
        .eq('id', leadId);

    if (leadError) return { success: false, error: leadError.message };

    revalidatePath('/leads');
    return { success: true };
}

export async function deleteLead(leadId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/leads');
    return { success: true };
}
