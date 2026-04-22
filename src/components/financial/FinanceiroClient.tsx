'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { FinancialKPIs } from '@/components/financial/FinancialKPIs'
import { MonthlyChart } from '@/components/financial/MonthlyChart'
import { TransactionsTable } from '@/components/financial/TransactionsTable'
import { TransactionModal } from '@/components/financial/TransactionModal'
import { TransactionFilters } from '@/components/financial/TransactionFilters'
import {
    getTransactions, createTransaction, updateTransaction, deleteTransaction,
    getFinancialSummary, getMonthlyBreakdown, getFinancialCategories,
    type Transaction, type FinancialSummary, type MonthlyData,
    type FinancialCategory, type TransactionFilters as TFilters
} from '@/app/_actions/financial'

interface FinanceiroClientProps {
    tenantId: string
    leads?: Array<{ id: string; name: string }>
}

export function FinanceiroClient({ tenantId, leads }: FinanceiroClientProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [summary, setSummary] = useState<FinancialSummary>({
        totalReceita: 0, totalDespesa: 0, saldo: 0,
        receitaTrend: '+0%', despesaTrend: '+0%'
    })
    const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
    const [categories, setCategories] = useState<FinancialCategory[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Filtros
    const [tipo, setTipo] = useState('Todas')
    const [categoria, setCategoria] = useState('')
    const [periodo, setPeriodo] = useState('month')
    const [search, setSearch] = useState('')

    const getDateRange = useCallback((p: string) => {
        const now = new Date()
        let startDate: string | undefined
        switch (p) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
                break
            case '3months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]
                break
            case '6months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]
                break
            case 'year':
                startDate = `${now.getFullYear()}-01-01`
                break
            default:
                startDate = undefined
        }
        return { startDate, endDate: undefined }
    }, [])

    const fetchData = useCallback(async () => {
        try {
            const { startDate, endDate } = getDateRange(periodo)

            const filters: TFilters = {
                tipo: tipo !== 'Todas' ? tipo : undefined,
                categoria: categoria || undefined,
                startDate,
                endDate,
                search: search || undefined,
            }

            const [txResult, summaryResult, monthlyResult, catResult] = await Promise.all([
                getTransactions(tenantId, filters),
                getFinancialSummary(tenantId, startDate, endDate),
                getMonthlyBreakdown(tenantId),
                getFinancialCategories(tenantId),
            ])

            if (txResult.success) setTransactions(txResult.data || [])
            if (summaryResult.success && summaryResult.data) setSummary(summaryResult.data)
            if (monthlyResult.success) setMonthlyData(monthlyResult.data || [])
            if (catResult.success) setCategories(catResult.data || [])
        } catch (error) {
            console.error('Erro ao carregar dados financeiros:', error)
            toast.error('Erro ao carregar dados financeiros')
        } finally {
            setIsLoading(false)
        }
    }, [tenantId, tipo, categoria, periodo, search, getDateRange])

    useEffect(() => { fetchData() }, [fetchData])

    const handleCreate = async (data: any) => {
        const result = await createTransaction({ ...data, tenant_id: tenantId })
        if (result.success) {
            toast.success('Transação registrada!')
            fetchData()
        } else {
            toast.error('Erro: ' + result.error)
        }
    }

    const handleUpdate = async (data: any) => {
        if (!editingTransaction) return
        const result = await updateTransaction(editingTransaction.id, data)
        if (result.success) {
            toast.success('Transação atualizada!')
            setEditingTransaction(null)
            fetchData()
        } else {
            toast.error('Erro: ' + result.error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return
        const result = await deleteTransaction(id)
        if (result.success) {
            toast.success('Transação excluída!')
            fetchData()
        } else {
            toast.error('Erro: ' + result.error)
        }
    }

    const handleEdit = (t: Transaction) => {
        setEditingTransaction(t)
        setIsModalOpen(true)
    }

    const handleOpenModal = () => {
        setEditingTransaction(null)
        setIsModalOpen(true)
    }

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader
                title="Financeiro"
                subtitle="Gerencie receitas e despesas do seu negócio"
            >
                <button
                    onClick={handleOpenModal}
                    className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-3 md:py-2 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-sm font-bold shadow-sm flex-1 md:flex-none"
                >
                    <Plus size={18} />
                    Nova Transação
                </button>
            </PageHeader>

            <FinancialKPIs data={summary} />

            <MonthlyChart data={monthlyData} />

            <TransactionFilters
                tipo={tipo}
                onTipoChange={setTipo}
                categoria={categoria}
                onCategoriaChange={setCategoria}
                periodo={periodo}
                onPeriodoChange={setPeriodo}
                search={search}
                onSearchChange={setSearch}
                categories={categories}
            />

            <TransactionsTable
                transactions={transactions}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingTransaction(null)
                }}
                onSubmit={editingTransaction ? handleUpdate : handleCreate}
                editingTransaction={editingTransaction}
                categories={categories}
                leads={leads}
            />
        </div>
    )
}
