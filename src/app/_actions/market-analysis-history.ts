'use server'

import { createClient } from "@/lib/supabase/server"

export interface MarketAnalysisHistoryRecord {
    id: string
    uf: string
    city: string
    neighborhoods: string[]
    property_type: string | null
    bedrooms: string | null
    price_min: string | null
    price_max: string | null
    results: any[]
    status: 'completed' | 'partial' | 'failed'
    created_at: string
    profiles: { full_name: string } | null
}

/**
 * Salvar uma pesquisa no histórico (obtém tenant/profile internamente)
 */
export async function saveMarketAnalysisHistory(params: {
    uf: string
    city: string
    neighborhoods: string[]
    propertyType?: string
    bedrooms?: string
    priceMin?: string
    priceMax?: string
    results: any[]
    status: 'completed' | 'partial' | 'failed'
}) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Usuário não autenticado")

        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        if (!profile) throw new Error("Perfil não encontrado")

        const { error } = await supabase.from('market_analysis_history').insert({
            tenant_id: profile.tenant_id,
            profile_id: user.id,
            uf: params.uf,
            city: params.city,
            neighborhoods: params.neighborhoods,
            property_type: params.propertyType || null,
            bedrooms: params.bedrooms || null,
            price_min: params.priceMin || null,
            price_max: params.priceMax || null,
            results: params.results,
            status: params.status,
        })

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Save market analysis history error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Buscar histórico de pesquisas (obtém tenant internamente)
 */
export async function getMarketAnalysisHistory() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Usuário não autenticado")

        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        if (!profile) throw new Error("Perfil não encontrado")

        const { data, error } = await supabase
            .from('market_analysis_history')
            .select('*, profiles(full_name)')
            .eq('tenant_id', profile.tenant_id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error
        return { success: true, data: data as MarketAnalysisHistoryRecord[] }
    } catch (error: any) {
        console.error('Get market analysis history error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Deletar uma pesquisa do histórico
 */
export async function deleteMarketAnalysisHistory(id: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase.from('market_analysis_history').delete().eq('id', id)
        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Delete market analysis history error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Deletar todo o histórico do tenant autenticado
 */
export async function deleteAllMarketAnalysisHistory() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Usuário não autenticado")

        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
        if (!profile) throw new Error("Perfil não encontrado")

        const { error } = await supabase.from('market_analysis_history').delete().eq('tenant_id', profile.tenant_id)
        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Delete all market analysis history error:', error)
        return { success: false, error: error.message }
    }
}
