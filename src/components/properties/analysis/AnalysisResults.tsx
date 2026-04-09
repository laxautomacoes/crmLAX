'use client';

import { MarketAnalysisResult } from "@/app/_actions/market-analysis";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Cell
} from 'recharts';
import { 
    TrendingUp, 
    Home, 
    Maximize,
    ExternalLink,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';

interface AnalysisResultsProps {
    data: MarketAnalysisResult;
}

export function AnalysisResults({ data }: AnalysisResultsProps) {
    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const kpis = [
        { 
            label: 'Média m²', 
            value: formatCurrency(data.averageValue), 
            icon: TrendingUp,
            color: 'text-secondary',
            bg: 'bg-secondary/10'
        },
        { 
            label: 'Mediana', 
            value: formatCurrency(data.medianValue), 
            icon: Home,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        },
        { 
            label: 'Mínimo m²', 
            value: formatCurrency(data.minPrice), 
            icon: ArrowDownRight,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
        { 
            label: 'Máximo m²', 
            value: formatCurrency(data.maxPrice), 
            icon: ArrowUpRight,
            color: 'text-red-500',
            bg: 'bg-red-500/10'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                                <kpi.icon size={20} />
                            </div>
                        </div>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                        <h3 className="text-xl font-black text-foreground mt-1 tracking-tight">{kpi.value}</h3>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-card border border-border p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                            <Maximize size={18} className="text-secondary" />
                            Valor Médio/m² por Número de Quartos
                        </h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                                <XAxis 
                                    dataKey="bedrooms" 
                                    tick={{ fontSize: 12, fontWeight: 'bold', fill: 'hsl(var(--foreground))' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis 
                                    tickFormatter={(val) => `R$ ${val/1000}k`}
                                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'hsl(var(--card))', 
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: 'hsl(var(--foreground))'
                                    }}
                                    itemStyle={{ color: 'hsl(var(--secondary))' }}
                                    formatter={(value: number) => [formatCurrency(value), 'Valor Médio/m²']}
                                    labelFormatter={(label) => `${label} Quarto(s)`}
                                />
                                <Bar dataKey="averageValue" radius={[6, 6, 0, 0]} barSize={40}>
                                    {data.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--secondary))' : 'hsl(var(--secondary) / 0.7)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-2">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5 border-t border-border pt-4 w-full justify-center">
                            <span className="h-2 w-2 rounded-full bg-secondary" /> Eixo X: Dormitórios
                        </p>
                    </div>
                </div>

                {/* Reference Listings */}
                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col h-full max-h-[420px]">
                    <h3 className="text-base font-bold flex items-center gap-2 mb-4 text-foreground">
                        <ExternalLink size={18} className="text-secondary" />
                        Amostras Encontradas
                    </h3>
                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                        {data.properties.map((prop, i) => (
                            <a 
                                key={i}
                                href={prop.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] font-black text-secondary uppercase tracking-wider">
                                        {prop.bedrooms} Quartos • {prop.area}m²
                                    </p>
                                    <ArrowUpRight size={12} className="text-muted-foreground group-hover:text-secondary opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                                <p className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-secondary transition-colors">
                                    {prop.title}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm font-black text-foreground">{formatCurrency(prop.price)}</span>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Fonte Internet</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
