'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from './profile'

// ─── Interfaces ───────────────────────────────────────────

export interface Transaction {
    id: string
    tenant_id: string
    profile_id: string | null
    valor: number
    tipo: string
    categoria: string | null
    descricao: string | null
    data_transacao: string
    status: string | null
    fonte: string | null
    lead_id: string | null
    external_id: string | null
    metadata: Record<string, any>
    created_at: string | null
    lead_name?: string
}

export interface FinancialCategory {
    id: string
    tenant_id: string
    name: string
    tipo: string
    color: string | null
    is_default: boolean | null
    order_index: number | null
}

export interface FinancialSummary {
    totalReceita: number
    totalDespesa: number
    saldo: number
    receitaTrend: string
    despesaTrend: string
}

export interface MonthlyData {
    month: string
    receita: number
    despesa: number
}

export interface TransactionFilters {
    tipo?: string
    categoria?: string
    status?: string
    startDate?: string
    endDate?: string
    search?: string
}

// ─── Transações ───────────────────────────────────────────

export async function getTransactions(
    tenantId: string,
    filters?: TransactionFilters
): Promise<{ success: boolean; data?: Transaction[]; error?: string }> {
    const supabase = await createClient()

    try {
        let query = supabase
            .from('transacoes_financeiras')
            .select('*, leads(contacts(name))')
            .eq('tenant_id', tenantId)
            .order('data_transacao', { ascending: false })

        if (filters?.tipo && filters.tipo !== 'Todas') {
            query = query.eq('tipo', filters.tipo)
        }
        if (filters?.categoria) {
            query = query.eq('categoria', filters.categoria)
        }
        if (filters?.status) {
            query = query.eq('status', filters.status)
        }
        if (filters?.startDate) {
            query = query.gte('data_transacao', filters.startDate)
        }
        if (filters?.endDate) {
            query = query.lte('data_transacao', filters.endDate + 'T23:59:59')
        }
        if (filters?.search) {
            query = query.ilike('descricao', `%${filters.search}%`)
        }

        const { data, error } = await query

        if (error) throw error

        const transactions: Transaction[] = (data || []).map((t: any) => ({
            ...t,
            lead_name: t.leads?.contacts?.name || null
        }))

        return { success: true, data: transactions }
    } catch (error: any) {
        console.error('Erro ao buscar transações:', error)
        return { success: false, error: error.message }
    }
}

export async function createTransaction(data: {
    tenant_id: string
    valor: number
    tipo: string
    categoria?: string
    descricao?: string
    data_transacao?: string
    status?: string
    fonte?: string
    lead_id?: string
}): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { profile } = await getProfile()

    try {
        const { error } = await supabase
            .from('transacoes_financeiras')
            .insert({
                tenant_id: data.tenant_id,
                profile_id: profile?.id || null,
                valor: data.valor,
                tipo: data.tipo,
                categoria: data.categoria || null,
                descricao: data.descricao || null,
                data_transacao: data.data_transacao || new Date().toISOString(),
                status: data.status || 'pago',
                fonte: data.fonte || null,
                lead_id: data.lead_id || null,
            })

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao criar transação:', error)
        return { success: false, error: error.message }
    }
}

export async function updateTransaction(
    id: string,
    data: Partial<{
        valor: number
        tipo: string
        categoria: string
        descricao: string
        data_transacao: string
        status: string
        fonte: string
        lead_id: string | null
    }>
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('transacoes_financeiras')
            .update(data)
            .eq('id', id)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao atualizar transação:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteTransaction(
    id: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('transacoes_financeiras')
            .delete()
            .eq('id', id)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao excluir transação:', error)
        return { success: false, error: error.message }
    }
}

// ─── Resumo / KPIs ───────────────────────────────────────

export async function getFinancialSummary(
    tenantId: string,
    startDate?: string,
    endDate?: string
): Promise<{ success: boolean; data?: FinancialSummary; error?: string }> {
    const supabase = await createClient()

    try {
        const now = new Date()
        const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const end = endDate || now.toISOString()

        // Período atual
        let currentQuery = supabase
            .from('transacoes_financeiras')
            .select('valor, tipo')
            .eq('tenant_id', tenantId)
            .eq('status', 'pago')
            .gte('data_transacao', start)
            .lte('data_transacao', end)

        const { data: currentData, error: currentError } = await currentQuery
        if (currentError) throw currentError

        const totalReceita = (currentData || [])
            .filter((t: any) => t.tipo === 'Receita')
            .reduce((acc: number, t: any) => acc + Number(t.valor), 0)

        const totalDespesa = (currentData || [])
            .filter((t: any) => t.tipo === 'Despesa')
            .reduce((acc: number, t: any) => acc + Number(t.valor), 0)

        // Período anterior (mesmo range, deslocado)
        const startMs = new Date(start).getTime()
        const endMs = new Date(end).getTime()
        const rangeMs = endMs - startMs
        const prevStart = new Date(startMs - rangeMs).toISOString()
        const prevEnd = start

        const { data: prevData } = await supabase
            .from('transacoes_financeiras')
            .select('valor, tipo')
            .eq('tenant_id', tenantId)
            .eq('status', 'pago')
            .gte('data_transacao', prevStart)
            .lt('data_transacao', prevEnd)

        const prevReceita = (prevData || [])
            .filter((t: any) => t.tipo === 'Receita')
            .reduce((acc: number, t: any) => acc + Number(t.valor), 0)

        const prevDespesa = (prevData || [])
            .filter((t: any) => t.tipo === 'Despesa')
            .reduce((acc: number, t: any) => acc + Number(t.valor), 0)

        const calcTrend = (curr: number, prev: number): string => {
            if (prev === 0) return curr > 0 ? '+100%' : '+0%'
            const pct = Math.round(((curr - prev) / prev) * 100)
            return pct >= 0 ? `+${pct}%` : `${pct}%`
        }

        return {
            success: true,
            data: {
                totalReceita,
                totalDespesa,
                saldo: totalReceita - totalDespesa,
                receitaTrend: calcTrend(totalReceita, prevReceita),
                despesaTrend: calcTrend(totalDespesa, prevDespesa),
            }
        }
    } catch (error: any) {
        console.error('Erro ao buscar resumo financeiro:', error)
        return { success: false, error: error.message }
    }
}

export async function getMonthlyBreakdown(
    tenantId: string,
    year?: number
): Promise<{ success: boolean; data?: MonthlyData[]; error?: string }> {
    const supabase = await createClient()
    const targetYear = year || new Date().getFullYear()

    try {
        const { data, error } = await supabase
            .from('transacoes_financeiras')
            .select('valor, tipo, data_transacao')
            .eq('tenant_id', tenantId)
            .eq('status', 'pago')
            .gte('data_transacao', `${targetYear}-01-01`)
            .lte('data_transacao', `${targetYear}-12-31T23:59:59`)

        if (error) throw error

        const months = [
            'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
            'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ]

        const monthlyMap = months.map((month, idx) => ({
            month,
            receita: 0,
            despesa: 0,
        }))

        for (const t of data || []) {
            const monthIdx = new Date(t.data_transacao).getMonth()
            if (t.tipo === 'Receita') {
                monthlyMap[monthIdx].receita += Number(t.valor)
            } else {
                monthlyMap[monthIdx].despesa += Number(t.valor)
            }
        }

        return { success: true, data: monthlyMap }
    } catch (error: any) {
        console.error('Erro ao buscar breakdown mensal:', error)
        return { success: false, error: error.message }
    }
}

// ─── Categorias ──────────────────────────────────────────

export async function getFinancialCategories(
    tenantId: string
): Promise<{ success: boolean; data?: FinancialCategory[]; error?: string }> {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase
            .from('financial_categories')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('order_index', { ascending: true })

        if (error) throw error
        return { success: true, data: data as FinancialCategory[] }
    } catch (error: any) {
        console.error('Erro ao buscar categorias:', error)
        return { success: false, error: error.message }
    }
}

export async function createFinancialCategory(
    tenantId: string,
    name: string,
    tipo: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('financial_categories')
            .insert({ tenant_id: tenantId, name, tipo, is_default: false })

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao criar categoria:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteFinancialCategory(
    id: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('financial_categories')
            .delete()
            .eq('id', id)
            .eq('is_default', false)

        if (error) throw error
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao excluir categoria:', error)
        return { success: false, error: error.message }
    }
}
