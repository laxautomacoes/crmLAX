'use client'

import { TrendingUp, TrendingDown, DollarSign, ArrowUpDown } from 'lucide-react'
import type { FinancialSummary } from '@/app/_actions/financial'

interface FinancialKPIsProps {
    data: FinancialSummary
}

export function FinancialKPIs({ data }: FinancialKPIsProps) {
    const formatCurrency = (value: number) =>
        value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const saldoPositivo = data.saldo >= 0

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Receita */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg text-emerald-600">
                        <TrendingUp size={20} />
                    </div>
                    {data.receitaTrend && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            data.receitaTrend.startsWith('+') && data.receitaTrend !== '+0%'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                        }`}>
                            {data.receitaTrend}
                        </span>
                    )}
                </div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Receita</h3>
                <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {formatCurrency(data.totalReceita)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">Entradas no período</p>
            </div>

            {/* Despesas */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-rose-100 dark:bg-rose-500/10 rounded-lg text-rose-600">
                        <TrendingDown size={20} />
                    </div>
                    {data.despesaTrend && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            data.despesaTrend.startsWith('+') && data.despesaTrend !== '+0%'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                                : 'bg-muted text-muted-foreground'
                        }`}>
                            {data.despesaTrend}
                        </span>
                    )}
                </div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Despesas</h3>
                <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {formatCurrency(data.totalDespesa)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">Saídas no período</p>
            </div>

            {/* Saldo */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg ${saldoPositivo ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-600' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600'}`}>
                        {saldoPositivo ? <DollarSign size={20} /> : <ArrowUpDown size={20} />}
                    </div>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Saldo</h3>
                <p className={`text-2xl font-bold mt-1 ${saldoPositivo ? 'text-foreground' : 'text-rose-600'}`}>
                    {!saldoPositivo && '-'}R$ {formatCurrency(Math.abs(data.saldo))}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">Receita − Despesas</p>
            </div>
        </div>
    )
}
