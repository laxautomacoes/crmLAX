'use client';

import { MarketAnalysisResult } from "@/app/_actions/market-analysis";
import { NEIGHBORHOOD_COLORS } from './LocationFilters';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Cell,
    Legend
} from 'recharts';
import { 
    TrendingUp, 
    Home, 
    Maximize,
    ExternalLink,
    ArrowUpRight,
    ArrowDownRight,
    Scale
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export interface ComparisonEntry {
    data: MarketAnalysisResult;
    neighborhood: string;
    color: string;
}

interface AnalysisResultsProps {
    entries: ComparisonEntry[];
}

export function AnalysisResults({ entries }: AnalysisResultsProps) {
    const formatCurrency = (val: number) => {
        if (!isFinite(val) || isNaN(val)) return 'N/D';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
    };

    const isComparison = entries.length > 1;

    if (!isComparison) {
        return <SingleResult data={entries[0].data} neighborhood={entries[0].neighborhood} formatCurrency={formatCurrency} />;
    }

    return <ComparisonResults entries={entries} formatCurrency={formatCurrency} />;
}

/* ========================================
   RESULTADO ÚNICO (layout original mantido)
   ======================================== */
function SingleResult({ data, neighborhood, formatCurrency }: { data: MarketAnalysisResult; neighborhood: string; formatCurrency: (val: number) => string }) {
    const kpis = [
        { label: 'Média m²', value: formatCurrency(data.averageValue), icon: TrendingUp, color: 'text-foreground', bg: 'bg-secondary/10' },
        { label: 'Mediana', value: formatCurrency(data.medianValue), icon: Home, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Mínimo m²', value: formatCurrency(data.minPrice), icon: ArrowDownRight, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'Máximo m²', value: formatCurrency(data.maxPrice), icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-500/10' },
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
                        className="bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-md transition-all group"
                    >

                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                        <h3 className="text-xl font-black text-foreground mt-1 tracking-tight">{kpi.value}</h3>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-foreground">
                            Valor Médio/m² por Número de Quartos
                        </h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
                                <XAxis 
                                    dataKey="bedrooms" 
                                    tick={{ fontSize: 12, fontWeight: 'bold', fill: 'var(--foreground)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis 
                                    tickFormatter={(val) => `R$ ${val/1000}k`}
                                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ 
                                        backgroundColor: 'var(--card)', 
                                        borderColor: 'var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: 'var(--foreground)'
                                    }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                    formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Valor Médio/m²']}
                                    labelFormatter={(label) => `${label} Quarto(s)`}
                                />
                                <Bar 
                                    dataKey="averageValue" 
                                    radius={[6, 6, 0, 0]} 
                                    barSize={40}
                                    activeBar={{ fillOpacity: 1, stroke: 'var(--foreground)', strokeWidth: 2 }}
                                >
                                    {data.chartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill="#D97706" 
                                            fillOpacity={index % 2 === 0 ? 1 : 0.7} 
                                        />
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
                <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex flex-col h-full max-h-[420px]">
                    <h3 className="text-base font-bold mb-4 text-foreground">
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
                                    <p className="text-[10px] font-black text-foreground uppercase tracking-wider">
                                        {prop.bedrooms} Quartos • {prop.area}m²
                                    </p>
                                    <ArrowUpRight size={12} className="text-muted-foreground group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                                <p className="text-xs font-bold text-foreground line-clamp-1">
                                    {prop.title}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm font-black text-foreground">{formatCurrency(prop.price)}</span>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">VER ANÚNCIO</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ========================================
   RESULTADO COMPARATIVO (2-3 bairros)
   ======================================== */
function ComparisonResults({ entries, formatCurrency }: { entries: ComparisonEntry[]; formatCurrency: (val: number) => string }) {
    const [activeTab, setActiveTab] = useState(0);

    // Calcular médias gerais
    const avgOfAverages = Math.round(entries.reduce((sum, e) => sum + e.data.averageValue, 0) / entries.length);
    const avgOfMedians = Math.round(entries.reduce((sum, e) => sum + e.data.medianValue, 0) / entries.length);
    const globalMin = Math.min(...entries.map(e => e.data.minPrice));
    const globalMax = Math.max(...entries.map(e => e.data.maxPrice));

    // Montar dados do gráfico comparativo
    const allBedrooms = new Set<number>();
    entries.forEach(e => e.data.chartData.forEach(c => allBedrooms.add(c.bedrooms)));
    const sortedBedrooms = Array.from(allBedrooms).sort((a, b) => a - b);

    const comparisonChartData = sortedBedrooms.map(bed => {
        const row: any = { bedrooms: `${bed}Q` };
        entries.forEach((e, i) => {
            const match = e.data.chartData.find(c => c.bedrooms === bed);
            row[`bairro_${i}`] = match?.averageValue || 0;
        });
        return row;
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Card de Média Geral */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl shadow-sm p-6 relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 via-transparent to-indigo-500/5 pointer-events-none" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                        <div>
                            <h3 className="text-base font-bold text-foreground">Média Geral da Comparação</h3>
                            <p className="text-[11px] text-muted-foreground">
                                Média entre {entries.map(e => e.neighborhood).join(', ')}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Média m²</p>
                            <p className="text-xl font-black text-foreground mt-0.5">{formatCurrency(avgOfAverages)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mediana</p>
                            <p className="text-xl font-black text-foreground mt-0.5">{formatCurrency(avgOfMedians)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mínimo Geral</p>
                            <p className="text-xl font-black text-emerald-500 mt-0.5">{formatCurrency(globalMin)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Máximo Geral</p>
                            <p className="text-xl font-black text-red-500 mt-0.5">{formatCurrency(globalMax)}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* KPIs por Bairro lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {entries.map((entry, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.15 }}
                        className="bg-card border border-border rounded-xl shadow-sm p-5 space-y-4"
                    >
                        {/* Header do bairro */}
                        <div className="flex items-center gap-2">
                            <div 
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{ backgroundColor: entry.color }}
                            />
                            <h4 className="text-sm font-black text-foreground uppercase tracking-wider truncate">
                                {entry.neighborhood}
                            </h4>
                        </div>

                        {/* KPIs do bairro */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-muted/20 rounded-xl p-3">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Média m²</p>
                                <p className="text-lg font-black text-foreground mt-0.5">{formatCurrency(entry.data.averageValue)}</p>
                            </div>
                            <div className="bg-muted/20 rounded-xl p-3">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Mediana</p>
                                <p className="text-lg font-black text-foreground mt-0.5">{formatCurrency(entry.data.medianValue)}</p>
                            </div>
                            <div className="bg-muted/20 rounded-xl p-3">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Mínimo</p>
                                <p className="text-sm font-black text-emerald-500 mt-0.5">{formatCurrency(entry.data.minPrice)}</p>
                            </div>
                            <div className="bg-muted/20 rounded-xl p-3">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Máximo</p>
                                <p className="text-sm font-black text-red-500 mt-0.5">{formatCurrency(entry.data.maxPrice)}</p>
                            </div>
                        </div>

                        {/* Contagem de amostras */}
                        <p className="text-[10px] text-muted-foreground font-bold text-center">
                            {entry.data.properties.length} amostras encontradas
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* Gráfico Comparativo */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card border border-border p-6 rounded-xl shadow-sm"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-foreground">
                        Comparação de Valor Médio/m² por Quartos
                    </h3>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
                            <XAxis 
                                dataKey="bedrooms" 
                                tick={{ fontSize: 12, fontWeight: 'bold', fill: 'var(--foreground)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis 
                                tickFormatter={(val) => `R$ ${val/1000}k`}
                                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ 
                                    backgroundColor: 'var(--card)', 
                                    borderColor: 'var(--border)',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: 'var(--foreground)'
                                }}
                                formatter={((value: any, name: string) => {
                                    const idx = parseInt(name.split('_')[1]);
                                    return [formatCurrency(Number(value) || 0), entries[idx]?.neighborhood || name];
                                }) as any}
                                labelFormatter={(label) => `${label} Quarto(s)`}
                            />
                            <Legend 
                                formatter={(value: string) => {
                                    const idx = parseInt(value.split('_')[1]);
                                    return entries[idx]?.neighborhood || value;
                                }}
                                iconType="circle"
                                wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                            />
                            {entries.map((entry, i) => (
                                <Bar 
                                    key={i}
                                    dataKey={`bairro_${i}`} 
                                    fill={entry.color}
                                    radius={[6, 6, 0, 0]} 
                                    barSize={Math.max(20, 40 / entries.length)}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Amostras por Bairro (Abas) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
            >
                {/* Tabs */}
                <div className="flex items-center border-b border-border overflow-x-auto no-scrollbar">
                    {entries.map((entry, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveTab(idx)}
                            className={`px-6 py-3 text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap
                                ${activeTab === idx 
                                    ? 'text-foreground border-b-[3px]' 
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                            style={activeTab === idx ? { borderBottomColor: entry.color } : undefined}
                        >
                            <div 
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{ backgroundColor: entry.color }}
                            />
                            {entry.neighborhood}
                        </button>
                    ))}
                </div>

                {/* Conteúdo da aba */}
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-base font-bold text-foreground">
                            Amostras — {entries[activeTab].neighborhood}
                        </h3>
                        <span className="text-xs text-muted-foreground ml-auto">
                            {entries[activeTab].data.properties.length} imóveis
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {entries[activeTab].data.properties.map((prop, i) => (
                            <a 
                                key={i}
                                href={prop.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] font-black uppercase tracking-wider"
                                       style={{ color: entries[activeTab].color }}
                                    >
                                        {prop.bedrooms} Quartos • {prop.area}m²
                                    </p>
                                    <ArrowUpRight size={12} className="text-muted-foreground group-hover:opacity-100 opacity-0 transition-all" />
                                </div>
                                <p className="text-xs font-bold text-foreground line-clamp-1">
                                    {prop.title}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm font-black text-foreground">{formatCurrency(prop.price)}</span>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase">VER ANÚNCIO</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
