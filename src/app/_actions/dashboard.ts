'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from './profile'

export interface DashboardMetrics {
    kpis: {
        leadsAtivos: number
        leadsAtivosTrend: string
        imoveis: number
        imoveisTrend: string
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

        // 2. Buscar total de assets (imóveis)
        let assetsQuery = supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('is_archived', false)

        if (!isAdmin && profile?.id) {
            assetsQuery = assetsQuery.eq('created_by', profile.id)
        }

        const { count: totalAssets, error: assetsError } = await assetsQuery

        if (assetsError) throw assetsError

        // 3. Buscar conversões (leads em estágios que representam ganho)
        // Primeiro buscamos os estágios para identificar qual é o "Ganho"
        const { data: allStages } = await supabase
            .from('lead_stages')
            .select('id, name')
            .eq('tenant_id', tenantId)

        const winStage = (allStages as any[])?.find((s) =>
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
                        imoveis: totalAssets || 0,
                        imoveisTrend: '+0',
                        conversoes: conversions || 0,
                        conversoesTrend: '+0'
                    },
                    funnelSteps: [],
                    recentLeads: []
                } as DashboardMetrics
            };
        }

        // Deduplicar estágios por nome (camada extra de proteção)
        const uniqueStagesMap = new Map();
        (stages as any[]).forEach(stage => {
            if (!uniqueStagesMap.has(stage.name)) {
                uniqueStagesMap.set(stage.name, stage);
            }
        });
        const uniqueStages = Array.from(uniqueStagesMap.values());

        const funnelSteps = await Promise.all(
            uniqueStages.map(async (stage) => {
                let stageLeadsQuery = supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .eq('stage_id', stage.id)
                    .eq('is_archived', false)

                if (!isAdmin && profile?.id) {
                    stageLeadsQuery = stageLeadsQuery.eq('assigned_to', profile.id)
                }

                const { count } = await stageLeadsQuery

                return {
                    label: stage.name,
                    count: count || 0,
                    stageId: stage.id
                }
            })
        )

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

        const recentLeads = (recentLeadsData as any[] || []).map((lead) => ({
            id: lead.id,
            name: lead.contacts?.name || 'Sem nome',
            interest: lead.source || 'N/A',
            status: (stages as any[])?.find((s) => s.id === lead.stage_id)?.name || 'Novo',
            created_at: lead.created_at
        }))

        return {
            success: true,
            data: {
                kpis: {
                    leadsAtivos: totalLeads || 0,
                    leadsAtivosTrend: '+0%', // Implementar cálculo de tendência depois
                    imoveis: totalAssets || 0,
                    imoveisTrend: '+0',
                    conversoes: conversions || 0,
                    conversoesTrend: '+0'
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
