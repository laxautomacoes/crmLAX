'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from './profile'

export interface ReportMetrics {
    kpis: {
        totalLeads: number
        activeLeads: number
        conversions: number
        conversionRate: string
    }
    leadsBySource: Array<{
        name: string
        value: number
        fill: string
    }>
    leadsEvolution: Array<{
        date: string
        count: number
    }>
    teamPerformance: Array<{
        id: string
        name: string
        leadsCount: number
        conversionCount: number
    }>
    topProperties: Array<{
        id: string
        title: string
        leadsCount: number
        conversionCount: number
    }>
}

export async function getBrokers(tenantId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('tenant_id', tenantId)
        .order('full_name')
    return data || []
}

export async function getProperties(tenantId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('properties')
        .select('id, title')
        .eq('tenant_id', tenantId)
        .order('title')
    return data || []
}

export async function getReportMetrics(
    tenantId: string,
    periodStr: string = '30_days',
    brokerId?: string,
    propertyId?: string
) {
    const supabase = await createClient()

    // Verificar permissões
    const { profile } = await getProfile()
    const userRole = profile?.role?.toLowerCase() || ''
    const isAdmin = ['admin', 'superadmin', 'super_admin', 'super administrador'].includes(userRole)

    // Se não for admin, forçar o brokerId a ser o ID do próprio usuário
    let enforcedBrokerId = brokerId
    if (!isAdmin && profile?.id) {
        enforcedBrokerId = profile.id
    }

    // Calcular data de início baseada no período
    const now = new Date()
    let startDate = new Date()

    if (periodStr === '7_days') startDate.setDate(now.getDate() - 7)
    else if (periodStr === '30_days') startDate.setDate(now.getDate() - 30)
    else if (periodStr === '90_days') startDate.setDate(now.getDate() - 90)
    else if (periodStr === '12_months') startDate.setMonth(now.getMonth() - 12)
    else startDate.setDate(now.getDate() - 30) // Default

    const startDateIso = startDate.toISOString()

    try {
        // 1. Base Query para Leads no período
        let query = supabase
            .from('leads')
            .select(`
                id,
                created_at,
                source,
                status,
                stage_id,
                profile_id,
                property_id,
                lead_stages (
                    id,
                    name
                ),
                profiles (
                    id,
                    full_name
                ),
                properties (
                    id,
                    title
                )
            `)
            .eq('tenant_id', tenantId)
            .gte('created_at', startDateIso)

        if (enforcedBrokerId && enforcedBrokerId !== 'all') {
            query = query.eq('profile_id', enforcedBrokerId)
        }

        if (propertyId && propertyId !== 'all') {
            query = query.eq('property_id', propertyId)
        }

        const { data: leads, error: leadsError } = await query

        if (leadsError) throw leadsError

        // 2. Identificar estágio de "Ganho"
        const { data: allStages } = await supabase
            .from('lead_stages')
            .select('id, name')
            .eq('tenant_id', tenantId)

        const winStageIds = (allStages || [])
            .filter((s: Record<string, any>) =>
                s.name.toLowerCase().includes('ganho') ||
                s.name.toLowerCase().includes('fechado') ||
                s.name.toLowerCase().includes('vendido') ||
                s.name.toLowerCase().includes('alugado')
            )
            .map((s: Record<string, any>) => s.id) || []

        // 3. Processar KPIs
        const totalLeads = leads?.length || 0
        const conversions = leads?.filter((l: Record<string, any>) => winStageIds.includes(l.stage_id || ''))?.length || 0
        // Active leads are those not in win stage (simplificação, idealmente excluiria perdas também)
        // Para simplificar: active = total - won
        // Melhor: active = leads que não estão em "Perdido" ou "Ganho" se tivéssemos essa distinção clara.
        // Vamos assumir Active = Total por enquanto ou refinar se tivermos estágio "Perdido".
        const activeLeads = totalLeads // Simplificação, ver comentário sobre exclusão

        const conversionRate = totalLeads > 0
            ? ((conversions / totalLeads) * 100).toFixed(1) + '%'
            : '0%'

        // 4. Processar Leads por Origem (Source)
        const sourceMap = new Map<string, number>()
        leads?.forEach((lead: Record<string, any>) => {
            const source = lead.source || 'Desconhecido'
            sourceMap.set(source, (sourceMap.get(source) || 0) + 1)
        })

        // Cores fixas para sources comuns para consistência
        const getSourceColor = (source: string) => {
            const s = source.toLowerCase()
            if (s.includes('instagram') || s.includes('insta')) return '#E1306C'
            if (s.includes('facebook') || s.includes('face')) return '#1877F2'
            if (s.includes('google')) return '#4285F4'
            if (s.includes('site')) return '#00B087'
            if (s.includes('indicação')) return '#FFE600'
            if (s.includes('whatsapp')) return '#25D366'
            return '#404F4F' // Petrol default
        }

        const leadsBySource = Array.from(sourceMap.entries()).map(([name, value]) => ({
            name,
            value,
            fill: getSourceColor(name)
        })).sort((a, b) => b.value - a.value)

        // 5. Processar Evolução (Agrupado por data)
        const evolutionMap = new Map<string, number>()
        // Inicializar mapa com datas zeradas para o gráfico ficar bonito
        const dateIterator = new Date(startDate)
        const endDate = new Date()
        while (dateIterator <= endDate) {
            const dateStr = dateIterator.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            evolutionMap.set(dateStr, 0)
            dateIterator.setDate(dateIterator.getDate() + 1)
        }

        leads?.forEach((lead: Record<string, any>) => {
            const date = new Date(lead.created_at || '').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            if (evolutionMap.has(date)) {
                evolutionMap.set(date, (evolutionMap.get(date) || 0) + 1)
            }
        })

        const leadsEvolution = Array.from(evolutionMap.entries()).map(([date, count]) => ({
            date,
            count
        }))

        // 6. Processar Performance da Equipe
        const teamMap = new Map<string, { name: string, leads: number, conversions: number }>()

        leads?.forEach((lead: Record<string, any>) => {
            const profileName = (lead.profiles as any)?.full_name || 'Sem Responsável'
            const profileId = (lead as any).profile_id || 'unassigned'

            if (!teamMap.has(profileId)) {
                teamMap.set(profileId, { name: profileName, leads: 0, conversions: 0 })
            }

            const stats = teamMap.get(profileId)!
            stats.leads += 1
            if (winStageIds.includes(lead.stage_id || '')) {
                stats.conversions += 1
            }
        })

        const teamPerformance = Array.from(teamMap.entries()).map(([id, stats]) => ({
            id,
            name: stats.name,
            leadsCount: stats.leads,
            conversionCount: stats.conversions
        })).sort((a, b) => b.leadsCount - a.leadsCount)

        // 7. Processar Top Properties
        const propertiesMap = new Map<string, { title: string, leads: number, conversions: number }>()

        leads?.forEach((lead: Record<string, any>) => {
            if (lead.property_id) {
                const propertyTitle = (lead.properties as any)?.title || 'Property sem título'
                const propertyId = lead.property_id

                if (!propertiesMap.has(propertyId)) {
                    propertiesMap.set(propertyId, { title: propertyTitle, leads: 0, conversions: 0 })
                }

                const stats = propertiesMap.get(propertyId)!
                stats.leads += 1
                if (winStageIds.includes(lead.stage_id || '')) {
                    stats.conversions += 1
                }
            }
        })

        const topProperties = Array.from(propertiesMap.entries()).map(([id, stats]) => ({
            id,
            title: stats.title,
            leadsCount: stats.leads,
            conversionCount: stats.conversions
        })).sort((a, b) => b.leadsCount - a.leadsCount).slice(0, 10) // Top 10

        return {
            success: true,
            data: {
                kpis: {
                    totalLeads,
                    activeLeads,
                    conversions,
                    conversionRate
                },
                leadsBySource,
                leadsEvolution,
                teamPerformance,
                topProperties
            }
        }
    } catch (error: any) {
        console.error('Error fetching report metrics:', error)
        return {
            success: false,
            error: error.message
        }
    }
}
