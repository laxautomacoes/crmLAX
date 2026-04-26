'use server'

import { createClient } from '@/lib/supabase/server'

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface FollowupStepInput {
    order_index: number;
    delay_value: number;
    delay_unit: 'minutes' | 'hours' | 'days' | 'weeks';
    message_template: string;
    media_url?: string;
    media_type?: 'image' | 'video' | 'document';
}

interface CreateSequenceInput {
    name: string;
    description?: string;
    trigger_type: 'manual' | 'stage_change' | 'new_lead';
    trigger_config?: Record<string, any>;
    exit_on_reply?: boolean;
    steps: FollowupStepInput[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function getAuthContext() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role, tenants!inner(plan_type, is_system)')
        .eq('id', user.id)
        .single()

    if (!profile?.tenant_id) return { error: 'Perfil não encontrado.' }

    return {
        supabase,
        userId: user.id,
        tenantId: profile.tenant_id,
        role: profile.role,
        planType: (profile as any).tenants?.plan_type || 'freemium',
        isSystem: (profile as any).tenants?.is_system === true,
    }
}

function calculateNextActionAt(delayValue: number, delayUnit: string): string {
    const now = new Date()
    switch (delayUnit) {
        case 'minutes': now.setMinutes(now.getMinutes() + delayValue); break
        case 'hours': now.setHours(now.getHours() + delayValue); break
        case 'days': now.setDate(now.getDate() + delayValue); break
        case 'weeks': now.setDate(now.getDate() + (delayValue * 7)); break
        default: now.setDate(now.getDate() + delayValue)
    }
    return now.toISOString()
}

// ─── Validação de Limites de Plano ─────────────────────────────────────────────

export async function validateFollowupPlanLimits() {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { allowed: false, error: ctx.error }

    const { supabase, tenantId, planType, isSystem, role } = ctx

    // Superadmin ou sistema bypassa limites
    if (isSystem || role === 'superadmin') {
        return { allowed: true, remaining: null }
    }

    // Buscar limites do plano
    const { data: limits } = await supabase
        .from('plan_limits')
        .select('has_marketing, max_followup_sequences')
        .eq('plan_type', planType)
        .single()

    if (!limits?.has_marketing) {
        return { allowed: false, error: 'Seu plano não inclui funcionalidades de marketing. Faça upgrade para o Starter ou Pro.' }
    }

    const maxSequences = limits.max_followup_sequences
    if (maxSequences === 0) {
        return { allowed: false, error: 'Seu plano não inclui follow-up automatizado. Faça upgrade.' }
    }

    // Contar sequências ativas
    if (maxSequences !== null) {
        const { count } = await supabase
            .from('followup_sequences')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_active', true)

        const remaining = maxSequences - (count || 0)
        if (remaining <= 0) {
            return { allowed: false, error: `Limite de ${maxSequences} sequências ativas atingido. Desative uma sequência ou faça upgrade.` }
        }

        return { allowed: true, remaining }
    }

    return { allowed: true, remaining: null }
}

// ─── CRUD de Sequências ────────────────────────────────────────────────────────

export async function getFollowupSequences() {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId } = ctx

    const { data, error } = await supabase
        .from('followup_sequences')
        .select(`
            *,
            profiles:created_by ( full_name ),
            followup_steps ( id ),
            followup_enrollments ( id, status )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }

    // Agregar métricas
    const sequences = (data || []).map((seq: any) => {
        const enrollments = seq.followup_enrollments || []
        return {
            ...seq,
            total_steps: (seq.followup_steps || []).length,
            total_enrolled: enrollments.length,
            active_enrolled: enrollments.filter((e: any) => e.status === 'active').length,
            completed_enrolled: enrollments.filter((e: any) => e.status === 'completed').length,
            created_by_name: seq.profiles?.full_name || 'Sistema',
            // Limpar campos aninhados desnecessários
            followup_steps: undefined,
            followup_enrollments: undefined,
            profiles: undefined,
        }
    })

    return { success: true, data: sequences }
}

export async function getFollowupSequence(sequenceId: string) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId } = ctx

    const { data, error } = await supabase
        .from('followup_sequences')
        .select(`
            *,
            followup_steps (
                id, order_index, delay_value, delay_unit, message_template, media_url, media_type
            )
        `)
        .eq('id', sequenceId)
        .eq('tenant_id', tenantId)
        .single()

    if (error) return { success: false, error: error.message }

    // Ordenar steps
    if (data?.followup_steps) {
        data.followup_steps.sort((a: any, b: any) => a.order_index - b.order_index)
    }

    return { success: true, data }
}

export async function createFollowupSequence(input: CreateSequenceInput) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId, userId } = ctx

    // Validar limites se vai ativar imediatamente (criamos inativa por padrão)
    // A ativação é feita separadamente

    const { data: sequence, error: seqError } = await supabase
        .from('followup_sequences')
        .insert({
            tenant_id: tenantId,
            created_by: userId,
            name: input.name,
            description: input.description || null,
            trigger_type: input.trigger_type,
            trigger_config: input.trigger_config || {},
            exit_on_reply: input.exit_on_reply !== false,
            is_active: false,
        })
        .select()
        .single()

    if (seqError) return { success: false, error: seqError.message }

    // Inserir steps
    if (input.steps && input.steps.length > 0) {
        const stepsToInsert = input.steps.map((step, index) => ({
            sequence_id: sequence.id,
            order_index: index,
            delay_value: step.delay_value,
            delay_unit: step.delay_unit,
            message_template: step.message_template,
            media_url: step.media_url || null,
            media_type: step.media_type || null,
        }))

        const { error: stepsError } = await supabase
            .from('followup_steps')
            .insert(stepsToInsert)

        if (stepsError) {
            // Rollback: deletar sequência criada
            await supabase.from('followup_sequences').delete().eq('id', sequence.id)
            return { success: false, error: stepsError.message }
        }
    }

    return { success: true, data: sequence }
}

export async function updateFollowupSequence(sequenceId: string, input: CreateSequenceInput) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId } = ctx

    // Atualizar sequência
    const { error: seqError } = await supabase
        .from('followup_sequences')
        .update({
            name: input.name,
            description: input.description || null,
            trigger_type: input.trigger_type,
            trigger_config: input.trigger_config || {},
            exit_on_reply: input.exit_on_reply !== false,
            updated_at: new Date().toISOString(),
        })
        .eq('id', sequenceId)
        .eq('tenant_id', tenantId)

    if (seqError) return { success: false, error: seqError.message }

    // Recriar steps (delete + insert para simplificar)
    await supabase.from('followup_steps').delete().eq('sequence_id', sequenceId)

    if (input.steps && input.steps.length > 0) {
        const stepsToInsert = input.steps.map((step, index) => ({
            sequence_id: sequenceId,
            order_index: index,
            delay_value: step.delay_value,
            delay_unit: step.delay_unit,
            message_template: step.message_template,
            media_url: step.media_url || null,
            media_type: step.media_type || null,
        }))

        const { error: stepsError } = await supabase
            .from('followup_steps')
            .insert(stepsToInsert)

        if (stepsError) return { success: false, error: stepsError.message }
    }

    return { success: true }
}

export async function deleteFollowupSequence(sequenceId: string) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId } = ctx

    const { error } = await supabase
        .from('followup_sequences')
        .delete()
        .eq('id', sequenceId)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function toggleFollowupSequence(sequenceId: string, isActive: boolean) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId } = ctx

    // Se está ativando, verificar limites de plano
    if (isActive) {
        const limits = await validateFollowupPlanLimits()
        if (!limits.allowed) return { success: false, error: limits.error }
    }

    const { error } = await supabase
        .from('followup_sequences')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', sequenceId)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

// ─── Inscrição de Leads ────────────────────────────────────────────────────────

export async function enrollLeadInSequence(leadId: string, sequenceId: string) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId, userId } = ctx

    // Buscar primeira etapa para calcular next_action_at
    const { data: steps } = await supabase
        .from('followup_steps')
        .select('delay_value, delay_unit')
        .eq('sequence_id', sequenceId)
        .order('order_index', { ascending: true })
        .limit(1)

    if (!steps || steps.length === 0) {
        return { success: false, error: 'Sequência não possui etapas configuradas.' }
    }

    const firstStep = steps[0]
    const nextActionAt = calculateNextActionAt(firstStep.delay_value, firstStep.delay_unit)

    // Verificar se o lead já está inscrito nesta sequência
    const { data: existing } = await supabase
        .from('followup_enrollments')
        .select('id')
        .eq('lead_id', leadId)
        .eq('sequence_id', sequenceId)
        .eq('status', 'active')
        .maybeSingle()

    if (existing) {
        return { success: false, error: 'Este lead já está inscrito nesta sequência.' }
    }

    const { data: enrollment, error } = await supabase
        .from('followup_enrollments')
        .insert({
            sequence_id: sequenceId,
            lead_id: leadId,
            tenant_id: tenantId,
            current_step_index: 0,
            status: 'active',
            next_action_at: nextActionAt,
            enrolled_by: userId,
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: enrollment }
}

export async function enrollMultipleLeads(leadIds: string[], sequenceId: string) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId, userId } = ctx

    // Buscar primeira etapa
    const { data: steps } = await supabase
        .from('followup_steps')
        .select('delay_value, delay_unit')
        .eq('sequence_id', sequenceId)
        .order('order_index', { ascending: true })
        .limit(1)

    if (!steps || steps.length === 0) {
        return { success: false, error: 'Sequência não possui etapas configuradas.' }
    }

    const firstStep = steps[0]
    const nextActionAt = calculateNextActionAt(firstStep.delay_value, firstStep.delay_unit)

    // Verificar quais leads já estão inscritos
    const { data: existing } = await supabase
        .from('followup_enrollments')
        .select('lead_id')
        .in('lead_id', leadIds)
        .eq('sequence_id', sequenceId)
        .eq('status', 'active')

    const existingLeadIds = new Set((existing || []).map((e: any) => e.lead_id))
    const newLeadIds = leadIds.filter(id => !existingLeadIds.has(id))

    if (newLeadIds.length === 0) {
        return { success: false, error: 'Todos os leads selecionados já estão inscritos nesta sequência.' }
    }

    const enrollments = newLeadIds.map(leadId => ({
        sequence_id: sequenceId,
        lead_id: leadId,
        tenant_id: tenantId,
        current_step_index: 0,
        status: 'active',
        next_action_at: nextActionAt,
        enrolled_by: userId,
    }))

    const { error } = await supabase
        .from('followup_enrollments')
        .insert(enrollments)

    if (error) return { success: false, error: error.message }

    return {
        success: true,
        enrolled: newLeadIds.length,
        skipped: existingLeadIds.size,
    }
}

export async function cancelEnrollment(enrollmentId: string) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId } = ctx

    const { error } = await supabase
        .from('followup_enrollments')
        .update({
            status: 'cancelled',
            cancelled_reason: 'manual',
            completed_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId)
        .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

// ─── Consultas ─────────────────────────────────────────────────────────────────

export async function getEnrollmentsBySequence(sequenceId: string) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId } = ctx

    const { data, error } = await supabase
        .from('followup_enrollments')
        .select(`
            *,
            leads!inner (
                id,
                contacts ( name, phone )
            )
        `)
        .eq('sequence_id', sequenceId)
        .eq('tenant_id', tenantId)
        .order('enrolled_at', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

export async function getFollowupLogs(sequenceId: string) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId } = ctx

    const { data, error } = await supabase
        .from('followup_logs')
        .select(`
            *,
            followup_steps!inner ( order_index, message_template ),
            followup_enrollments!inner (
                sequence_id,
                leads!inner (
                    contacts ( name, phone )
                )
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('followup_enrollments.sequence_id', sequenceId)
        .order('sent_at', { ascending: false })
        .limit(100)

    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

// ─── Buscar Leads para Inscrição ───────────────────────────────────────────────

export async function getLeadsForFollowup(sequenceId?: string) {
    const ctx = await getAuthContext()
    if ('error' in ctx) return { success: false, error: ctx.error }

    const { supabase, tenantId, role, userId } = ctx

    const isAdmin = role === 'admin' || role === 'superadmin'

    let query = supabase
        .from('leads')
        .select(`
            id,
            stage_id,
            lead_source,
            campaign,
            assigned_to,
            contacts ( name, phone ),
            lead_stages:stage_id ( name, color )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)
        .not('contacts.phone', 'is', null)

    // Se não admin, só vê seus leads
    if (!isAdmin) {
        query = query.eq('assigned_to', userId)
    }

    const { data, error } = await query.limit(200)
    if (error) return { success: false, error: error.message }

    // Filtrar leads já inscritos na sequência se fornecida
    let enrolledLeadIds = new Set<string>()
    if (sequenceId) {
        const { data: enrollments } = await supabase
            .from('followup_enrollments')
            .select('lead_id')
            .eq('sequence_id', sequenceId)
            .eq('status', 'active')

        enrolledLeadIds = new Set((enrollments || []).map((e: any) => e.lead_id))
    }

    const leads = (data || [])
        .filter((l: any) => l.contacts?.phone)
        .map((l: any) => ({
            id: l.id,
            name: l.contacts?.name || 'Sem nome',
            phone: l.contacts?.phone || '',
            stage_name: (l as any).lead_stages?.name || '',
            stage_color: (l as any).lead_stages?.color || '',
            lead_source: l.lead_source,
            campaign: l.campaign,
            already_enrolled: enrolledLeadIds.has(l.id),
        }))

    return { success: true, data: leads }
}
