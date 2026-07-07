'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from './profile'
import { Tables } from '@/lib/supabase/database.types'

export interface DashboardMetrics {
    kpis: {
        leadsAtivos: number
        leadsAtivosTrend: string
        properties: number
        propertiesTrend: string
        conversoes: number
        conversoesTrend: string
    }
    funnelSteps: Array<{
        label: string
        count: number
        stageId: string
        color?: string
    }>
    recentLeads: Array<{
        id: string
        name: string
        interest: string
        status: string
        color?: string
        created_at: string
        last_interaction_at?: string | null
        assigned_to_name?: string
    }>
}

export interface ROIMetrics {
    totalCustos: number
    totalReceita: number
    roi: number
    cpl: number // Custo por Lead
    leadsCount: number
}

export async function getDashboardMetrics(tenantId: string) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

    try {
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

        // 1. Chamar RPC para agregar todos os counts
        const countsQuery = supabase.rpc('get_dashboard_counts', {
            p_tenant_id: tenantId,
            p_user_id: (!isAdmin && profile?.id) ? profile.id : null,
            p_start_curr: thirtyDaysAgo,
            p_start_prev: sixtyDaysAgo
        })

        let stagesQuery = supabase
            .from('lead_stages')
            .select('id, name, order_index, color')
            .eq('tenant_id', tenantId)
            .order('order_index', { ascending: true })

        let recentLeadsQuery = supabase
            .from('leads')
            .select(`
                id,
                created_at,
                stage_id,
                source,
                last_interaction_at,
                contacts (
                    name
                ),
                profiles:assigned_to (
                    full_name
                )
            `)
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)
            .order('created_at', { ascending: false })
            .limit(10)

        if (!isAdmin && profile?.id) {
            recentLeadsQuery = recentLeadsQuery.eq('assigned_to', profile.id)
        }

        // 2. Executar em paralelo
        const [
            countsRes,
            stagesRes,
            recentLeadsRes
        ] = await Promise.all([
            countsQuery,
            stagesQuery,
            recentLeadsQuery
        ])

        if (countsRes.error) throw countsRes.error
        if (stagesRes.error) throw stagesRes.error
        if (recentLeadsRes.error) throw recentLeadsRes.error

        const countsData = countsRes.data as any
        const totalLeads = countsData?.leads?.total || 0
        const totalProperties = countsData?.properties?.total || 0
        const stages = stagesRes.data || []
        const recentLeadsData = recentLeadsRes.data || []
        const currLeadsCount = countsData?.leads?.curr || 0
        const prevLeadsCount = countsData?.leads?.prev || 0
        const currPropertiesCount = countsData?.properties?.curr || 0
        const prevPropertiesCount = countsData?.properties?.prev || 0
        const funnelCounts = countsData?.funnel || {}

        if (stages.length === 0) {
            console.log('Nenhum estágio encontrado para o tenant:', tenantId);
            return {
                success: true,
                data: {
                    kpis: {
                        leadsAtivos: totalLeads,
                        leadsAtivosTrend: '+0%',
                        properties: totalProperties,
                        propertiesTrend: '+0',
                        conversoes: 0,
                        conversoesTrend: '+0'
                    },
                    funnelSteps: [],
                    recentLeads: []
                } as DashboardMetrics
            };
        }

        const uniqueStagesMap = new Map<string, typeof stages[0]>();
        stages.forEach((stage: any) => {
            if (!uniqueStagesMap.has(stage.name)) {
                uniqueStagesMap.set(stage.name, stage);
            }
        });
        const uniqueStages = Array.from(uniqueStagesMap.values());

        const winStage = uniqueStages.find((s: any) =>
            s.name.toLowerCase().includes('ganho') ||
            s.name.toLowerCase().includes('fechado') ||
            s.name.toLowerCase().includes('concluído')
        )

        let conversions = 0
        if (winStage && funnelCounts[winStage.id]) {
            conversions = funnelCounts[winStage.id]
        }

        const funnelSteps = uniqueStages.map((stage: any) => ({
            label: stage.name,
            count: funnelCounts[stage.id] || 0,
            stageId: stage.id,
            color: stage.color || undefined
        }))

        const recentLeads = recentLeadsData.map((lead: any) => {
            const stage = stages.find((s: any) => s.id === lead.stage_id);
            return {
                id: lead.id,
                name: lead.contacts?.name || 'Sem nome',
                interest: lead.source || 'N/A',
                status: stage?.name || 'Novo',
                color: stage?.color || undefined,
                created_at: lead.created_at,
                last_interaction_at: lead.last_interaction_at,
                assigned_to_name: lead.profiles?.full_name || 'Sem responsável'
            };
        })

        const calcTrend = (curr: number, prev: number): string => {
            if (prev === 0) return curr > 0 ? '+100%' : '+0%'
            const pct = Math.round(((curr - prev) / prev) * 100)
            return pct >= 0 ? `+${pct}%` : `${pct}%`
        }

        return {
            success: true,
            data: {
                kpis: {
                    leadsAtivos: totalLeads,
                    leadsAtivosTrend: calcTrend(currLeadsCount, prevLeadsCount),
                    properties: totalProperties,
                    propertiesTrend: calcTrend(currPropertiesCount, prevPropertiesCount),
                    conversoes: conversions,
                    conversoesTrend: calcTrend(conversions, 0)
                },
                funnelSteps,
                recentLeads
            } as DashboardMetrics
        }
    } catch (error: any) {
        console.error('Error fetching dashboard metrics:', error)
        const parts: string[] = []
        if (error?.message && error.message.trim()) parts.push(error.message.trim())
        if (error?.hint && error.hint.trim()) parts.push(`Dica: ${error.hint.trim()}`)
        if (error?.code) parts.push(`Código: ${error.code}`)
        if (error?.status) parts.push(`HTTP ${error.status}`)
        const errorDetails = parts.length > 0
            ? parts.join(' | ')
            : (typeof error === 'object' ? JSON.stringify(error) : String(error))
        return {
            success: false,
            error: errorDetails || "Erro desconhecido ao carregar métricas"
        }
    }
}
export async function getROIMetrics(tenantId: string): Promise<{ success: boolean; data?: ROIMetrics; error?: string }> {
    const supabase = await createClient()
    
    try {
        // 1. Iniciar queries independentes principais
        const txQuery = supabase
            .from('transacoes_financeiras')
            .select('valor, tipo')
            .eq('tenant_id', tenantId)
            .eq('status', 'pago')

        const leadsCountQuery = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        // 2. Executar buscas principais em paralelo
        const [txRes, leadsCountRes] = await Promise.all([txQuery, leadsCountQuery])

        if (txRes.error) throw txRes.error
        if (leadsCountRes.error) throw leadsCountRes.error

        const txData = txRes.data || []
        const leadsCount = leadsCountRes.count || 0

        const hasRealData = txData.length > 0

        let totalReceita = 0
        let totalCustos = 0

        if (hasRealData) {
            // Usar dados reais de transações financeiras
            totalReceita = txData
                .filter((t: any) => t.tipo === 'Receita')
                .reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0)

            totalCustos = txData
                .filter((t: any) => t.tipo === 'Despesa')
                .reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0)
        } else {
            // Fallback: cálculo antigo com traffic_sources + leads ganhos em paralelo
            const trafficQuery = supabase
                .from('traffic_sources')
                .select('custo')
                .eq('tenant_id', tenantId)

            const stagesQuery = supabase
                .from('lead_stages')
                .select('id, name')
                .eq('tenant_id', tenantId)

            const [trafficRes, stagesRes] = await Promise.all([trafficQuery, stagesQuery])

            const trafficData = trafficRes.data || []
            const allStages = stagesRes.data || []

            totalCustos = trafficData.reduce((acc: number, curr: any) => acc + (Number(curr.custo) || 0), 0)

            const winStage = allStages.find((s: any) =>
                s.name.toLowerCase().includes('ganho') ||
                s.name.toLowerCase().includes('fechado') ||
                s.name.toLowerCase().includes('concluído')
            )

            if (winStage) {
                const { data: leadsData } = await supabase
                    .from('leads')
                    .select('value')
                    .eq('tenant_id', tenantId)
                    .eq('stage_id', winStage.id)

                totalReceita = (leadsData || []).reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0)
            }
        }

        // 4. Calcular ROI e CPL
        const roi = totalCustos > 0 ? ((totalReceita - totalCustos) / totalCustos) * 100 : 0
        const cpl = leadsCount > 0 ? totalCustos / leadsCount : 0

        return {
            success: true,
            data: {
                totalCustos,
                totalReceita,
                roi,
                cpl,
                leadsCount
            }
        }
    } catch (error: any) {
        console.error('Error fetching ROI metrics:', error)
        const parts: string[] = []
        if (error?.message && error.message.trim()) parts.push(error.message.trim())
        if (error?.hint && error.hint.trim()) parts.push(`Dica: ${error.hint.trim()}`)
        if (error?.code) parts.push(`Código: ${error.code}`)
        if (error?.status) parts.push(`HTTP ${error.status}`)
        const errorDetails = parts.length > 0
            ? parts.join(' | ')
            : (typeof error === 'object' ? JSON.stringify(error) : String(error))
        return { success: false, error: errorDetails || "Erro desconhecido ao carregar ROI" }
    }
}

