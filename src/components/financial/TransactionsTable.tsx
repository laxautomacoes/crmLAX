'use client'

import { Pencil, Trash2, DollarSign, Link2 } from 'lucide-react'
import type { Transaction } from '@/app/_actions/financial'

interface TransactionsTableProps {
    transactions: Transaction[]
    onEdit: (t: Transaction) => void
    onDelete: (id: string) => void
}

export function TransactionsTable({ transactions, onEdit, onDelete }: TransactionsTableProps) {
    const formatCurrency = (value: number) =>
        value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr)
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const statusBadge = (status: string | null) => {
        const map: Record<string, string> = {
            pago: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
            pendente: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
            cancelado: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
        }
        return map[status || 'pago'] || map.pago
    }

    const tipoBadge = (tipo: string) => {
        return tipo === 'Receita'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
    }

    if (transactions.length === 0) {
        return (
            <div className="bg-card border border-border rounded-2xl p-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-muted rounded-2xl">
                        <DollarSign size={32} className="text-muted-foreground" />
                    </div>
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">Nenhuma transação encontrada</h3>
                <p className="text-sm text-muted-foreground">
                    Registre sua primeira transação para começar a acompanhar seu financeiro.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border bg-muted/30">
                            <th className="text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest px-6 py-3">Data</th>
                            <th className="text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest px-6 py-3">Descrição</th>
                            <th className="text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest px-6 py-3">Categoria</th>
                            <th className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest px-6 py-3">Tipo</th>
                            <th className="text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest px-6 py-3">Valor</th>
                            <th className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest px-6 py-3">Status</th>
                            <th className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest px-6 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((t) => (
                            <tr key={t.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                                    {formatDate(t.data_transacao)}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground line-clamp-1">
                                            {t.descricao || '—'}
                                        </span>
                                        {t.lead_name && (
                                            <span className="flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/5 px-1.5 py-0.5 rounded">
                                                <Link2 size={10} />
                                                {t.lead_name}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                    {t.categoria || '—'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${tipoBadge(t.tipo)}`}>
                                        {t.tipo}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`text-sm font-bold ${t.tipo === 'Receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {t.tipo === 'Receita' ? '+' : '-'}R$ {formatCurrency(t.valor)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${statusBadge(t.status)}`}>
                                        {t.status || 'pago'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            onClick={() => onEdit(t)}
                                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(t.id)}
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-600"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border/50">
                {transactions.map((t) => (
                    <div key={t.id} className="p-4 hover:bg-muted/10 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{t.descricao || '—'}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(t.data_transacao)} · {t.categoria || 'Sem categoria'}</p>
                            </div>
                            <span className={`text-sm font-bold whitespace-nowrap ${t.tipo === 'Receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.tipo === 'Receita' ? '+' : '-'}R$ {formatCurrency(t.valor)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tipoBadge(t.tipo)}`}>{t.tipo}</span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(t.status)}`}>{t.status || 'pago'}</span>
                                {t.lead_name && (
                                    <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
                                        <Link2 size={10} />{t.lead_name}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => onEdit(t)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                                    <Pencil size={14} />
                                </button>
                                <button onClick={() => onDelete(t.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-600">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
