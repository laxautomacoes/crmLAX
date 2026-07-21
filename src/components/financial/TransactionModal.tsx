'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { FormActionSelect } from '@/components/shared/forms/FormActionSelect'
import type { FormActionSelectOption } from '@/components/shared/forms/FormActionSelect'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createFinancialCategory, deleteFinancialCategory } from '@/app/_actions/financial'
import type { Transaction, FinancialCategory } from '@/app/_actions/financial'
import { formatCurrencyBRL, parseCurrencyBRL } from '@/lib/utils/currency'

interface TransactionModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any) => Promise<void>
    editingTransaction?: Transaction | null
    categories: FinancialCategory[]
    leads?: Array<{ id: string; name: string }>
    tenantId: string
    onCategoriesChange?: () => void
}

export function TransactionModal({
    isOpen, onClose, onSubmit,
    editingTransaction, categories, leads,
    tenantId, onCategoriesChange
}: TransactionModalProps) {
    const [tipo, setTipo] = useState('Receita')
    const [valor, setValor] = useState('')
    const [categoria, setCategoria] = useState('')
    const [descricao, setDescricao] = useState('')
    const [dataTransacao, setDataTransacao] = useState('')
    const [status, setStatus] = useState('pago')
    const [leadId, setLeadId] = useState('')
    const [loading, setLoading] = useState(false)
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [newCategory, setNewCategory] = useState('')
    const [deletingCategoryOption, setDeletingCategoryOption] = useState<FormActionSelectOption | null>(null)

    useEffect(() => {
        if (editingTransaction) {
            setTipo(editingTransaction.tipo)
            setValor(editingTransaction.valor ? formatCurrencyBRL(Math.round(Number(editingTransaction.valor) * 100).toString()) : '')
            setCategoria(editingTransaction.categoria || '')
            setDescricao(editingTransaction.descricao || '')
            setDataTransacao(editingTransaction.data_transacao?.split('T')[0] || '')
            setStatus(editingTransaction.status || 'pago')
            setLeadId(editingTransaction.lead_id || '')
        } else {
            resetForm()
        }
    }, [editingTransaction, isOpen])

    const resetForm = () => {
        setTipo('Receita')
        setValor('')
        setCategoria('')
        setDescricao('')
        setDataTransacao(new Date().toISOString().split('T')[0])
        setStatus('pago')
        setLeadId('')
        setIsAddingCategory(false)
        setNewCategory('')
    }

    const handleSubmit = async () => {
        if (!valor || parseCurrencyBRL(valor) <= 0) return
        setLoading(true)

        try {
            let finalCategoria = categoria
            if (isAddingCategory && newCategory.trim()) {
                const res = await createFinancialCategory(tenantId, newCategory.trim(), tipo)
                if (res.success) {
                    finalCategoria = newCategory.trim()
                    if (onCategoriesChange) onCategoriesChange()
                } else {
                    toast.error(res.error || 'Erro ao criar categoria')
                }
            }

            await onSubmit({
                valor: parseCurrencyBRL(valor),
                tipo,
                categoria: finalCategoria || null,
                descricao: descricao || null,
                data_transacao: dataTransacao || new Date().toISOString(),
                status,
                lead_id: leadId || null,
            })
            resetForm()
            onClose()
        } finally {
            setLoading(false)
        }
    }

    const filteredCategories = categories.filter(
        c => c.tipo === tipo || c.tipo === 'Ambos'
    )

    const isEditing = !!editingTransaction

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Editar Transação' : 'Nova Transação'}
            size="lg"
        >
            <div className="space-y-5">
                {/* Tipo */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setTipo('Receita')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
                            tipo === 'Receita'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted'
                        }`}
                    >
                        Receita
                    </button>
                    <button
                        type="button"
                        onClick={() => setTipo('Despesa')}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
                            tipo === 'Despesa'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'bg-muted/50 text-muted-foreground border border-border hover:bg-muted'
                        }`}
                    >
                        Despesa
                    </button>
                </div>

                {/* Valor + Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormInput
                        label="Valor (R$)"
                        value={valor}
                        onChange={(e) => setValor(formatCurrencyBRL(e.target.value))}
                        placeholder="0,00"
                        required
                    />
                    <FormInput
                        label="Data"
                        type="date"
                        value={dataTransacao}
                        onChange={(e) => setDataTransacao(e.target.value)}
                    />
                </div>

                {/* Categoria + Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!isAddingCategory ? (
                        <FormActionSelect
                            label="Categoria"
                            value={categoria}
                            placeholder="Selecionar..."
                            onChange={(val) => {
                                if (val === 'ADD_NEW') {
                                    setIsAddingCategory(true)
                                } else {
                                    setCategoria(val)
                                }
                            }}
                            options={[
                                ...filteredCategories.map(c => ({
                                    value: c.name,
                                    label: c.name,
                                    id: c.id,
                                    isCustom: !c.is_default
                                })),
                                { value: 'ADD_NEW', label: '+ Outra' }
                            ]}
                            onDelete={(option) => {
                                setDeletingCategoryOption(option)
                            }}
                        />
                    ) : (
                        <FormInput
                            label="Categoria (Nova)"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Ex: Marketing"
                            rightElement={
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddingCategory(false)
                                        setNewCategory('')
                                    }}
                                    className="text-muted-foreground hover:text-foreground p-1"
                                    title="Cancelar"
                                >
                                    <X size={14} />
                                </button>
                            }
                        />
                    )}
                    <FormSelect
                        label="Status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        options={[
                            { value: 'pago', label: 'Pago' },
                            { value: 'pendente', label: 'Pendente' },
                            { value: 'cancelado', label: 'Cancelado' },
                        ]}
                    />
                </div>

                {/* Lead vinculado */}
                {leads && leads.length > 0 && (
                    <FormSelect
                        label="Lead Vinculado (opcional)"
                        value={leadId}
                        onChange={(e) => setLeadId(e.target.value)}
                        options={[
                            { value: '', label: 'Nenhum' },
                            ...leads.map(l => ({
                                value: l.id,
                                label: l.name,
                            }))
                        ]}
                    />
                )}

                {/* Descrição */}
                <FormTextarea
                    label="Descrição"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Comissão Apto 502 - Edifício Aurora"
                    rows={2}
                />

                {/* Botão Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={loading || !valor || parseCurrencyBRL(valor) <= 0}
                    className="w-full py-3 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Salvando...' : isEditing ? 'Atualizar Transação' : 'Registrar Transação'}
                </button>
            </div>

            <ConfirmModal
                isOpen={!!deletingCategoryOption}
                onCancel={() => setDeletingCategoryOption(null)}
                onConfirm={async () => {
                    if (!deletingCategoryOption?.id) return
                    setLoading(true)
                    try {
                        const res = await deleteFinancialCategory(deletingCategoryOption.id)
                        if (res.success) {
                            toast.success('Categoria excluída com sucesso')
                            if (categoria === deletingCategoryOption.value) {
                                setCategoria('')
                            }
                            if (onCategoriesChange) onCategoriesChange()
                        } else {
                            toast.error(res.error || 'Erro ao excluir categoria')
                        }
                    } finally {
                        setLoading(false)
                        setDeletingCategoryOption(null)
                    }
                }}
                title="Excluir Categoria"
                message={`Tem certeza que deseja excluir a categoria "${deletingCategoryOption?.label}"? Transações existentes continuarão com este nome, mas ele não aparecerá mais na lista.`}
            />
        </Modal>
    )
}
