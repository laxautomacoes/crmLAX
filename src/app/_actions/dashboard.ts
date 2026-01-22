'use server'

import { createClient } from '@/lib/supabase/server'

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

    try {
        // 1. Buscar total de leads ativos
        const { count: totalLeads, error: leadsError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        if (leadsError) throw leadsError

        // 2. Buscar total de assets (imóveis)
        const { count: totalAssets, error: assetsError } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId)

        if (assetsError) throw assetsError

        // 3. Buscar conversões (leads em estágios que representam ganho)
        // Primeiro buscamos os estágios para identificar qual é o "Ganho"
        const { data: allStages } = await supabase
            .from('lead_stages')
            .select('id, name')
            .eq('tenant_id', tenantId)

        const winStage = allStages?.find(s =>
            s.name.toLowerCase().includes('ganho') ||
            s.name.toLowerCase().includes('fechado') ||
            s.name.toLowerCase().includes('concluído')
        )

        let conversions = 0
        if (winStage) {
            const { count } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('stage_id', winStage.id)
            conversions = count || 0
        }

        // 4. Buscar estágios e contar leads por estágio
        let { data: stages, error: stagesError } = await supabase
            .from('lead_stages')
            .select('id, name, order_index')
            .eq('tenant_id', tenantId)
            .order('order_index', { ascending: true })

        if (stagesError) throw stagesError

        // Se não houver estágios, criar um padrão
        if (!stages || stages.length === 0) {
            const { error: insertError } = await supabase
                .from('lead_stages')
                .insert({
                    tenant_id: tenantId,
                    name: 'Novo Lead',
                    order_index: 0
                });

            if (insertError) {
                console.error('Erro ao criar estágio padrão na dashboard:', insertError);
            } else {
                // Re-buscar após criar
                const { data: newStages } = await supabase
                    .from('lead_stages')
                    .select('id, name, order_index')
                    .eq('tenant_id', tenantId)
                    .order('order_index', { ascending: true });
                stages = newStages;
            }
        }

        const funnelSteps = await Promise.all(
            (stages || []).map(async (stage) => {
                const { count } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .eq('stage_id', stage.id)

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
                stage_id,
                source,
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
            interest: lead.source || 'N/A',
            status: stages?.find(s => s.id === lead.stage_id)?.name || 'Novo',
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
