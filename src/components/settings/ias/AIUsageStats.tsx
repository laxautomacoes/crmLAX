'use client'

import { Brain, Zap, Coins, Activity } from 'lucide-react';

interface StatsProps {
    stats: {
        total_tokens: number;
        gpt_count: number;
        gemini_count: number;
        total_requests: number;
    }
}

export function AIUsageStats({ stats }: StatsProps) {
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
            title: 'Total de Tokens',
            value: stats.total_tokens.toLocaleString(),
            icon: Coins,
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => (
                <div 
                    key={index} 
                    className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300 group"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-3.5 rounded-2xl bg-slate-50 transition-transform group-hover:scale-110 duration-300">
                            <card.icon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">{card.title}</p>
                        <h3 className="text-3xl font-semibold text-slate-900">{card.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    );
}
