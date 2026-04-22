'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FormInput } from '@/components/shared/forms/FormInput'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import type { Transaction, FinancialCategory } from '@/app/_actions/financial'

interface TransactionModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: any) => Promise<void>
    editingTransaction?: Transaction | null
    categories: FinancialCategory[]
    leads?: Array<{ id: string; name: string }>
}

export function TransactionModal({
    isOpen, onClose, onSubmit,
    editingTransaction, categories, leads
}: TransactionModalProps) {
    const [tipo, setTipo] = useState('Receita')
    const [valor, setValor] = useState('')
    const [categoria, setCategoria] = useState('')
    const [descricao, setDescricao] = useState('')
    const [dataTransacao, setDataTransacao] = useState('')
    const [status, setStatus] = useState('pago')
    const [leadId, setLeadId] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (editingTransaction) {
            setTipo(editingTransaction.tipo)
            setValor(String(editingTransaction.valor))
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
    }

    const handleSubmit = async () => {
        if (!valor || Number(valor) <= 0) return
        setLoading(true)

        try {
            await onSubmit({
                valor: Number(valor),
                tipo,
                categoria: categoria || null,
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
                        type="number"
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
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
                    <FormSelect
                        label="Categoria"
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        options={[
                            { value: '', label: 'Selecionar...' },
                            ...filteredCategories.map(c => ({
                                value: c.name,
                                label: c.name,
                            }))
                        ]}
                    />
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
                    disabled={loading || !valor || Number(valor) <= 0}
                    className="w-full py-3 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Salvando...' : isEditing ? 'Atualizar Transação' : 'Registrar Transação'}
                </button>
            </div>
        </Modal>
    )
}
