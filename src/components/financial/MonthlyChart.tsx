'use client'

import type { MonthlyData } from '@/app/_actions/financial'

interface MonthlyChartProps {
    data: MonthlyData[]
}

export function MonthlyChart({ data }: MonthlyChartProps) {
    const maxValue = Math.max(
        ...data.map(d => Math.max(d.receita, d.despesa)),
        1 // Evitar divisão por zero
    )

    const formatCurrency = (value: number) =>
        value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

    const hasData = data.some(d => d.receita > 0 || d.despesa > 0)

    if (!hasData) {
        return (
            <div className="bg-card border border-border rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">Evolução Mensal</h3>
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                    Nenhuma transação registrada neste ano
                </div>
            </div>
        )
    }

    return (
        <div className="bg-card border border-border rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Evolução Mensal</h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-muted-foreground font-medium">Receita</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span className="text-[10px] text-muted-foreground font-medium">Despesa</span>
                    </div>
                </div>
            </div>

            <div className="flex items-end gap-1 sm:gap-2 h-48">
                {data.map((item, idx) => {
                    const receitaHeight = (item.receita / maxValue) * 100
                    const despesaHeight = (item.despesa / maxValue) * 100

                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                            <div className="w-full flex items-end justify-center gap-0.5 h-40 relative">
                                {/* Receita bar */}
                                <div
                                    className="w-[45%] bg-emerald-500/80 rounded-t-sm transition-all duration-300 hover:bg-emerald-500 relative group/bar"
                                    style={{ height: `${Math.max(receitaHeight, item.receita > 0 ? 4 : 0)}%` }}
                                >
                                    {item.receita > 0 && (
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10">
                                            R$ {formatCurrency(item.receita)}
                                        </div>
                                    )}
                                </div>
                                {/* Despesa bar */}
                                <div
                                    className="w-[45%] bg-rose-500/80 rounded-t-sm transition-all duration-300 hover:bg-rose-500 relative group/bar2"
                                    style={{ height: `${Math.max(despesaHeight, item.despesa > 0 ? 4 : 0)}%` }}
                                >
                                    {item.despesa > 0 && (
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover/bar2:opacity-100 transition-opacity pointer-events-none z-10">
                                            R$ {formatCurrency(item.despesa)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                                {item.month}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
