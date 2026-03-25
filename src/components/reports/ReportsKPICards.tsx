'use client';

import { Users, Filter, CheckCircle2, TrendingUp } from 'lucide-react';

interface ReportsKPICardsProps {
    metrics: {
        totalLeads: number;
        activeLeads: number;
        conversions: number;
        conversionRate: string;
    };
}

export default function ReportsKPICards({ metrics }: ReportsKPICardsProps) {
    const kpis = [
        {
            label: 'Total de Leads',
            value: metrics.totalLeads,
            icon: Users,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            description: 'No período selecionado'
        },
        {
            label: 'Leads Ativos',
            value: metrics.activeLeads,
            icon: Filter,
            color: 'text-indigo-500',
            bgColor: 'bg-indigo-500/10',
            description: 'Em atendimento'
        },
        {
            label: 'Conversões',
            value: metrics.conversions,
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bgColor: 'bg-emerald-500/10',
            description: 'Negócios ganhos'
        },
        {
            label: 'Taxa de Conversão',
            value: metrics.conversionRate,
            icon: TrendingUp,
            color: 'text-amber-500',
            bgColor: 'bg-amber-500/10',
            description: 'De Leads para Ganhos'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, index) => {
                const Icon = kpi.icon;
                return (
                    <div key={index} className="bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between h-full">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground">{kpi.label}</h3>
                                <p className="text-3xl font-bold mt-1 text-foreground">{kpi.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${kpi.bgColor}`}>
                                <Icon className={`w-6 h-6 ${kpi.color}`} />
                            </div>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <span>{kpi.description}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
