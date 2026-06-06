'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from './profile'
import { revalidatePath } from 'next/cache'

// ─── Tipos ────────────────────────────────────────────────────
export interface PropertyUnit {
    id: string
    property_id: string
    tenant_id: string
    price_table_id: string
    unit_number: string
    block_tower: string | null
    floor: number | null
    garage_type: string | null
    garage_number: string | null
    hobby_box: string | null
    hobby_box_number: string | null
    area_total: number | null
    area_privativa: number | null
    valor_ato: number | null
    valor_mensais: number | null
    valor_reforcos: number | null
    valor_chaves: number | null
    soma_poupanca: number | null
    valor_financiamento: number | null
    valor_total: number | null
    extra_data: Record<string, any>
    status: string
    created_at: string
    updated_at: string
}

export interface PriceTableInfo {
    id: string
    property_id: string
    reference_month: string
    index_type: string
    index_value: number | null
    payment_structure: Record<string, any>
    file_url: string | null
    total_units: number
    available_units: number
    is_active: boolean
    created_at: string
    uploaded_by: string | null
    block_tower: string | null
}

// ─── Buscar unidades de um empreendimento ─────────────────────
export async function getPropertyUnits(propertyId: string) {
    const supabase = await createClient()

    try {
        // Buscar todas as tabelas de preços ativas (ex: uma para cada torre)
        const { data: priceTables, error: tablesError } = await supabase
            .from('property_price_tables')
            .select('id')
            .eq('property_id', propertyId)
            .eq('is_active', true)

        if (tablesError) throw tablesError

        if (!priceTables || priceTables.length === 0) {
            return { success: true, data: [] }
        }

        const activeTableIds = priceTables.map((t: any) => t.id)

        const { data, error } = await supabase
            .from('property_units')
            .select('*')
            .eq('property_id', propertyId)
            .in('price_table_id', activeTableIds)
            .order('unit_number', { ascending: true })

        if (error) throw error

        return { success: true, data: data || [] }
    } catch (error: any) {
        console.error('Error fetching property units:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ─── Buscar info da tabela de preços ativa ────────────────────
export async function getPriceTableInfo(propertyId: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('property_price_tables')
            .select('*')
            .eq('property_id', propertyId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data: data || [] }
    } catch (error: any) {
        console.error('Error fetching price table info:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ─── Buscar histórico de tabelas de preços ────────────────────
export async function getPriceTableHistory(propertyId: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('property_price_tables')
            .select('id, reference_month, index_type, index_value, total_units, available_units, is_active, created_at')
            .eq('property_id', propertyId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return { success: true, data: data || [] }
    } catch (error: any) {
        console.error('Error fetching price table history:', error)
        return { success: false, error: error.message, data: [] }
    }
}

// ─── Atualizar status de uma unidade (admin only) ─────────────
export async function updateUnitStatus(unitId: string, status: 'available' | 'reserved' | 'sold' | 'proposal') {
    const supabase = await createClient()
    const { profile } = await getProfile()
    const userRole = profile?.role?.toLowerCase()

    if (userRole !== 'admin' && userRole !== 'superadmin') {
        return { success: false, error: 'Apenas administradores podem alterar o status de unidades.' }
    }

    try {
        const { data, error } = await supabase
            .from('property_units')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', unitId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/properties')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error updating unit status:', error)
        return { success: false, error: error.message }
    }
}

// ─── Upload de tabela-modelo (template) ───────────────────────
export async function uploadPriceTableTemplate(
    tenantId: string,
    propertyId: string,
    templateUrl: string,
    templateMapping: Record<string, any>
) {
    const supabase = await createClient()
    const { profile } = await getProfile()
    const userRole = profile?.role?.toLowerCase()

    if (userRole !== 'admin' && userRole !== 'superadmin') {
        return { success: false, error: 'Apenas administradores podem subir tabelas-modelo.' }
    }

    try {
        const { data, error } = await supabase
            .from('properties')
            .update({
                price_table_template_url: templateUrl,
                price_table_template_mapping: templateMapping
            })
            .eq('id', propertyId)
            .eq('tenant_id', tenantId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/properties')
        return { success: true, data }
    } catch (error: any) {
        console.error('Error uploading price table template:', error)
        return { success: false, error: error.message }
    }
}
