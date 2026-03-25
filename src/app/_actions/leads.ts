'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cleanPhone } from '@/lib/utils/phone';
import { getTenantFromHeaders } from '@/lib/utils/tenant';
import { getStages } from './stages';
import { getProfile } from './profile';
import { createLog } from '@/lib/utils/logging';
import { createNotification } from './notifications';


export async function getPipelineData(tenantId: string) {
    const supabase = await createClient();
    const { profile } = await getProfile();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

    // 1. Buscar estágios usando a nova função modularizada
    const stagesResult = await getStages(tenantId);
    if (!stagesResult.success) {
        return { success: false, error: stagesResult.error };
    }

    // Deduplicar estágios por order_index (camada extra de proteção)
    const uniqueStagesMap = new Map();
    (stagesResult.data || []).forEach((stage: any) => {
        if (!uniqueStagesMap.has(stage.order_index)) {
            uniqueStagesMap.set(stage.order_index, stage);
        }
    });
    const stages = Array.from(uniqueStagesMap.values());

    // 2. Buscar leads com contatos e corretores
    let query = supabase
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
        .eq('tenant_id', tenantId)
        .eq('is_archived', false);

    if (!isAdmin && profile?.id) {
        query = query.eq('assigned_to', profile.id);
    }

    const { data: leads, error: leadsError } = await query;

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
        interest: lead.source, // Mantendo por compatibilidade se algo usar
        lead_source: lead.lead_source || 'Direto',
        campaign: lead.campaign,
        asset_id: lead.asset_id,
        date: lead.date || (lead.created_at ? new Date(lead.created_at).toISOString().split('T')[0] : null),
        assigned_to: lead.assigned_to,
        broker_name: lead.profiles?.full_name || 'Não atribuído',
        images: lead.images || [],
        videos: lead.videos || [],
        documents: lead.documents || [],
        whatsapp_chat: lead.whatsapp_chat || []
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

    // Log the action
    await createLog({
        action: 'update_lead_stage',
        entityType: 'lead',
        entityId: leadId,
        details: { stage_id: stageId || null }
    });

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

    // Lógica de Distribuição Automática (Round Robin)
    let assignedTo = data.assigned_to;
    if (!assignedTo) {
        const brokerRes = await getNextBrokerForDistribution(tenantId);
        if (brokerRes.success && brokerRes.data) {
            assignedTo = brokerRes.data.id;
        } else {
            assignedTo = user?.id; // Fallback para Admin se ninguém na fila
        }
    }

    const { error: leadError } = await supabase
        .from('leads')
        .insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            stage_id: data.stage_id || null,
            notes: data.notes,
            value: data.value,
            source: data.interest || 'Direto',
            lead_source: data.lead_source || 'Direto',
            campaign: data.campaign || null,
            asset_id: data.asset_id || null,
            date: data.date || new Date().toISOString().split('T')[0],
            assigned_to: assignedTo,
            images: data.images || [],
            videos: data.videos || [],
            documents: data.documents || []
        });

    if (leadError) return { success: false, error: leadError.message };

    // Log the action
    await createLog({
        action: 'create_lead',
        entityType: 'lead',
        details: { name: data.name, phone: data.phone }
    });

    // Se foi distribuído, atualizar o timestamp do corretor
    if (assignedTo && assignedTo !== user?.id) {
        await supabase
            .from('profiles')
            .update({ last_lead_assigned_at: new Date().toISOString() })
            .eq('id', assignedTo);
    }

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
            lead_source: data.lead_source,
            campaign: data.campaign || null,
            asset_id: data.asset_id || null,
            date: data.date || null,
            assigned_to: data.assigned_to,
            images: data.images,
            videos: data.videos,
            documents: data.documents
        })
        .eq('id', leadId);

    if (leadError) return { success: false, error: leadError.message };

    // Log the action
    await createLog({
        action: 'update_lead',
        entityType: 'lead',
        entityId: leadId,
        details: { name: data.name }
    });

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

    // Log the action
    await createLog({
        action: 'delete_lead',
        entityType: 'lead',
        entityId: leadId
    });

    // Notificar administradores do mesmo tenant
    try {
        const { profile: currentProfile } = await getProfile();
        if (currentProfile?.tenant_id) {
            const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('tenant_id', currentProfile.tenant_id)
                .in('role', ['admin', 'superadmin'])
                .neq('id', currentProfile.id); // Não notificar a si mesmo

            if (admins && admins.length > 0) {
                await Promise.all(admins.map((admin: any) => 
                    createNotification({
                        user_id: admin.id,
                        title: 'Lead Excluído',
                        message: `O lead #${leadId.slice(0, 8)} foi excluído por ${currentProfile.full_name}.`,
                        type: 'critical_deletion',
                        metadata: { lead_id: leadId, action_by: currentProfile.id }
                    })
                ));
            }
        }
    } catch (e) {
        console.error('Error sending admin notifications:', e);
    }

    revalidatePath('/leads');
    return { success: true };
}

export async function archiveLead(leadId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('leads')
        .update({ is_archived: true })
        .eq('id', leadId);

    if (error) return { success: false, error: error.message };

    // Log the action
    await createLog({
        action: 'archive_lead',
        entityType: 'lead',
        entityId: leadId
    });

    // Notificar administradores
    try {
        const { profile: currentProfile } = await getProfile();
        if (currentProfile?.tenant_id) {
            const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('tenant_id', currentProfile.tenant_id)
                .in('role', ['admin', 'superadmin'])
                .neq('id', currentProfile.id);

            if (admins && admins.length > 0) {
                await Promise.all(admins.map((admin: any) => 
                    createNotification({
                        user_id: admin.id,
                        title: 'Lead Arquivado',
                        message: `O lead #${leadId.slice(0, 8)} foi arquivado por ${currentProfile.full_name}.`,
                        type: 'system',
                        metadata: { lead_id: leadId }
                    })
                ));
            }
        }
    } catch (e) {
        console.error('Error sending admin notifications:', e);
    }

    revalidatePath('/leads');
    return { success: true };
}

export async function getLeadSources(tenantId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function createLeadSource(tenantId: string, name: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('lead_sources')
        .upsert({ tenant_id: tenantId, name }, { onConflict: 'tenant_id,name' })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function getNextBrokerForDistribution(tenantId: string) {
    const supabase = await createClient();
    
    // Buscar o corretor ativo na fila que está há mais tempo sem receber lead
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active_for_service', true)
        .order('last_lead_assigned_at', { ascending: true, nullsFirst: true })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // Ignorar erro de "não encontrado" (PGRST116)
        console.error('Error fetching next broker:', error);
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

export async function getLeadCampaigns(tenantId: string, sourceName: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('lead_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('source_name', sourceName)
        .order('name', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function createLeadCampaign(tenantId: string, sourceName: string, name: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('lead_campaigns')
        .upsert({ tenant_id: tenantId, source_name: sourceName, name }, { onConflict: 'tenant_id,source_name,name' })
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}
