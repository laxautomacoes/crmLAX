'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getProfile } from './profile'

export interface MarketingCampaign {
    id: string
    tenant_id: string
    plataforma: string
    campanha_id: string | null
    campanha_nome: string
    custo: number
    moeda: string | null
    data_inicio: string
    data_fim: string | null
    metadata: Record<string, any> | null
    created_at: string | null
    leads_count?: number
    cpl?: number
}

export interface CreateCampaignData {
    plataforma: string
    campanha_nome: string
    custo: number
    data_inicio: string
    data_fim?: string | null
    status: 'Ativa' | 'Pausada' | 'Concluída'
    tipo_canal?: string
    observacoes?: string
    generate_financial_expense?: boolean
}

export async function getMarketingCampaigns(tenantId: string): Promise<{
    success: boolean
    data?: MarketingCampaign[]
    metrics?: {
        totalInvestimento: number
        totalLeads: number
        cplMedio: number
        canaisAtivos: number
    }
    error?: string
}> {
    const supabase = await createClient()

    try {
        // 1. Buscar origens de tráfego/campanhas
        const { data: campaigns, error: campaignErr } = await supabase
            .from('origens_trafego')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })

        if (campaignErr) throw campaignErr

        // 2. Buscar contagem de leads agrupados por fonte/origem
        const { data: leads, error: leadsErr } = await supabase
            .from('leads')
            .select('source, lead_source, utm_source')
            .eq('tenant_id', tenantId)

        if (leadsErr) throw leadsErr

        // Criar mapa de contagem de leads por nome de plataforma/fonte (normalizado)
        const leadCountsMap: Record<string, number> = {}
        let totalLeadsCaptados = 0

        for (const l of leads || []) {
            totalLeadsCaptados++
            const src = (l.source || l.lead_source || l.utm_source || 'Desconhecido').toLowerCase().trim()
            leadCountsMap[src] = (leadCountsMap[src] || 0) + 1
        }

        let totalInvestimento = 0
        let canaisAtivosSet = new Set<string>()

        const campaignsWithMetrics: MarketingCampaign[] = (campaigns || []).map((c: any) => {
            const custo = Number(c.custo) || 0
            const status = c.metadata?.status || 'Ativa'

            if (status === 'Ativa') {
                totalInvestimento += custo
                canaisAtivosSet.add(c.plataforma)
            }

            // Encontrar contagem de leads correspondentes pela plataforma ou nome da campanha
            const platNorm = (c.plataforma || '').toLowerCase().trim()
            const campNorm = (c.campanha_nome || '').toLowerCase().trim()

            let count = 0
            Object.keys(leadCountsMap).forEach(key => {
                if (key.includes(platNorm) || platNorm.includes(key) || key.includes(campNorm)) {
                    count += leadCountsMap[key]
                }
            })

            const cpl = count > 0 ? custo / count : 0

            return {
                id: c.id,
                tenant_id: c.tenant_id,
                plataforma: c.plataforma,
                campanha_id: c.campanha_id,
                campanha_nome: c.campanha_nome,
                custo,
                moeda: c.moeda || 'BRL',
                data_inicio: c.data_inicio,
                data_fim: c.data_fim,
                metadata: c.metadata || {},
                created_at: c.created_at,
                leads_count: count,
                cpl
            }
        })

        const cplMedio = totalLeadsCaptados > 0 ? totalInvestimento / totalLeadsCaptados : (campaignsWithMetrics.length > 0 && totalInvestimento > 0 ? totalInvestimento / Math.max(1, totalLeadsCaptados) : 0)

        return {
            success: true,
            data: campaignsWithMetrics,
            metrics: {
                totalInvestimento,
                totalLeads: totalLeadsCaptados,
                cplMedio,
                canaisAtivos: canaisAtivosSet.size
            }
        }
    } catch (error: any) {
        console.error('Erro ao buscar campanhas de marketing:', error)
        return { success: false, error: error.message || 'Erro ao carregar dados de marketing' }
    }
}

export async function createMarketingCampaign(
    tenantId: string,
    data: CreateCampaignData
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { profile } = await getProfile()

    if (!profile) return { success: false, error: 'Usuário não autenticado' }

    try {
        const metadata = {
            status: data.status,
            tipo_canal: data.tipo_canal || 'Anúncio Pago',
            observacoes: data.observacoes || '',
            generate_financial_expense: !!data.generate_financial_expense
        }

        // 1. Inserir em origens_trafego
        const { error: insertErr } = await supabase
            .from('origens_trafego')
            .insert({
                tenant_id: tenantId,
                plataforma: data.plataforma,
                campanha_nome: data.campanha_nome,
                custo: data.custo,
                moeda: 'BRL',
                data_inicio: data.data_inicio,
                data_fim: data.data_fim || null,
                metadata
            })

        if (insertErr) throw insertErr

        // 2. Se marcado para gerar despesa automática no financeiro
        if (data.generate_financial_expense && data.custo > 0) {
            await supabase
                .from('transacoes_financeiras')
                .insert({
                    tenant_id: tenantId,
                    profile_id: profile.id,
                    tipo: 'Despesa',
                    categoria: 'Marketing / Ads',
                    descricao: `[Marketing] ${data.plataforma} - ${data.campanha_nome}`,
                    valor: data.custo,
                    data_transacao: data.data_inicio,
                    status: 'pago',
                    fonte: 'Marketing'
                })
        }

        revalidatePath('/marketing/ads')
        revalidatePath('/dashboard')
        revalidatePath('/financeiro')
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao criar campanha de marketing:', error)
        return { success: false, error: error.message || 'Erro ao cadastrar campanha' }
    }
}

export async function updateMarketingCampaign(
    id: string,
    data: Partial<CreateCampaignData>
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
        const { data: existing, error: getErr } = await supabase
            .from('origens_trafego')
            .select('*')
            .eq('id', id)
            .single()

        if (getErr || !existing) throw new Error('Campanha não encontrada')

        const currentMetadata = existing.metadata || {}
        const updatedMetadata = {
            ...currentMetadata,
            ...(data.status ? { status: data.status } : {}),
            ...(data.tipo_canal ? { tipo_canal: data.tipo_canal } : {}),
            ...(data.observacoes !== undefined ? { observacoes: data.observacoes } : {})
        }

        const payload: any = {
            metadata: updatedMetadata
        }

        if (data.plataforma) payload.plataforma = data.plataforma
        if (data.campanha_nome) payload.campanha_nome = data.campanha_nome
        if (data.custo !== undefined) payload.custo = data.custo
        if (data.data_inicio) payload.data_inicio = data.data_inicio
        if (data.data_fim !== undefined) payload.data_fim = data.data_fim

        const { error: updateErr } = await supabase
            .from('origens_trafego')
            .update(payload)
            .eq('id', id)

        if (updateErr) throw updateErr

        revalidatePath('/marketing/ads')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao atualizar campanha de marketing:', error)
        return { success: false, error: error.message || 'Erro ao atualizar campanha' }
    }
}

export async function deleteMarketingCampaign(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('origens_trafego')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/marketing/ads')
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao excluir campanha de marketing:', error)
        return { success: false, error: error.message || 'Erro ao excluir campanha' }
    }
}
