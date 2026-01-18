'use server'

import { createClient } from '@/lib/supabase/server'

export interface DashboardMetrics {
    kpis: {
        leadsAtivos: number
        leadsAtivosTrend: string
        veiculos: number
        veiculosTrend: string
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

    try {
        // 1. Buscar total de leads ativos
        const { count: totalLeads, error: leadsError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        if (leadsError) throw leadsError

        // 2. Buscar total de assets (veículos)
        const { count: totalAssets, error: assetsError } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        if (assetsError) throw assetsError

        // 3. Buscar conversões (leads com status "Ganho" ou similar)
        const { count: conversions, error: conversionsError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)
            .eq('status', 'Ganho')

        if (conversionsError) throw conversionsError

        // 4. Buscar estágios e contar leads por estágio
        const { data: stages, error: stagesError } = await supabase
            .from('pipeline_stages')
            .select('id, name, position')
            .eq('tenant_id', tenantId)
            .order('position', { ascending: true })

        if (stagesError) throw stagesError

        const funnelSteps = await Promise.all(
            (stages || []).map(async (stage) => {
                const { count } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .eq('status', stage.id)

                return {
                    label: stage.name,
                    count: count || 0,
                    stageId: stage.id
                }
            })
        )

        // 5. Buscar leads recentes (últimos 5)
        const { data: recentLeadsData, error: recentError } = await supabase
            .from('leads')
            .select(`
                id,
                created_at,
                status,
                details,
                contacts (
                    name
                )
            `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(5)

        if (recentError) throw recentError

        const recentLeads = (recentLeadsData || []).map((lead: any) => ({
            id: lead.id,
            name: lead.contacts?.name || 'Sem nome',
            interest: lead.details?.interest || 'N/A',
            status: stages?.find(s => s.id === lead.status)?.name || 'Novo',
            created_at: lead.created_at
        }))

        return {
            success: true,
            data: {
                kpis: {
                    leadsAtivos: totalLeads || 0,
                    leadsAtivosTrend: '+0%', // Implementar cálculo de tendência depois
                    veiculos: totalAssets || 0,
                    veiculosTrend: '+0',
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
