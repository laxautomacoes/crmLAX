'use client';

import { Users, Car, TrendingUp } from 'lucide-react';

interface KPICardsProps {
    kpis: {
        leadsAtivos: number
        leadsAtivosTrend: string
        veiculos: number
        veiculosTrend: string
        conversoes: number
        conversoesTrend: string
    }
}

export default function KPICards({ kpis }: KPICardsProps) {
    const kpiData = [
        {
            title: 'Leads Ativos',
            value: kpis.leadsAtivos.toString(),
            trend: kpis.leadsAtivosTrend,
            trendUp: true,
            icon: Users,
        },
        {
            title: 'Veículos',
            value: kpis.veiculos.toString(),
            trend: kpis.veiculosTrend,
            trendUp: true,
            icon: Car,
        },
        {
            title: 'Conversões',
            value: kpis.conversoes.toString(),
            trend: kpis.conversoesTrend,
            trendUp: true,
            icon: TrendingUp,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            {kpiData.map((kpi, index) => (
                <div
                    key={index}
                    className="bg-card px-4 py-4 md:p-6 rounded-lg shadow-sm border border-border relative overflow-hidden 
                       grid grid-cols-4 md:grid-cols-2 items-center md:items-start gap-2 md:gap-x-0 md:gap-y-2 justify-items-center md:justify-items-start"
                >
                    {/* Icon: Mobile Col 1. Desktop Row 1 Col 2 (Right aligned) */}
                    <kpi.icon className="text-gray-400 md:justify-self-end md:col-start-2 md:row-start-1" size={20} />

                    {/* Title: Mobile Col 2. Desktop Row 1 Col 1 */}
                    <span className="text-muted-foreground text-sm md:text-sm font-medium md:col-span-1 md:row-start-1 whitespace-nowrap text-center md:text-left">
                        {kpi.title}
                    </span>

                    {/* Value: Mobile Col 3. Desktop Row 2 Col Span 2 */}
                    <div className="flex items-baseline md:col-span-2 md:row-start-2 md:mt-2">
                        <span className="text-xl md:text-3xl font-bold text-foreground">{kpi.value}</span>
                    </div>

                    {/* Trend: Mobile Col 4. Desktop Row 3 Col Span 2 */}
                    <div className="flex items-center text-xs md:text-sm font-medium text-green-500 md:col-span-2 md:row-start-3">
                        <TrendingUp size={14} className="mr-1 md:w-3.5 md:h-3.5" />
                        {kpi.trend}
                    </div>
                </div>
            ))}
        </div>
    );
}
