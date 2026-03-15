'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, MapPin } from 'lucide-react';

interface MarketData {
    name: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
    change: string;
    period: string;
}

const UFS = ['SP', 'RJ', 'MG', 'RS', 'SC', 'PR', 'BA', 'PE', 'CE', 'DF'];

const cubByUF: Record<string, string> = {
    'SP': 'R$ 1.954,23',
    'RJ': 'R$ 1.892,10',
    'MG': 'R$ 1.815,45',
    'RS': 'R$ 1.983,12',
    'SC': 'R$ 3.028,45',
    'PR': 'R$ 1.874,30',
    'BA': 'R$ 1.654,12',
    'PE': 'R$ 1.702,90',
    'CE': 'R$ 1.685,40',
    'DF': 'R$ 1.920,05',
};

export function MarketDataCard() {
    const [selectedUF, setSelectedUF] = useState('SP');

    const marketData: MarketData[] = [
        { 
            name: `CUB/${selectedUF}`, 
            value: cubByUF[selectedUF], 
            trend: 'up', 
            change: selectedUF === 'SC' ? '+0,30%' : '+0,45%', 
            period: 'Fev/2026' 
        },
        { name: 'IGP-M', value: '0,15%', trend: 'down', change: '-0,05%', period: 'Mar/2026' },
        { name: 'INCC-M', value: '0,32%', trend: 'up', change: '+0,12%', period: 'Fev/2026' },
    ];

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-foreground tracking-tight">Dados de Mercado</h3>
                        <p className="text-sm text-muted-foreground">Índices econômicos do setor imobiliário.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-background border border-border p-1.5 rounded-xl shadow-sm">
                        <select 
                            value={selectedUF}
                            onChange={(e) => setSelectedUF(e.target.value)}
                            className="bg-transparent text-xs font-black text-foreground uppercase tracking-wider outline-none cursor-pointer px-2"
                        >
                            {UFS.map(uf => (
                                <option key={uf} value={uf}>{uf}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {marketData.map((item) => (
                        <div key={item.name} className="p-4 rounded-xl bg-muted/20 border border-border group hover:border-secondary/30 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">{item.name}</span>
                                {item.trend === 'up' && <TrendingUp size={14} className="text-red-500" />}
                                {item.trend === 'down' && <TrendingDown size={14} className="text-emerald-500" />}
                                {item.trend === 'neutral' && <Minus size={14} className="text-muted-foreground" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-foreground">{item.value}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs font-bold ${
                                        item.trend === 'up' ? 'text-red-500' : 
                                        item.trend === 'down' ? 'text-emerald-500' : 
                                        'text-muted-foreground'
                                    }`}>
                                        {item.change}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase">{item.period}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex items-start gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                    <Info size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Os dados exibidos são coletados de fontes públicas (FGV, IBGE, Sinduscon). 
                        A LAX Automacoes não se responsabiliza pela exatidão imediata dos índices, utilize-os apenas como referência.
                    </p>
                </div>
            </div>
        </div>
    );
}
