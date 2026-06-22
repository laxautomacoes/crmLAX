'use client'

import { Brain, Zap, DollarSign, Activity, Gauge } from 'lucide-react';
import { formatBRL } from '@/utils/ai-pricing';

interface StatsProps {
    stats: {
        total_tokens: number;
        total_cost_brl: number;
        gpt_count: number;
        gemini_count: number;
        total_requests: number;
        monthly_requests: number;
        monthly_limit: number;
        plan_name: string;
        exchange_rate: number;
    }
}

export function AIUsageStats({ stats }: StatsProps) {
    const usagePercent = stats.monthly_limit > 0
        ? Math.min((stats.monthly_requests / stats.monthly_limit) * 100, 100)
        : 0;

    const getBarColor = () => {
        if (usagePercent >= 90) return 'bg-red-500';
        if (usagePercent >= 70) return 'bg-amber-500';
        return 'bg-secondary';
    };

    const cards = [
        {
            title: 'Requisições',
            value: stats.total_requests,
            icon: Activity,
        },
        {
            title: 'GPT (OpenAI)',
            value: stats.gpt_count,
            icon: Zap,
        },
        {
            title: 'Gemini (Google)',
            value: stats.gemini_count,
            icon: Brain,
        },
        {
            title: 'Custo Estimado',
            value: formatBRL(stats.total_cost_brl),
            subtitle: `${stats.total_tokens.toLocaleString()} tokens`,
            subtitle2: `USD 1.00 = R$ ${stats.exchange_rate.toFixed(2)}`,
            icon: DollarSign,
            highlight: true,
        }
    ];

    return (
        <div className="space-y-6">
            {/* Cards de métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, index) => (
                    <div 
                        key={index} 
                        className={`p-6 rounded-lg bg-card border shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300 group ${
                            card.highlight ? 'border-secondary/40 ring-1 ring-secondary/20' : 'border-border/60'
                        }`}
                    >
                        <div className="flex flex-row items-start justify-between pb-2">
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-foreground">{card.title}</h3>
                                {card.subtitle && (
                                    <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                                )}
                                {'subtitle2' in card && card.subtitle2 && (
                                    <p className="text-xs text-muted-foreground">{card.subtitle2}</p>
                                )}
                            </div>
                            <div className={`p-2 rounded-lg transition-transform group-hover:scale-110 duration-300 ${
                                card.highlight ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
                            }`}>
                                <card.icon className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2">
                            <h3 className="text-3xl font-black text-foreground">{card.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Barra de consumo do plano */}
            {stats.monthly_limit > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-bold text-foreground">Consumo Mensal</span>
                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Plano {stats.plan_name}
                            </span>
                        </div>
                        <span className="text-sm font-bold text-foreground tabular-nums">
                            {stats.monthly_requests} <span className="text-muted-foreground font-medium">/ {stats.monthly_limit}</span>
                        </span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor()}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground font-medium">
                            {usagePercent >= 90 ? '⚠️ Limite quase atingido' : `${usagePercent.toFixed(0)}% utilizado`}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                            {Math.max(stats.monthly_limit - stats.monthly_requests, 0)} restantes
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
