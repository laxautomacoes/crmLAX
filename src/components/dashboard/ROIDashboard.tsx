'use client'

import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3 } from 'lucide-react'
import type { ROIMetrics } from '@/app/_actions/dashboard'

interface ROIDashboardProps {
    data: ROIMetrics
}

export default function ROIDashboard({ data }: ROIDashboardProps) {
    const isPositive = data.roi >= 0

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ROI Card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ROI do Marketing</h3>
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(data.roi).toFixed(1)}%
                    </div>
                </div>
                <p className="text-2xl font-black text-foreground">
                    {isPositive ? '' : '-'}{data.roi.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Retorno sobre Investimento</p>
            </div>

            {/* Invetimento Card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Investimento Ads</h3>
                <p className="text-2xl font-black text-foreground">
                    R$ {data.totalCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Total gasto em tráfego pago</p>
            </div>

            {/* Receita Card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Vendas (Convertido)</h3>
                <p className="text-2xl font-black text-foreground">
                    R$ {data.totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Valor estimado de leads ganhos</p>
            </div>

            {/* CPL Card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">CPL (Custo por Lead)</h3>
                <p className="text-2xl font-black text-foreground">
                    R$ {data.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Baseado em {data.leadsCount} leads</p>
            </div>
        </div>
    )
}
