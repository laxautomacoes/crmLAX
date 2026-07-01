'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from '../profile'
import { getStages } from '../stages'
import type { Lead } from '@/components/dashboard/leads/PipelineBoard'

interface StageRecord {
    id: string
    name: string
    order_index: number
    color?: string
}

interface ContactRecord {
    name?: string | null
    phone?: string | null
    email?: string | null
    tags?: string[] | null
    avatar_url?: string | null
}

interface AssignedProfileRecord {
    full_name?: string | null
}

interface LeadRecord {
    contact_id?: string | null
    id: string
    contacts?: ContactRecord | null
    stage_id: string
    notes?: string | null
    value?: number | null
    property_interest?: string | null
    source?: string | null
    lead_source?: string | null
    campaign?: string | null
    property_id?: string | null
    created_at?: string | null
    assigned_to?: string | null
    profiles?: AssignedProfileRecord | null
    images?: string[] | null
    videos?: string[] | null
    documents?: { name: string; url: string }[] | null
    whatsapp_chat?: Array<{ fromMe?: boolean; message?: string; text?: string }> | null
    date?: string | null
    last_interaction_at?: string | null
    partner_id?: string | null
    partner_split?: number | null
    partner_role?: string | null
}

type PipelineLead = Lead & {
    property_interest?: string
    lead_source?: string
    campaign?: string
    property_id?: string
    contact_id?: string
    date?: string | null
}

export async function getPipelineData(tenantId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

    const stagesResult = await getStages(tenantId)
    if (!stagesResult.success) {
        return { success: false, error: stagesResult.error }
    }

    // Deduplicar estágios por order_index
    const uniqueStagesMap = new Map<number, StageRecord>()
    ;((stagesResult.data || []) as StageRecord[]).forEach((stage) => {
        if (!uniqueStagesMap.has(stage.order_index)) {
            uniqueStagesMap.set(stage.order_index, stage)
        }
    })
    const stages = Array.from(uniqueStagesMap.values()) as StageRecord[]

    let query = supabase
        .from('leads')
        .select(`
            *,
            contacts (
                name, phone, email, tags, avatar_url
            ),
            profiles:assigned_to (
                full_name
            ),
            proposals ( id )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)
        .order('last_interaction_at', { ascending: false })

    if (!isAdmin && profile?.id) {
        query = query.eq('assigned_to', profile.id)
    }

    const { data: leads, error: leadsError } = await query

    if (leadsError) {
        return { success: false, error: leadsError.message }
    }

    const formattedLeads = ((leads || []) as LeadRecord[]).map((lead) => ({
        id: lead.id,
        name: lead.contacts?.name || 'Sem nome',
        phone: lead.contacts?.phone || '',
        email: lead.contacts?.email || '',
        avatar_url: lead.contacts?.avatar_url || null,
        tags: lead.contacts?.tags || [],
        status: lead.stage_id,
        notes: lead.notes,
        value: lead.value,
        interest: lead.property_interest || lead.source,
        property_interest: lead.property_interest,
        lead_source: lead.lead_source || 'Direto',
        campaign: lead.campaign,
        property_id: lead.property_id,
        contact_id: lead.contact_id || undefined,
        date: lead.date || (lead.created_at ? new Date(lead.created_at).toISOString().split('T')[0] : null),
        assigned_to: lead.assigned_to,
        broker_name: lead.profiles?.full_name || 'Não atribuído',
        images: lead.images || [],
        videos: lead.videos || [],
        documents: lead.documents || [],
        whatsapp_chat: lead.whatsapp_chat || [],
        last_interaction_at: lead.last_interaction_at || lead.created_at || null,
        has_proposal: ((lead as any).proposals && (lead as any).proposals.length > 0),
        partner_id: lead.partner_id || null,
        partner_split: lead.partner_split || null,
        partner_role: lead.partner_role || null
    })) as PipelineLead[]

    return {
        success: true,
        data: { stages, leads: formattedLeads }
    }
}

export async function getSimpleLeads(tenantId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

    let query = supabase
        .from('leads')
        .select(`
            id,
            contact_id,
            assigned_to,
            contacts!inner (
                name, phone, email, avatar_url
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)
        .order('last_interaction_at', { ascending: false, nullsFirst: false })

    if (!isAdmin && profile?.id) {
        query = query.eq('assigned_to', profile.id)
    }

    const { data: leads, error } = await query

    if (error) {
        console.error('Error fetching simple leads:', error)
        return { success: false, error: error.message, data: [] }
    }

    const formattedLeads = (leads || []).map((lead: any) => ({
        id: lead.id,
        contact_id: lead.contact_id,
        name: lead.contacts?.name || 'Sem nome',
        phone: lead.contacts?.phone || '',
        email: lead.contacts?.email || '',
        avatar_url: lead.contacts?.avatar_url || null,
        assigned_to: lead.assigned_to
    }))

    return {
        success: true,
        data: formattedLeads
    }
}

