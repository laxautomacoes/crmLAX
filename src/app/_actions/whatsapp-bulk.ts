'use server'

import { createClient } from '@/lib/supabase/server'
import { evolutionService } from '@/lib/evolution'
import { getWhatsAppInstance } from './whatsapp'
import { normalizeWhatsAppNumber } from '@/lib/utils/whatsapp-utils'
import { logInteraction } from './messaging'

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface SingleBulkMessagePayload {
    recipient: { name: string; phone: string; lead_id?: string };
    message: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'document';
    fileName?: string;
    instanceName: string;
}

interface BulkFilters {
    stageIds?: string[];
    leadSource?: string;
    campaign?: string;
    assignedTo?: string;
    clientName?: string;
    nameQuery?: string;
    propertyName?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: string;
    location?: string;
}

// ─── Validação de Acesso e Plano ───────────────────────────────────────────────

export async function validateBulkAccess() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { allowed: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role, tenants!inner(plan_type, is_system)')
        .eq('id', user.id)
        .single()

    if (!profile?.tenant_id) return { allowed: false, error: 'Perfil não encontrado.' }

    const tenantId = profile.tenant_id
    const planType = (profile as any).tenants?.plan_type || 'starter'
    const isSystem = (profile as any).tenants?.is_system === true
    const isSuper = profile.role === 'superadmin' || isSystem

    // Superadmin bypassa limites
    if (isSuper) {
        return { allowed: true, tenantId, profileId: user.id, planType, remaining: null }
    }

    // Buscar limites do plano
    const { data: limits } = await supabase
        .from('plan_limits')
        .select('has_whatsapp, max_bulk_messages_per_month')
        .eq('plan_type', planType)
        .single()

    if (!limits?.has_whatsapp) {
        return { allowed: false, error: 'Seu plano não inclui integração com WhatsApp. Faça upgrade para o Starter ou Pro.' }
    }

    const maxMessages = limits.max_bulk_messages_per_month
    if (maxMessages === 0) {
        return { allowed: false, error: 'Seu plano não inclui envio em massa. Faça upgrade para o Starter ou Pro.' }
    }

    // Contar mensagens enviadas no mês atual
    if (maxMessages !== null) {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count } = await supabase
            .from('bulk_campaigns')
            .select('total_success', { count: 'exact', head: false })
            .eq('tenant_id', tenantId)
            .gte('created_at', startOfMonth.toISOString())

        // Somar total_success de todas as campanhas do mês
        const { data: campaigns } = await supabase
            .from('bulk_campaigns')
            .select('total_success')
            .eq('tenant_id', tenantId)
            .gte('created_at', startOfMonth.toISOString())

        const totalSent = (campaigns || []).reduce((sum: number, c: any) => sum + (c.total_success || 0), 0)
        const remaining = maxMessages - totalSent

        if (remaining <= 0) {
            return { allowed: false, error: `Limite de ${maxMessages} mensagens em massa/mês atingido. Faça upgrade para o Pro para envios ilimitados.` }
        }

        return { allowed: true, tenantId, profileId: user.id, planType, remaining }
    }

    return { allowed: true, tenantId, profileId: user.id, planType, remaining: null }
}

// ─── Verificação de Status do WhatsApp ─────────────────────────────────────────

export async function checkWhatsAppStatus() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { connected: false, error: 'Não autenticado.' }

    // Validar que a instância pertence ao tenant do usuário
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile?.tenant_id) {
        return { connected: false, error: 'Perfil não encontrado.' }
    }

    const { data: instance, error } = await getWhatsAppInstance()
    if (error || !instance || instance.status !== 'connected') {
        return { connected: false, error: 'WhatsApp não conectado. Verifique suas integrações.' }
    }

    // Validar tenant da instância
    if (instance.tenant_id && instance.tenant_id !== profile.tenant_id) {
        return { connected: false, error: 'Instância WhatsApp não pertence a este tenant.' }
    }

    return { connected: true, instanceName: instance.instance_name, tenantId: profile.tenant_id }
}

// ─── Buscar Leads com Filtros ──────────────────────────────────────────────────

export async function getLeadsForBulk(tenantId: string, filters?: BulkFilters) {
    const supabase = await createClient()

    // Validar autenticação e tenant
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.tenant_id !== tenantId) {
        return { success: false, error: 'Acesso negado.' }
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'

    let query = supabase
        .from('leads')
        .select(`
            id,
            stage_id,
            lead_source,
            campaign,
            assigned_to,
            property_id,
            contacts (
                name, phone
            ),
            properties (
                title,
                price,
                details
            ),
            profiles:assigned_to (
                full_name
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)

    // Filtro por corretor (se não admin, só vê os seus)
    if (!isAdmin && profile.id) {
        query = query.eq('assigned_to', user.id)
    } else if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
    }

    // Filtro por estágio(s)
    if (filters?.stageIds && filters.stageIds.length > 0) {
        query = query.in('stage_id', filters.stageIds)
    }

    // Filtro por origem
    if (filters?.leadSource) {
        query = query.eq('lead_source', filters.leadSource)
    }

    // Filtro por campanha
    if (filters?.campaign) {
        query = query.eq('campaign', filters.campaign)
    }

    // Filtro por nome do lead via query SQL
    if (filters?.nameQuery) {
        query = query.ilike('contacts.name', `%${filters.nameQuery}%`)
    }

    const { data: leads, error } = await query

    if (error) return { success: false, error: error.message }

    // Mapear com dados de property
    let recipients = (leads || [])
        .filter((l: any) => l.contacts?.phone)
        .map((l: any) => ({
            name: l.contacts?.name || 'Sem nome',
            phone: l.contacts?.phone || '',
            lead_id: l.id,
            property: l.properties || null
        }))

    // Filtro por nome do cliente (contacts.name) - client-side
    if (filters?.clientName) {
        const q = filters.clientName.toLowerCase()
        recipients = recipients.filter((r: any) => r.name.toLowerCase().includes(q))
    }
    // Filtro por nome do imóvel
    if (filters?.propertyName) {
        const q = filters.propertyName.toLowerCase()
        recipients = recipients.filter((r: any) => r.property?.title && r.property.title.toLowerCase().includes(q))
    }
    // Filtro de valor: se só minPrice, usar ±50%
    if (filters?.minPrice && !filters?.maxPrice) {
        const val = filters.minPrice
        const min50 = val * 0.5
        const max50 = val * 1.5
        recipients = recipients.filter((r: any) => r.property?.price && r.property.price >= min50 && r.property.price <= max50)
    } else {
        if (filters?.minPrice) {
            recipients = recipients.filter((r: any) => r.property?.price && r.property.price >= filters.minPrice!)
        }
        if (filters?.maxPrice) {
            recipients = recipients.filter((r: any) => r.property?.price && r.property.price <= filters.maxPrice!)
        }
    }
    // Filtro de dormitórios (campo 'quartos' no details)
    if (filters?.bedrooms && filters.bedrooms !== 'any') {
        const bdReq = parseInt(filters.bedrooms)
        recipients = recipients.filter((r: any) => {
            if (!r.property?.details) return false
            const propBd = parseInt(r.property.details.quartos || r.property.details.bedrooms || '0')
            return filters.bedrooms!.includes('+') ? propBd >= bdReq : propBd === bdReq
        })
    }
    // Filtro de localização (bairro ou cidade no endereco)
    if (filters?.location) {
        const loc = filters.location.toLowerCase()
        recipients = recipients.filter((r: any) => {
            if (!r.property?.details?.endereco) return false
            const end = r.property.details.endereco
            const bairro = (end.bairro || '').toLowerCase()
            const cidade = (end.cidade || '').toLowerCase()
            return bairro.includes(loc) || cidade.includes(loc)
        })
    }

    // Remover property do resultado final
    const finalData = recipients.map((r: any) => ({
        name: r.name,
        phone: r.phone,
        lead_id: r.lead_id
    }))

    return { success: true, data: finalData }
}

// ─── Buscar Opções de Filtro ───────────────────────────────────────────────────

export async function getBulkFilterOptions(tenantId: string) {
    const supabase = await createClient()

    // Validar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.tenant_id !== tenantId) {
        return { success: false, error: 'Acesso negado.' }
    }

    const isAdmin = profile.role === 'admin' || profile.role === 'superadmin'

    // Buscar estágios
    const { data: stages } = await supabase
        .from('lead_stages')
        .select('id, name, order_index, color')
        .eq('tenant_id', tenantId)
        .order('order_index', { ascending: true })

    // Buscar origens
    const { data: sources } = await supabase
        .from('lead_sources')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .order('name')

    // Buscar campanhas
    const { data: campaigns } = await supabase
        .from('lead_campaigns')
        .select('id, name, source_name')
        .eq('tenant_id', tenantId)
        .order('name')

    // Buscar corretores (só para admin)
    let brokers: any[] = []
    if (isAdmin) {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('tenant_id', tenantId)
            .order('full_name')
        brokers = data || []
    }

    return {
        success: true,
        data: {
            stages: stages || [],
            sources: sources || [],
            campaigns: campaigns || [],
            brokers,
            isAdmin
        }
    }
}

// ─── Envio de Mensagem Individual ──────────────────────────────────────────────

export async function sendSingleBulkMessage(payload: SingleBulkMessagePayload) {
    const { recipient, message, mediaUrl, mediaType, fileName, instanceName } = payload;
    
    const normalizedNumber = normalizeWhatsAppNumber(recipient.phone);
    const personalizedMessage = message
        .replace(/{nome}/g, recipient.name)
        .replace(/{primeiro_nome}/g, recipient.name.split(' ')[0]);
    
    try {
        // Verificar se o número tem WhatsApp ativo (não-bloqueante)
        try {
            const checkResult = await evolutionService.checkNumber(instanceName, normalizedNumber);
            // A Evolution API pode retornar array OU objeto direto dependendo da versão
            const parsed = Array.isArray(checkResult) ? checkResult[0] : checkResult;
            if (parsed && parsed.exists === false) {
                return { success: false, phone: recipient.phone, error: 'Número não possui WhatsApp ativo.' };
            }
        } catch (checkErr: any) {
            // Se a verificação falhar (timeout, rede, etc.), NÃO bloquear — tentar enviar mesmo assim
            console.warn(`Aviso: verificação do número ${normalizedNumber} falhou, tentando envio direto:`, checkErr.message);
        }

        // CORREÇÃO: Quando há mídia + texto, enviar APENAS a mídia com caption
        // Evita mensagem duplicada para o destinatário
        if (mediaUrl && mediaType) {
            if (mediaType === 'document') {
                await evolutionService.sendDocument(instanceName, normalizedNumber, mediaUrl, fileName || 'documento', personalizedMessage);
            } else {
                await evolutionService.sendMedia(instanceName, normalizedNumber, mediaUrl, mediaType, personalizedMessage);
            }
        } else if (personalizedMessage) {
            // Envia texto puro apenas se NÃO houver mídia
            await evolutionService.sendMessage(instanceName, normalizedNumber, personalizedMessage);
        }

        // Registrar no espelhamento WhatsApp (whatsapp_chat) do lead
        if (recipient.lead_id) {
            const supabase = await createClient()

            // Buscar chat atual do lead
            const { data: leadData } = await supabase
                .from('leads')
                .select('whatsapp_chat')
                .eq('id', recipient.lead_id)
                .single()

            const currentChat = Array.isArray(leadData?.whatsapp_chat) ? leadData.whatsapp_chat : []
            const newMessage = {
                id: `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                text: personalizedMessage || (mediaUrl ? `📎 Mídia enviada` : ''),
                fromMe: true,
                timestamp: new Date().toISOString(),
                senderName: 'Você (Disparador)'
            }
            const updatedChat = [...currentChat, newMessage].slice(-20)

            await supabase
                .from('leads')
                .update({ whatsapp_chat: updatedChat })
                .eq('id', recipient.lead_id)

            // Registrar Log na tabela interactions
            const logMessage = personalizedMessage
                ? `Mensagem automatizada (Disparador): ${personalizedMessage.substring(0, 80)}...`
                : `Mídia enviada via Disparador em Massa`;
            await logInteraction(recipient.lead_id, 'whatsapp', logMessage);
        }

        return { success: true, phone: recipient.phone };
    } catch (err: any) {
        console.error(`Erro ao enviar para ${recipient.phone}:`, err);
        return { success: false, phone: recipient.phone, error: err.message };
    }
}

// ─── CRUD de Campanhas ─────────────────────────────────────────────────────────

export async function createBulkCampaign(data: {
    tenantId: string;
    profileId: string;
    title: string;
    message: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaName?: string;
    totalRecipients: number;
    filtersApplied?: Record<string, any>;
    sourceType: 'system' | 'file';
    recipientsData?: { name: string; phone: string; lead_id?: string }[];
    speedSetting?: string;
    instanceName?: string;
}) {
    const supabase = await createClient()

    const { data: campaign, error } = await supabase
        .from('bulk_campaigns')
        .insert({
            tenant_id: data.tenantId,
            profile_id: data.profileId,
            title: data.title,
            message: data.message,
            media_url: data.mediaUrl || null,
            media_type: data.mediaType || null,
            media_name: data.mediaName || null,
            total_recipients: data.totalRecipients,
            total_success: 0,
            total_errors: 0,
            status: 'sending',
            filters_applied: data.filtersApplied || {},
            source_type: data.sourceType,
            recipients_data: data.recipientsData || null,
            speed_setting: data.speedSetting || 'normal',
            instance_name: data.instanceName || null,
            current_index: 0,
            cancel_requested: false
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating bulk campaign:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: campaign }
}

// ─── Iniciar Disparo (Cria campanha + dispara Edge Function) ───────────────

export async function startBulkCampaign(data: {
    tenantId: string;
    profileId: string;
    title: string;
    message: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaName?: string;
    recipients: { name: string; phone: string; lead_id?: string }[];
    speedSetting: string;
    instanceName: string;
    filtersApplied?: Record<string, any>;
    sourceType: 'system' | 'file';
}) {
    // 1. Criar campanha com todos os dados
    const campaignResult = await createBulkCampaign({
        tenantId: data.tenantId,
        profileId: data.profileId,
        title: data.title,
        message: data.message,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        mediaName: data.mediaName,
        totalRecipients: data.recipients.length,
        filtersApplied: data.filtersApplied,
        sourceType: data.sourceType,
        recipientsData: data.recipients,
        speedSetting: data.speedSetting,
        instanceName: data.instanceName
    })

    if (!campaignResult.success || !campaignResult.data) {
        return campaignResult
    }

    const campaignId = campaignResult.data.id

    // 2. Disparar Edge Function (fire-and-forget)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceRoleKey) {
        fetch(`${supabaseUrl}/functions/v1/bulk-sender`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({ campaign_id: campaignId })
        }).catch(err => {
            console.error('Error invoking bulk-sender edge function:', err)
        })
    }

    return { success: true, data: campaignResult.data }
}

// ─── Cancelar Disparo em Andamento ─────────────────────────────────────────

export async function cancelBulkCampaign(campaignId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile) return { success: false, error: 'Perfil não encontrado.' }

    const { error } = await supabase
        .from('bulk_campaigns')
        .update({ cancel_requested: true })
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)

    if (error) {
        console.error('Error cancelling bulk campaign:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// ─── Cancelamento Forçado (quando Edge Function não responde) ──────────────

export async function forceCancelCampaign(campaignId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile) return { success: false, error: 'Perfil não encontrado.' }

    // Forçar status para 'cancelled' diretamente, independente do Edge Function
    const { error } = await supabase
        .from('bulk_campaigns')
        .update({
            status: 'cancelled',
            cancel_requested: true,
            completed_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)
        .in('status', ['sending', 'stalled'])

    if (error) {
        console.error('Error force-cancelling bulk campaign:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// ─── Verificar Campanha Travada (Stale Detection) ──────────────────────────

export async function checkStalledCampaign(campaignId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { stalled: false }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile) return { stalled: false }

    const { data: campaign } = await supabase
        .from('bulk_campaigns')
        .select('id, status, last_activity_at, current_index, total_recipients')
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)
        .single()

    if (!campaign) return { stalled: false }

    // Se status já é stalled, é stalled
    if (campaign.status === 'stalled') {
        return {
            stalled: true,
            currentIndex: campaign.current_index,
            totalRecipients: campaign.total_recipients
        }
    }

    // Se status é sending, checar last_activity_at
    if (campaign.status === 'sending' && campaign.last_activity_at) {
        const lastActivity = new Date(campaign.last_activity_at).getTime()
        const now = Date.now()
        const STALE_THRESHOLD_MS = 3 * 60 * 1000 // 3 minutos

        if (now - lastActivity > STALE_THRESHOLD_MS) {
            return {
                stalled: true,
                currentIndex: campaign.current_index,
                totalRecipients: campaign.total_recipients
            }
        }
    }

    return { stalled: false }
}

// ─── Retomar Disparo (Continuar de onde parou) ─────────────────────────────

export async function resumeBulkCampaign(campaignId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile) return { success: false, error: 'Perfil não encontrado.' }

    // Buscar campanha
    const { data: campaign, error: fetchError } = await supabase
        .from('bulk_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)
        .single()

    if (fetchError || !campaign) {
        return { success: false, error: 'Campanha não encontrada.' }
    }

    // Verificar se a campanha pode ser retomada
    const recipients = campaign.recipients_data || []
    const currentIndex = campaign.current_index || 0

    if (currentIndex >= recipients.length) {
        return { success: false, error: 'Todos os destinatários já foram processados.' }
    }

    // Atualizar status para 'sending' e resetar cancel_requested
    const { error: updateError } = await supabase
        .from('bulk_campaigns')
        .update({ 
            status: 'sending', 
            cancel_requested: false,
            completed_at: null
        })
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    // Disparar Edge Function (fire-and-forget) — ela vai retomar do current_index
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceRoleKey) {
        fetch(`${supabaseUrl}/functions/v1/bulk-sender`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({ campaign_id: campaignId })
        }).catch(err => {
            console.error('Error invoking bulk-sender edge function:', err)
        })
    }

    return { 
        success: true, 
        remaining: recipients.length - currentIndex,
        total: recipients.length,
        currentIndex 
    }
}

// ─── Verificar Campanha Ativa ──────────────────────────────────────────────

export async function checkActiveCampaign(tenantId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || profile.tenant_id !== tenantId) return null

    // Buscar campanha em sending OU stalled (para detectar campanhas travadas)
    const { data: campaign } = await supabase
        .from('bulk_campaigns')
        .select('id, current_index, total_recipients, total_success, total_errors, status, title, cancel_requested, last_activity_at')
        .eq('tenant_id', tenantId)
        .in('status', ['sending', 'stalled'])
        .eq('cancel_requested', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return campaign
}

export async function updateBulkCampaign(campaignId: string, data: {
    totalSuccess: number;
    totalErrors: number;
    status: 'sending' | 'completed' | 'cancelled';
}) {
    const supabase = await createClient()

    const updatePayload: Record<string, any> = {
        total_success: data.totalSuccess,
        total_errors: data.totalErrors,
        status: data.status
    }

    if (data.status === 'completed' || data.status === 'cancelled') {
        updatePayload.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
        .from('bulk_campaigns')
        .update(updatePayload)
        .eq('id', campaignId)

    if (error) {
        console.error('Error updating bulk campaign:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

export async function getBulkCampaigns(tenantId: string) {
    const supabase = await createClient()

    // Validar acesso
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || profile.tenant_id !== tenantId) {
        return { success: false, error: 'Acesso negado.' }
    }

    const { data: campaigns, error } = await supabase
        .from('bulk_campaigns')
        .select('*, profiles:profile_id(full_name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Error fetching bulk campaigns:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: campaigns }
}

export async function deleteBulkCampaign(campaignId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile) return { success: false, error: 'Perfil não encontrado.' }

    const { error } = await supabase
        .from('bulk_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)

    if (error) {
        console.error('Error deleting bulk campaign:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

export async function deleteAllBulkCampaigns(tenantId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || profile.tenant_id !== tenantId) {
        return { success: false, error: 'Acesso negado.' }
    }

    const { error } = await supabase
        .from('bulk_campaigns')
        .delete()
        .eq('tenant_id', tenantId)

    if (error) {
        console.error('Error deleting all bulk campaigns:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// ─── Vinculação Automática com Leads Existentes ────────────────────────────────

export async function matchRecipientsWithLeads(
    tenantId: string,
    phones: string[]
): Promise<{ success: boolean; matches: Record<string, string>; error?: string }> {
    const supabase = await createClient()

    // Validar autenticação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, matches: {}, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || profile.tenant_id !== tenantId) {
        return { success: false, matches: {}, error: 'Acesso negado.' }
    }

    // Normalizar todos os telefones para busca
    const normalizedPhones = phones.map(p => normalizeWhatsAppNumber(p))
    
    // Buscar contatos cujo telefone (normalizado) esteja na lista
    // Como o banco pode ter formatos variados, buscamos todos os contacts do tenant com phone
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, phone')
        .eq('tenant_id', tenantId)
        .not('phone', 'is', null)

    if (error) return { success: false, matches: {}, error: error.message }

    // Criar mapa de phone normalizado → contact_id
    const contactMap = new Map<string, string>()
    for (const contact of (contacts || [])) {
        if (contact.phone) {
            const normalized = normalizeWhatsAppNumber(contact.phone)
            contactMap.set(normalized, contact.id)
        }
    }

    // Encontrar contact_ids que fazem match com os telefones importados
    const matchedContactIds = normalizedPhones
        .filter(p => contactMap.has(p))
        .map(p => contactMap.get(p)!)
    
    if (matchedContactIds.length === 0) {
        return { success: true, matches: {} }
    }

    // Buscar leads mais recentes (não arquivados) para cada contact_id
    const { data: leads } = await supabase
        .from('leads')
        .select('id, contact_id')
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)
        .in('contact_id', [...new Set(matchedContactIds)])
        .order('created_at', { ascending: false })

    // Criar mapa contact_id → lead_id (pega o mais recente)
    const contactToLead = new Map<string, string>()
    for (const lead of (leads || [])) {
        if (lead.contact_id && !contactToLead.has(lead.contact_id)) {
            contactToLead.set(lead.contact_id, lead.id)
        }
    }

    // Montar mapa final: phone normalizado → lead_id
    const result: Record<string, string> = {}
    for (const phone of normalizedPhones) {
        const contactId = contactMap.get(phone)
        if (contactId) {
            const leadId = contactToLead.get(contactId)
            if (leadId) {
                result[phone] = leadId
            }
        }
    }

    return { success: true, matches: result }
}

// ─── Importação via Google Sheets ──────────────────────────────────────────────

export async function fetchGoogleSheetAsXlsx(sheetUrl: string): Promise<{ success: boolean; xlsxBase64?: string; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (!match || !match[1]) {
        return { success: false, error: 'URL inválida.' }
    }

    const sheetId = match[1]
    const browserHeaders = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
    }

    try {
        // Baixar a planilha inteira como XLSX — o SheetJS no frontend detecta as abas nativamente
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`
        const response = await fetch(exportUrl, { headers: browserHeaders, redirect: 'follow' })

        if (!response.ok) {
            if (response.status === 403 || response.status === 401) {
                return { success: false, error: 'Acesso negado. Certifique-se de que a planilha está compartilhada como "Qualquer pessoa com o link".' }
            }
            return { success: false, error: `Erro ao acessar a planilha (HTTP ${response.status}).` }
        }

        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')

        // Verificar se é realmente um arquivo xlsx (não uma página HTML de erro)
        if (base64.length < 100) {
            return { success: false, error: 'A planilha está vazia ou inacessível.' }
        }

        return { success: true, xlsxBase64: base64 }
    } catch (error: any) {
        console.error('Erro ao baixar Google Sheet como XLSX:', error)
        return { success: false, error: 'Falha na conexão com o Google Sheets. Tente novamente.' }
    }
}

export async function fetchGoogleSheetData(sheetUrl: string): Promise<{ success: boolean; csvData?: string; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    // Extrair ID da planilha do link do Google Sheets
    // Formatos aceitos:
    // https://docs.google.com/spreadsheets/d/SHEET_ID/edit...
    // https://docs.google.com/spreadsheets/d/SHEET_ID/
    // https://docs.google.com/spreadsheets/d/SHEET_ID
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (!match || !match[1]) {
        return { success: false, error: 'URL inválida. Cole o link de compartilhamento da planilha do Google Sheets.' }
    }

    const sheetId = match[1]

    // Extrair gid (ID da aba) se presente na URL
    const gidMatch = sheetUrl.match(/[#&?]gid=(\d+)/)
    const gid = gidMatch ? gidMatch[1] : '0'

    // Headers que simulam um navegador para evitar bloqueio do Google (HTTP 400)
    const browserHeaders = {
        'Accept': 'text/csv,text/plain,*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }

    // Tentar via /export (método principal)
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`

    try {
        let response = await fetch(exportUrl, {
            headers: browserHeaders,
            redirect: 'follow'
        })

        // Fallback: se /export falhar, tentar via /gviz/tq (API de consulta pública)
        if (!response.ok) {
            const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`
            response = await fetch(gvizUrl, {
                headers: browserHeaders,
                redirect: 'follow'
            })
        }

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: 'Planilha não encontrada. Verifique o link.' }
            }
            if (response.status === 403 || response.status === 401) {
                return { success: false, error: 'Acesso negado. Certifique-se de que a planilha está compartilhada como "Qualquer pessoa com o link".' }
            }
            return { success: false, error: `Erro ao acessar a planilha (HTTP ${response.status}). Certifique-se de que a planilha está compartilhada publicamente.` }
        }

        const csvData = await response.text()

        // Verificar se o Google retornou uma página HTML (login/consentimento) ao invés de CSV
        if (csvData.trim().startsWith('<!DOCTYPE') || csvData.trim().startsWith('<html')) {
            return { success: false, error: 'Acesso negado. Certifique-se de que a planilha está compartilhada como "Qualquer pessoa com o link".' }
        }

        if (!csvData || csvData.trim().length === 0) {
            return { success: false, error: 'A planilha está vazia.' }
        }

        return { success: true, csvData }
    } catch (error: any) {
        console.error('Erro ao buscar Google Sheet:', error)
        return { success: false, error: 'Falha na conexão com o Google Sheets. Tente novamente.' }
    }
}

// ─── CRUD de Templates Reutilizáveis ───────────────────────────────────────────

export async function saveBulkTemplate(data: {
    tenantId: string;
    name: string;
    message?: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaName?: string;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || profile.tenant_id !== data.tenantId) {
        return { success: false, error: 'Acesso negado.' }
    }

    const { data: template, error } = await supabase
        .from('bulk_templates')
        .insert({
            tenant_id: data.tenantId,
            profile_id: user.id,
            name: data.name,
            message: data.message || null,
            media_url: data.mediaUrl || null,
            media_type: data.mediaType || null,
            media_name: data.mediaName || null
        })
        .select()
        .single()

    if (error) {
        console.error('Error saving bulk template:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: template }
}

export async function getBulkTemplates(tenantId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile || profile.tenant_id !== tenantId) {
        return { success: false, error: 'Acesso negado.' }
    }

    const { data: templates, error } = await supabase
        .from('bulk_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) {
        console.error('Error fetching bulk templates:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: templates }
}

export async function deleteBulkTemplate(templateId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile) return { success: false, error: 'Perfil não encontrado.' }

    // Validar que o template pertence ao tenant do usuário (RLS também protege)
    const { error } = await supabase
        .from('bulk_templates')
        .delete()
        .eq('id', templateId)
        .eq('tenant_id', profile.tenant_id)
        .eq('profile_id', user.id)

    if (error) {
        console.error('Error deleting bulk template:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// ─── Logs Individuais de Destinatários ─────────────────────────────────────────

export async function logBulkRecipientResult(data: {
    campaignId: string;
    tenantId: string;
    recipientName: string;
    recipientPhone: string;
    leadId?: string;
    status: 'success' | 'error';
    errorMessage?: string;
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('bulk_campaign_recipients')
        .insert({
            campaign_id: data.campaignId,
            tenant_id: data.tenantId,
            recipient_name: data.recipientName,
            recipient_phone: data.recipientPhone,
            lead_id: data.leadId || null,
            status: data.status,
            error_message: data.errorMessage || null
        })

    if (error) {
        console.error('Error logging bulk recipient:', error)
    }

    return { success: !error }
}

export async function getBulkCampaignRecipients(campaignId: string, statusFilter?: 'error' | 'success' | 'all') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile) return { success: false, error: 'Perfil não encontrado.' }

    let query = supabase
        .from('bulk_campaign_recipients')
        .select('id, recipient_name, recipient_phone, lead_id, status, error_message, sent_at')
        .eq('campaign_id', campaignId)
        .eq('tenant_id', profile.tenant_id)
        .order('sent_at', { ascending: true })

    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
    }

    const { data: recipients, error } = await query

    if (error) {
        console.error('Error fetching campaign recipients:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: recipients }
}
