'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from './profile'
import { getResendClient, getCleanEmailAddress } from '@/lib/emails/client'
import { getPropertyEmail } from '@/lib/emails/templates'
import { getPropertyUrl } from '@/lib/utils/url'

// Criar campanha de email em massa
export async function createEmailBulkCampaign(params: {
    tenantId: string,
    profileId: string,
    title: string,
    subject: string,
    contentHtml: string,
    contentText?: string,
    senderName: string,
    senderEmail: string,
    totalRecipients: number
}) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('email_campaigns')
            .insert([{
                tenant_id: params.tenantId,
                title: params.title,
                subject: params.subject,
                content_html: params.contentHtml,
                content_text: params.contentText,
                sender_name: params.senderName,
                sender_email: params.senderEmail,
                status: 'sending',
                total_recipients: params.totalRecipients,
                created_by: params.profileId
            }])
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error creating email bulk campaign:', error)
        return { success: false, error: error.message }
    }
}

// Atualizar status e estatísticas da campanha
export async function updateEmailCampaign(campaignId: string, updates: any) {
    const supabase = await createClient()
    try {
        const { data, error } = await supabase
            .from('email_campaigns')
            .update(updates)
            .eq('id', campaignId)
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error updating email campaign:', error)
        return { success: false, error: error.message }
    }
}

// Salvar logs individuais (quando os emails são enviados em batch, precisamos registrar quem recebeu)
export async function logEmailRecipientResult(params: {
    campaignId: string,
    tenantId: string,
    leadId?: string,
    recipientEmail: string,
    status: string,
    resendEmailId?: string,
    errorMessage?: string
}) {
    const supabase = await createClient()
    try {
        const { error } = await supabase
            .from('email_campaign_logs')
            .insert([{
                campaign_id: params.campaignId,
                tenant_id: params.tenantId,
                lead_id: params.leadId || null,
                recipient_email: params.recipientEmail,
                status: params.status,
                resend_email_id: params.resendEmailId || null,
                error_message: params.errorMessage || null
            }])

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Error logging email recipient:', error)
        return { success: false, error: error.message }
    }
}

// Obter emails descadastrados (opt-out) do tenant para filtrar antes do envio
export async function getUnsubscribedEmails(tenantId: string) {
    const supabase = await createClient()
    try {
        const { data, error } = await supabase
            .from('email_unsubscribes')
            .select('email')
            .eq('tenant_id', tenantId)

        if (error) throw error
        return { success: true, data: data.map((u: any) => u.email.toLowerCase()) }
    } catch (error: any) {
        console.error('Error fetching unsubscribed emails:', error)
        return { success: false, data: [] }
    }
}

// Envio em Lote via Resend
export async function sendBulkEmailsBatch(params: {
    campaignId: string,
    tenantId: string,
    subject: string,
    contentHtml: string,
    senderName: string,
    senderEmail: string,
    recipients: { email: string, name: string, lead_id?: string }[],
    attachment?: { url: string, name: string, type: string } | null
}) {
    const resend = getResendClient()
    if (!resend) return { success: false, error: 'API do Resend não configurada.' }

    // Obter lista negra
    const unsubscribedResult = await getUnsubscribedEmails(params.tenantId)
    const unsubscribedEmails = unsubscribedResult.success ? unsubscribedResult.data : []

    // Sanitizar e filtrar destinatários válidos
    // Emails importados de planilhas podem conter: "email@gmail.com; email@gmail.com;", espaços, etc.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    const validRecipients = params.recipients
        .map(r => {
            // Limpar o email: remover espaços, pegar apenas o primeiro email se houver separadores
            let cleanEmail = (r.email || '').trim()
            
            // Se contém ; ou , (separadores comuns em planilhas), pegar apenas o primeiro email válido
            if (cleanEmail.includes(';') || cleanEmail.includes(',')) {
                const parts = cleanEmail.split(/[;,]/).map(p => p.trim()).filter(Boolean)
                cleanEmail = parts.find(p => emailRegex.test(p)) || ''
            }
            
            // Remover caracteres invisíveis e espaços extras
            cleanEmail = cleanEmail.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim().toLowerCase()
            
            return { ...r, email: cleanEmail }
        })
        .filter(r => 
            r.email && 
            emailRegex.test(r.email) && 
            !unsubscribedEmails?.includes(r.email)
        )

    const totalValid = validRecipients.length
    if (totalValid === 0) return { success: false, error: 'Nenhum destinatário válido após filtragem de opt-out.' }

    const from = `"${params.senderName}" <${params.senderEmail}>`

    let totalSuccess = 0;
    let totalErrors = 0;

    // Preparar anexo se existir
    let attachmentData: { filename: string, content: Buffer } | null = null
    if (params.attachment?.url) {
        try {
            const response = await fetch(params.attachment.url)
            const arrayBuffer = await response.arrayBuffer()
            attachmentData = {
                filename: params.attachment.name,
                content: Buffer.from(arrayBuffer)
            }
        } catch (err) {
            console.error('Erro ao baixar anexo:', err)
        }
    }

    // O Resend batch endpoint NÃO suporta attachments.
    // Se houver anexo, enviamos individualmente; caso contrário, usamos batch.
    const hasAttachment = !!attachmentData

    if (hasAttachment) {
        // === ENVIO INDIVIDUAL (com anexo) ===
        for (let i = 0; i < validRecipients.length; i++) {
            const r = validRecipients[i]
            try {
                const personalizedHtml = params.contentHtml
                    .replace(/{nome}/gi, r.name || 'Cliente')
                    .replace(/{primeiro_nome}/gi, (r.name || 'Cliente').split(' ')[0])

                const { data, error } = await resend.emails.send({
                    from,
                    to: [r.email],
                    subject: params.subject,
                    html: personalizedHtml,
                    attachments: attachmentData ? [attachmentData] : [],
                    tags: [
                        { name: 'campaign_id', value: params.campaignId },
                        { name: 'tenant_id', value: params.tenantId }
                    ]
                })

                if (error) {
                    totalErrors++
                    await logEmailRecipientResult({
                        campaignId: params.campaignId,
                        tenantId: params.tenantId,
                        leadId: r.lead_id,
                        recipientEmail: r.email,
                        status: 'error',
                        errorMessage: error.message
                    })
                } else if (data && data.id) {
                    totalSuccess++
                    await logEmailRecipientResult({
                        campaignId: params.campaignId,
                        tenantId: params.tenantId,
                        leadId: r.lead_id,
                        recipientEmail: r.email,
                        status: 'delivered',
                        resendEmailId: data.id
                    })
                }
            } catch (err: any) {
                totalErrors++
                console.error(`Exception sending email to ${r.email}:`, err)
            }

            // Pequena pausa entre envios individuais para não exceder rate limit
            if (i < validRecipients.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }
    } else {
        // === ENVIO EM BATCH (sem anexo) ===
        // O Resend permite mandar até 100 emails por requisição no Batch.
        const CHUNK_SIZE = 100;

        for (let i = 0; i < validRecipients.length; i += CHUNK_SIZE) {
            const chunk = validRecipients.slice(i, i + CHUNK_SIZE);
            
            const batchPayload = chunk.map(r => ({
                from,
                to: [r.email],
                subject: params.subject,
                html: params.contentHtml
                    .replace(/{nome}/gi, r.name || 'Cliente')
                    .replace(/{primeiro_nome}/gi, (r.name || 'Cliente').split(' ')[0]),
                tags: [
                    { name: 'campaign_id', value: params.campaignId },
                    { name: 'tenant_id', value: params.tenantId }
                ]
            }));

            try {
                const { data, error } = await resend.batch.send(batchPayload);

                if (error) {
                    console.error(`Error sending batch chunk ${i}:`, error);
                    totalErrors += chunk.length;
                    
                    for (const r of chunk) {
                        await logEmailRecipientResult({
                            campaignId: params.campaignId,
                            tenantId: params.tenantId,
                            leadId: r.lead_id,
                            recipientEmail: r.email,
                            status: 'error',
                            errorMessage: error.message
                        });
                    }
                } else if (data && Array.isArray(data)) {
                    // Resend batch.send retorna { data: [{id: "..."}, ...] }
                    // O SDK destructura para data = [{id: "..."}, ...]
                    totalSuccess += data.length;
                    
                    for (let j = 0; j < chunk.length; j++) {
                        const r = chunk[j];
                        const resendResponse = data[j] as any;
                        
                        if (resendResponse && resendResponse.id) {
                            await logEmailRecipientResult({
                                campaignId: params.campaignId,
                                tenantId: params.tenantId,
                                leadId: r.lead_id,
                                recipientEmail: r.email,
                                status: 'delivered',
                                resendEmailId: resendResponse.id
                            });
                        } else {
                            totalErrors++;
                            totalSuccess--; // Corrigir contagem
                            await logEmailRecipientResult({
                                campaignId: params.campaignId,
                                tenantId: params.tenantId,
                                leadId: r.lead_id,
                                recipientEmail: r.email,
                                status: 'error',
                                errorMessage: resendResponse?.error?.message || 'Erro desconhecido na Resend'
                            });
                        }
                    }
                } else {
                    // Fallback: data existe mas não é array (formato inesperado)
                    console.error(`Unexpected batch response format:`, JSON.stringify(data));
                    totalErrors += chunk.length;
                }
            } catch (err: any) {
                console.error(`Exception sending batch chunk ${i}:`, err);
                totalErrors += chunk.length;
            }

            // Se tiver mais chunks, dar uma pequena pausa
            if (i + CHUNK_SIZE < validRecipients.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // Atualizar stats da campanha
    await updateEmailCampaign(params.campaignId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_sent: totalSuccess,
        total_bounced: totalErrors // simplificacao, webhooks farão melhor track de bounces
    });

    return { 
        success: true, 
        data: { 
            totalAttempted: params.recipients.length,
            totalValid,
            totalSuccess,
            totalErrors,
            unsubscribedRemoved: params.recipients.length - totalValid
        }
    }
}

export async function getEmailCampaigns(tenantId: string) {
    const supabase = await createClient()
    try {
        const { data, error } = await supabase
            .from('email_campaigns')
            .select(`
                *,
                profiles:created_by (full_name)
            `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching email campaigns:', error)
        return { success: false, error: error.message }
    }
}

// Filtros avançados para destinatários do E-mail Marketing
interface AdvancedEmailFilters {
    stageIds?: string[];
    leadSource?: string;
    campaign?: string;
    assignedTo?: string;
    clientName?: string;
    nameQuery?: string;
    propertyName?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: string;
    location?: string;
}

export async function getLeadsForEmailBulk(tenantId: string, filters?: AdvancedEmailFilters) {
    const supabase = await createClient()

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

    // Realizar a query de leads, puxando dados do contato e do imóvel de interesse
    let query = supabase
        .from('leads')
        .select(`
            id,
            stage_id,
            lead_source,
            campaign,
            assigned_to,
            property_id,
            contacts!inner (
                name, email
            ),
            properties (
                title,
                type,
                price,
                details
            )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)

    // Filtros de leads base
    if (!isAdmin && profile.id) {
        query = query.eq('assigned_to', user.id)
    } else if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo)
    }

    if (filters?.stageIds && filters.stageIds.length > 0) {
        query = query.in('stage_id', filters.stageIds)
    }
    if (filters?.leadSource) {
        query = query.eq('lead_source', filters.leadSource)
    }
    if (filters?.campaign) {
        query = query.eq('campaign', filters.campaign)
    }
    if (filters?.nameQuery) {
        // Filtrar por nome usando o inner join com contacts
        query = query.ilike('contacts.name', `%${filters.nameQuery}%`)
    }

    // Filtros de Imóvel via PostgREST (se propertyType, price, etc forem informados)
    // Usamos inner join na tabela referenciada se os filtros de imóvel forem aplicados
    // Mas no supabase-js v2, filtrar tabelas relacionadas usando .eq() exige inner join explícito
    // Opcionalmente, filtramos na memória para evitar problemas com JSON no supabase.

    const { data: leads, error } = await query

    if (error) return { success: false, error: error.message }

    // Obter lista de emails já com opt-out (blacklist)
    const { data: unsubscribed } = await supabase
        .from('email_unsubscribes')
        .select('email')
        .eq('tenant_id', tenantId)

    const blacklisted = (unsubscribed || []).map((u: { email: string }) => u.email.toLowerCase())

    // Processamento em Memória dos Filtros de Imóvel e formatação
    interface RecipientWithProperty {
        lead_id: string;
        name: string;
        email: string;
        property: any;
    }

    const mapped: RecipientWithProperty[] = (leads || [])
        // O Supabase às vezes retorna array ou null em relacionamentos 1:1 dependendo da schema (contacts é array no types? não, deve ser obj)
        .map((l: any) => ({
            lead_id: l.id as string,
            name: (Array.isArray(l.contacts) ? l.contacts[0]?.name : l.contacts?.name || 'Sem nome') as string,
            email: (Array.isArray(l.contacts) ? l.contacts[0]?.email : l.contacts?.email || '') as string,
            property: l.properties || null
        }))

    // Só aceita quem tem email válido e não está na blacklist
    let recipients = mapped.filter(r => r.email && r.email.includes('@') && !blacklisted.includes(r.email.toLowerCase()))

    // Aplicar filtros avançados na memória
    // Filtro por nome do cliente (contacts.name)
    if (filters?.clientName) {
        const q = filters.clientName.toLowerCase()
        recipients = recipients.filter(r => r.name.toLowerCase().includes(q))
    }
    // Filtro por nome do imóvel
    if (filters?.propertyName) {
        const query = filters.propertyName.toLowerCase()
        recipients = recipients.filter(r => r.property?.title && r.property.title.toLowerCase().includes(query))
    }
    if (filters?.propertyType) {
        recipients = recipients.filter(r => r.property?.type === filters.propertyType)
    }
    // Filtro de valor: se só minPrice, usar ±50%
    if (filters?.minPrice && !filters?.maxPrice) {
        const val = filters.minPrice
        const min50 = val * 0.5
        const max50 = val * 1.5
        recipients = recipients.filter(r => r.property?.price && r.property.price >= min50 && r.property.price <= max50)
    } else {
        if (filters?.minPrice) {
            recipients = recipients.filter(r => r.property?.price && r.property.price >= filters.minPrice!)
        }
        if (filters?.maxPrice) {
            recipients = recipients.filter(r => r.property?.price && r.property.price <= filters.maxPrice!)
        }
    }
    // Filtro de dormitórios (campo 'quartos' no details)
    if (filters?.bedrooms && filters.bedrooms !== 'any') {
        const bdReq = parseInt(filters.bedrooms)
        recipients = recipients.filter(r => {
            if (!r.property?.details) return false
            const propBd = parseInt(r.property.details.quartos || r.property.details.bedrooms || '0')
            return filters.bedrooms!.includes('+') ? propBd >= bdReq : propBd === bdReq
        })
    }
    // Filtro de localização (bairro ou cidade no endereco)
    if (filters?.location) {
        const loc = filters.location.toLowerCase()
        recipients = recipients.filter(r => {
            if (!r.property?.details?.endereco) return false
            const end = r.property.details.endereco
            const bairro = (end.bairro || '').toLowerCase()
            const cidade = (end.cidade || '').toLowerCase()
            return bairro.includes(loc) || cidade.includes(loc)
        })
    }

    // Remover a propriedade do resultado final para não vazar dados e pesar o payload
    const finalData = recipients.map(r => ({
        lead_id: r.lead_id,
        name: r.name,
        email: r.email
    }))

    return { success: true, data: finalData }
}


// Obter logs individuais de uma campanha para o relatório
export async function getEmailCampaignReport(campaignId: string) {
    const supabase = await createClient()
    try {
        const { data, error } = await supabase
            .from('email_campaign_logs')
            .select(`
                *,
                leads (
                    id,
                    contacts (name)
                )
            `)
            .eq('campaign_id', campaignId)
            .order('sent_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching email campaign report:', error)
        return { success: false, error: error.message }
    }
}

// Gerar HTML de e-mail com dados de um imóvel (reutiliza template profissional)
export async function generatePropertyEmailHtml(params: {
    tenantId: string,
    propertyId: string,
    config: {
        title?: boolean,
        price?: boolean,
        showCondo?: boolean,
        showIptu?: boolean,
        description?: 'full' | 'none',
        location?: 'exact' | 'approximate' | 'none',
        showBedrooms?: boolean,
        showSuites?: boolean,
        showArea?: boolean,
        showType?: boolean,
        showAmenities?: boolean,
        showSacada?: boolean,
        showEscritorio?: boolean,
        showDependencia?: boolean,
        showObservations?: boolean,
        selectedImages?: string[],
        selectedVideos?: string[],
        selectedDocs?: { name?: string, url: string }[],
    }
}) {
    const supabase = await createClient()

    try {
        // Buscar dados completos do imóvel
        const { data: property, error: propError } = await supabase
            .from('properties')
            .select('*')
            .eq('id', params.propertyId)
            .eq('tenant_id', params.tenantId)
            .single()

        if (propError || !property) throw new Error('Imóvel não encontrado')

        // Buscar dados do tenant para gerar URL
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('slug, custom_domain, custom_domain_verified')
            .eq('id', params.tenantId)
            .single()

        if (tenantError || !tenant) throw new Error('Tenant não encontrado')

        // Buscar configurações de e-mail (branding)
        const { data: emailSettings } = await supabase
            .from('email_settings')
            .select('*')
            .eq('tenant_id', params.tenantId)
            .single()

        // Gerar URL pública do imóvel
        const propertyUrl = getPropertyUrl(
            tenant,
            property.id,
            property.slug,
            property.type
        )

        // Montar config no formato esperado pelo getPropertyEmail
        const emailConfig = {
            ...params.config,
            images: params.config.selectedImages || property.images || [],
            videos: params.config.selectedVideos || property.videos || [],
            documents: params.config.selectedDocs || property.documents || [],
        }

        const { subject, html } = getPropertyEmail(
            property,
            propertyUrl,
            emailConfig,
            emailSettings || {}
        )

        return { success: true, html, subject }
    } catch (error: any) {
        console.error('Error generating property email HTML:', error)
        return { success: false, error: error.message }
    }
}

// Excluir uma campanha de email e seus logs
export async function deleteEmailCampaign(campaignId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    if (!profile) return { success: false, error: 'Perfil não encontrado.' }

    // Deletar logs primeiro
    await supabase
        .from('email_campaign_logs')
        .delete()
        .eq('campaign_id', campaignId)

    // Deletar campanha
    const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('tenant_id', profile.tenant_id)

    if (error) {
        console.error('Error deleting email campaign:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// Excluir todas as campanhas de email do tenant
export async function deleteAllEmailCampaigns(tenantId: string) {
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

    // Buscar IDs das campanhas para deletar logs
    const { data: campaigns } = await supabase
        .from('email_campaigns')
        .select('id')
        .eq('tenant_id', tenantId)

    if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map((c: any) => c.id)
        await supabase
            .from('email_campaign_logs')
            .delete()
            .in('campaign_id', campaignIds)
    }

    // Deletar campanhas
    const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('tenant_id', tenantId)

    if (error) {
        console.error('Error deleting all email campaigns:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}
