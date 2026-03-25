'use client'

import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3 } from 'lucide-react'
import type { ROIMetrics } from '@/app/_actions/dashboard'

interface ROIDashboardProps {
    data: ROIMetrics
}

export default function ROIDashboard({ data }: ROIDashboardProps) {
    const isPositive = data.roi >= 0

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ROI Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <BarChart3 size={20} />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(data.roi).toFixed(1)}%
                    </div>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">ROI do Marketing</h3>
                <p className="text-2xl font-bold text-foreground mt-1">
                    {isPositive ? '' : '-'}{data.roi.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">Retorno sobre Investimento</p>
            </div>

            {/* Invetimento Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <DollarSign size={20} />
                    </div>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Investimento Ads</h3>
                <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {data.totalCustos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">Total gasto em tráfego pago</p>
            </div>

            {/* Receita Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                        <Target size={20} />
                    </div>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Vendas (Convertido)</h3>
                <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {data.totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">Valor estimado de leads ganhos</p>
            </div>

            {/* CPL Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                        <TrendingDown size={20} />
                    </div>
                </div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">CPL (Custo por Lead)</h3>
                <p className="text-2xl font-bold text-foreground mt-1">
                    R$ {data.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">Baseado em {data.leadsCount} leads</p>
            </div>
        </div>
    )
}
