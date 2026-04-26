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
    const planType = (profile as any).tenants?.plan_type || 'freemium'
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
            contacts (
                name, phone
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

    const { data: leads, error } = await query

    if (error) return { success: false, error: error.message }

    // Filtrar leads sem telefone
    const recipients = (leads || [])
        .filter((l: any) => l.contacts?.phone)
        .map((l: any) => ({
            name: l.contacts?.name || 'Sem nome',
            phone: l.contacts?.phone || '',
            lead_id: l.id
        }))

    return { success: true, data: recipients }
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
        // Verificar se o número tem WhatsApp ativo
        try {
            const checkResult = await evolutionService.checkNumber(instanceName, normalizedNumber);
            if (!checkResult || !checkResult[0] || !checkResult[0].exists) {
                return { success: false, phone: recipient.phone, error: 'Número não possui WhatsApp ativo.' };
            }
            
            // Opcional: usar o número formatado devolvido pela API caso queira, 
            // mas o normalizedNumber já deve funcionar.
        } catch (checkErr: any) {
            console.error(`Erro ao verificar número ${normalizedNumber}:`, checkErr);
            // Dependendo do comportamento desejado, você pode bloquear o envio
            // ou tentar enviar mesmo assim. Por segurança, bloqueamos:
            return { success: false, phone: recipient.phone, error: 'Falha na verificação do número no WhatsApp.' };
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
    message: string;
    mediaUrl?: string;
    mediaType?: string;
    mediaName?: string;
    totalRecipients: number;
    filtersApplied?: Record<string, any>;
    sourceType: 'system' | 'file';
}) {
    const supabase = await createClient()

    const { data: campaign, error } = await supabase
        .from('bulk_campaigns')
        .insert({
            tenant_id: data.tenantId,
            profile_id: data.profileId,
            message: data.message,
            media_url: data.mediaUrl || null,
            media_type: data.mediaType || null,
            media_name: data.mediaName || null,
            total_recipients: data.totalRecipients,
            total_success: 0,
            total_errors: 0,
            status: 'sending',
            filters_applied: data.filtersApplied || {},
            source_type: data.sourceType
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating bulk campaign:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: campaign }
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

    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`

    try {
        const response = await fetch(exportUrl, {
            headers: { 'Accept': 'text/csv' },
            redirect: 'follow'
        })

        if (!response.ok) {
            if (response.status === 404) {
                return { success: false, error: 'Planilha não encontrada. Verifique o link.' }
            }
            if (response.status === 403 || response.status === 401) {
                return { success: false, error: 'Acesso negado. Certifique-se de que a planilha está compartilhada como "Qualquer pessoa com o link".' }
            }
            return { success: false, error: `Erro ao acessar a planilha (HTTP ${response.status}).` }
        }

        const csvData = await response.text()

        if (!csvData || csvData.trim().length === 0) {
            return { success: false, error: 'A planilha está vazia.' }
        }

        return { success: true, csvData }
    } catch (error: any) {
        console.error('Erro ao buscar Google Sheet:', error)
        return { success: false, error: 'Falha na conexão com o Google Sheets. Tente novamente.' }
    }
}
