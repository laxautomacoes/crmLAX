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

        // 1. Definir as queries independentes
        let leadsQuery = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)

        let propertiesQuery = supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)

        let stagesQuery = supabase
            .from('lead_stages')
            .select('id, name, order_index, color')
            .eq('tenant_id', tenantId)
            .order('order_index', { ascending: true })

        let funnelLeadsQuery = supabase
            .from('leads')
            .select('stage_id')
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)

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

        let prevLeadsQuery = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)
            .gte('created_at', sixtyDaysAgo)
            .lt('created_at', thirtyDaysAgo)

        let currLeadsQuery = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)
            .gte('created_at', thirtyDaysAgo)

        const prevPropertiesQuery = supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)
            .gte('created_at', sixtyDaysAgo)
            .lt('created_at', thirtyDaysAgo)

        const currPropertiesQuery = supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)
            .gte('created_at', thirtyDaysAgo)

        if (!isAdmin && profile?.id) {
            leadsQuery = leadsQuery.eq('assigned_to', profile.id)
            funnelLeadsQuery = funnelLeadsQuery.eq('assigned_to', profile.id)
            recentLeadsQuery = recentLeadsQuery.eq('assigned_to', profile.id)
            prevLeadsQuery = prevLeadsQuery.eq('assigned_to', profile.id)
            currLeadsQuery = currLeadsQuery.eq('assigned_to', profile.id)
        }

        // 2. Executar em paralelo
        const [
            leadsRes,
            propertiesRes,
            stagesRes,
            funnelLeadsRes,
            recentLeadsRes,
            prevLeadsRes,
            currLeadsRes,
            prevPropertiesRes,
            currPropertiesRes
        ] = await Promise.all([
            leadsQuery,
            propertiesQuery,
            stagesQuery,
            funnelLeadsQuery,
            recentLeadsQuery,
            prevLeadsQuery,
            currLeadsQuery,
            prevPropertiesQuery,
            currPropertiesQuery
        ])

        if (leadsRes.error) throw leadsRes.error
        if (propertiesRes.error) throw propertiesRes.error
        if (stagesRes.error) throw stagesRes.error
        if (funnelLeadsRes.error) throw funnelLeadsRes.error
        if (recentLeadsRes.error) throw recentLeadsRes.error
        if (prevLeadsRes.error) throw prevLeadsRes.error
        if (currLeadsRes.error) throw currLeadsRes.error
        if (prevPropertiesRes.error) throw prevPropertiesRes.error
        if (currPropertiesRes.error) throw currPropertiesRes.error

        const totalLeads = leadsRes.count || 0
        const totalProperties = propertiesRes.count || 0
        const stages = stagesRes.data || []
        const funnelLeadsData = funnelLeadsRes.data || []
        const recentLeadsData = recentLeadsRes.data || []
        const prevLeadsCount = prevLeadsRes.count || 0
        const currLeadsCount = currLeadsRes.count || 0
        const prevPropertiesCount = prevPropertiesRes.count || 0
        const currPropertiesCount = currPropertiesRes.count || 0

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

        const stageCountMap = new Map<string, number>()
        let conversions = 0

        for (const lead of funnelLeadsData) {
            if (lead.stage_id) {
                stageCountMap.set(lead.stage_id, (stageCountMap.get(lead.stage_id) || 0) + 1)
                if (winStage && lead.stage_id === winStage.id) {
                    conversions++
                }
            }
        }

        const funnelSteps = uniqueStages.map((stage: any) => ({
            label: stage.name,
            count: stageCountMap.get(stage.id) || 0,
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
        return {
            success: false,
            error: error.message
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
        return { success: false, error: error.message }
    }
}

