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
    }>
    recentLeads: Array<{
        id: string
        name: string
        interest: string
        status: string
        created_at: string
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
        // 1. Buscar total de leads ativos
        let leadsQuery = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)

        if (!isAdmin && profile?.id) {
            leadsQuery = leadsQuery.eq('assigned_to', profile.id)
        }

        const { count: totalLeads, error: leadsError } = await leadsQuery

        if (leadsError) throw leadsError

        // 2. Buscar total de properties (properties)
        let propertiesQuery = supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)

        // Nota: KP de properties mostra o total disponível no tenant para todos os membros.


        const { count: totalProperties, error: propertiesError } = await propertiesQuery

        if (propertiesError) throw propertiesError

        // 3. Buscar conversões (leads em estágios que representam ganho)
        // Primeiro buscamos os estágios para identificar qual é o "Ganho"
        const { data: allStages } = await supabase
            .from('lead_stages')
            .select('id, name')
            .eq('tenant_id', tenantId)

        const winStage = (allStages || []).find((s: Record<string, any>) =>
            s.name.toLowerCase().includes('ganho') ||
            s.name.toLowerCase().includes('fechado') ||
            s.name.toLowerCase().includes('concluído')
        )

        let conversions = 0
        if (winStage) {
            let convQuery = supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('stage_id', winStage.id)

            if (!isAdmin && profile?.id) {
                convQuery = convQuery.eq('assigned_to', profile.id)
            }

            const { count } = await convQuery
            conversions = count || 0
        }

        // 4. Buscar estágios e contar leads por estágio
        let { data: stages, error: stagesError } = await supabase
            .from('lead_stages')
            .select('id, name, order_index')
            .eq('tenant_id', tenantId)
            .order('order_index', { ascending: true })

        if (stagesError) throw stagesError

        // Se não houver estágios, retornar vazio ou erro suave (o getPipelineData deve lidar com a criação)
        if (!stages || stages.length === 0) {
            console.log('Nenhum estágio encontrado para o tenant:', tenantId);
            return {
                success: true,
                data: {
                    kpis: {
                        leadsAtivos: totalLeads || 0,
                        leadsAtivosTrend: '+0%',
                        properties: totalProperties || 0,
                        propertiesTrend: '+0',
                        conversoes: conversions || 0,
                        conversoesTrend: '+0'
                    },
                    funnelSteps: [],
                    recentLeads: []
                } as DashboardMetrics
            };
        }

        // Deduplicar estágios por nome (camada extra de proteção)
        const uniqueStagesMap = new Map<string, Tables<'lead_stages'>>();
        (stages || []).forEach((stage: Tables<'lead_stages'>) => {
            if (!uniqueStagesMap.has(stage.name)) {
                uniqueStagesMap.set(stage.name, stage);
            }
        });
        const uniqueStages = Array.from(uniqueStagesMap.values());

        // 4.1. Buscar contagem de leads por estágio com UMA ÚNICA query
        let funnelLeadsQuery = supabase
            .from('leads')
            .select('stage_id')
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)

        if (!isAdmin && profile?.id) {
            funnelLeadsQuery = funnelLeadsQuery.eq('assigned_to', profile.id)
        }

        const { data: funnelLeadsData, error: funnelError } = await funnelLeadsQuery

        if (funnelError) throw funnelError

        // Contagem em memória (O(n)) em vez de N queries
        const stageCountMap = new Map<string, number>()
        for (const lead of funnelLeadsData || []) {
            if (lead.stage_id) {
                stageCountMap.set(lead.stage_id, (stageCountMap.get(lead.stage_id) || 0) + 1)
            }
        }

        const funnelSteps = uniqueStages.map((stage) => ({
            label: stage.name,
            count: stageCountMap.get(stage.id) || 0,
            stageId: stage.id
        }))

        // 5. Buscar leads recentes (últimos 5)
        let recentLeadsQuery = supabase
            .from('leads')
            .select(`
                id,
                created_at,
                stage_id,
                source,
                contacts (
                    name
                )
            `)
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)
            .order('created_at', { ascending: false })
            .limit(10)

        if (!isAdmin && profile?.id) {
            recentLeadsQuery = recentLeadsQuery.eq('assigned_to', profile.id)
        }

        const { data: recentLeadsData, error: recentError } = await recentLeadsQuery

        if (recentError) throw recentError

        const recentLeads = (recentLeadsData || []).map((lead: any) => ({
            id: lead.id,
            name: lead.contacts?.name || 'Sem nome',
            interest: lead.source || 'N/A',
            status: (stages || []).find((s: Record<string, any>) => s.id === lead.stage_id)?.name || 'Novo',
            created_at: lead.created_at
        }))

        // 6. Calcular trends (período atual vs anterior — 30 dias)
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()

        // Leads criados nos últimos 30 dias vs 30-60 dias atrás
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

        if (!isAdmin && profile?.id) {
            prevLeadsQuery = prevLeadsQuery.eq('assigned_to', profile.id)
            currLeadsQuery = currLeadsQuery.eq('assigned_to', profile.id)
        }

        const [prevLeadsRes, currLeadsRes] = await Promise.all([prevLeadsQuery, currLeadsQuery])
        const prevLeadsCount = prevLeadsRes.count || 0
        const currLeadsCount = currLeadsRes.count || 0

        const calcTrend = (curr: number, prev: number): string => {
            if (prev === 0) return curr > 0 ? '+100%' : '+0%'
            const pct = Math.round(((curr - prev) / prev) * 100)
            return pct >= 0 ? `+${pct}%` : `${pct}%`
        }

        // Properties criados nos últimos 30 dias vs anterior
        const { count: prevPropertiesCount } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)
            .gte('created_at', sixtyDaysAgo)
            .lt('created_at', thirtyDaysAgo)

        const { count: currPropertiesCount } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)
            .gte('created_at', thirtyDaysAgo)

        return {
            success: true,
            data: {
                kpis: {
                    leadsAtivos: totalLeads || 0,
                    leadsAtivosTrend: calcTrend(currLeadsCount, prevLeadsCount),
                    properties: totalProperties || 0,
                    propertiesTrend: calcTrend(currPropertiesCount || 0, prevPropertiesCount || 0),
                    conversoes: conversions || 0,
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
        // 1. Tentar buscar dados reais da tabela transacoes_financeiras
        const { data: txData, error: txError } = await supabase
            .from('transacoes_financeiras')
            .select('valor, tipo')
            .eq('tenant_id', tenantId)
            .eq('status', 'pago')

        const hasRealData = !txError && txData && txData.length > 0

        let totalReceita = 0
        let totalCustos = 0

        if (hasRealData) {
            // Usar dados reais de transações financeiras
            totalReceita = (txData || [])
                .filter((t: any) => t.tipo === 'Receita')
                .reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0)

            totalCustos = (txData || [])
                .filter((t: any) => t.tipo === 'Despesa')
                .reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0)
        } else {
            // Fallback: cálculo antigo com traffic_sources + leads ganhos
            const { data: trafficData } = await supabase
                .from('traffic_sources')
                .select('custo')
                .eq('tenant_id', tenantId)

            totalCustos = (trafficData || []).reduce((acc: number, curr: any) => acc + (Number(curr.custo) || 0), 0)

            const { data: allStages } = await supabase
                .from('lead_stages')
                .select('id, name')
                .eq('tenant_id', tenantId)

            const winStage = (allStages as any[])?.find((s) =>
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

        // 3. Contagem de Leads para CPL
        const { count: leadsCount, error: countError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        if (countError) throw countError

        // 4. Cálculos
        const roi = totalCustos > 0 ? ((totalReceita - totalCustos) / totalCustos) * 100 : 0
        const cpl = (leadsCount || 0) > 0 ? totalCustos / (leadsCount || 1) : 0

        return {
            success: true,
            data: {
                totalCustos,
                totalReceita,
                roi,
                cpl,
                leadsCount: leadsCount || 0
            }
        }
    } catch (error: any) {
        console.error('Error fetching ROI metrics:', error)
        return { success: false, error: error.message }
    }
}

