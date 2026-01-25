'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cleanPhone } from '@/lib/utils/phone';
import { getTenantFromHeaders } from '@/lib/utils/tenant';
import { getStages } from './stages';


export async function getPipelineData(tenantId: string) {
    const supabase = await createClient();

    // 1. Buscar estágios usando a nova função modularizada
    const stagesResult = await getStages(tenantId);
    if (!stagesResult.success) {
        return { success: false, error: stagesResult.error };
    }
    const stages = stagesResult.data;

    // 2. Buscar leads com contatos e corretores
    const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
            *,
            contacts (
                name,
                phone,
                email,
                tags
            ),
            profiles:assigned_to (
                full_name
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
        interest: lead.source, // Usando source como interesse por enquanto
        assigned_to: lead.assigned_to,
        broker_name: lead.profiles?.full_name || 'Não atribuído'
    }));

    return {
        success: true,
        data: {
            stages,
            leads: formattedLeads
        }
    };
}

export async function updateLeadStage(leadId: string, stageId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('leads')
        .update({ stage_id: stageId || null })
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
                tags: data.tags || [],
                cpf: data.cpf,
                address_street: data.address_street,
                address_number: data.address_number,
                address_complement: data.address_complement,
                address_neighborhood: data.address_neighborhood,
                address_city: data.address_city,
                address_state: data.address_state,
                address_zip_code: data.address_zip_code,
                marital_status: data.marital_status,
                birth_date: data.birth_date || null,
                primary_interest: data.primary_interest
            },
            { onConflict: 'tenant_id,phone' }
        )
        .select('id')
        .single();

    if (contactError) return { success: false, error: contactError.message };

    // 2. Criar lead
    const { data: { user } } = await supabase.auth.getUser();

    const { error: leadError } = await supabase
        .from('leads')
        .insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            stage_id: data.stage_id || null,
            notes: data.notes,
            value: data.value,
            source: data.interest || 'Direto',
            assigned_to: data.assigned_to || user?.id
        });

    if (leadError) return { success: false, error: leadError.message };

    revalidatePath('/leads');
    return { success: true };
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
            tags: data.tags || [],
            cpf: data.cpf,
            address_street: data.address_street,
            address_number: data.address_number,
            address_complement: data.address_complement,
            address_neighborhood: data.address_neighborhood,
            address_city: data.address_city,
            address_state: data.address_state,
            address_zip_code: data.address_zip_code,
            marital_status: data.marital_status,
            birth_date: data.birth_date || null,
            primary_interest: data.primary_interest
        })
        .eq('id', lead.contact_id);

    if (contactError) return { success: false, error: contactError.message };

    // 3. Atualizar lead
    const { error: leadError } = await supabase
        .from('leads')
        .update({
            stage_id: data.stage_id || null,
            notes: data.notes,
            value: data.value,
            source: data.interest,
            assigned_to: data.assigned_to
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
