'use client'

import { useState } from 'react';
import { History, Filter, ChevronDown } from 'lucide-react';
import { calculateCostBRL, formatBRL } from '@/utils/ai-pricing';

interface UsageRecord {
    id: string;
    created_at: string;
    model: string;
    total_tokens: number;
    feature_context: string;
    tenants?: { name: string } | null;
}

interface Props {
    records: UsageRecord[];
    isSuperadmin: boolean;
}

const CONTEXT_LABELS: Record<string, string> = {
    'lead_analysis': 'Análise de Lead',
    'property_copy': 'Copywriter',
    'lead_matching': 'Matching IA',
    'market_analysis': 'Análise de Mercado',
    'general_marketing_copy': 'Marketing',
    'lead-image-import': 'Import. por Imagem',
    'property-ocr-pdf': 'OCR de PDF',
    'property-scrape-url': 'Scraping de URL',
};

export function AIUsageTable({ records, isSuperadmin }: Props) {
    const [modelFilter, setModelFilter] = useState<string>('all');
    const [contextFilter, setContextFilter] = useState<string>('all');

    const formatDate = (dateStr: string) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateStr));
    };

    const getContextLabel = (context: string) => {
        return CONTEXT_LABELS[context] || context;
    };

    // Modelos e contextos únicos para filtros
    const uniqueModels = Array.from(new Set(records.map(r => r.model))).sort();
    const uniqueContexts = Array.from(new Set(records.map(r => r.feature_context))).sort();

    // Aplicar filtros
    const filtered = records.filter(r => {
        if (modelFilter !== 'all' && r.model !== modelFilter) return false;
        if (contextFilter !== 'all' && r.feature_context !== contextFilter) return false;
        return true;
    });

    // Custo total filtrado
    const totalFilteredCost = filtered.reduce((sum, r) => sum + calculateCostBRL(r.model, r.total_tokens), 0);

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-secondary rounded-full" />
                        <h3 className="text-lg font-semibold text-foreground font-outfit">Logs de Atividade</h3>
                        <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                            {filtered.length} {filtered.length !== records.length ? `de ${records.length}` : ''} operações
                        </span>
                    </div>

                    {/* Filtros */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                value={modelFilter}
                                onChange={(e) => setModelFilter(e.target.value)}
                                className="appearance-none bg-muted/50 border border-border rounded-lg px-3 py-2 pr-8 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all cursor-pointer"
                            >
                                <option value="all">Todos os Modelos</option>
                                {uniqueModels.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={contextFilter}
                                onChange={(e) => setContextFilter(e.target.value)}
                                className="appearance-none bg-muted/50 border border-border rounded-lg px-3 py-2 pr-8 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all cursor-pointer"
                            >
                                <option value="all">Todos os Contextos</option>
                                {uniqueContexts.map(c => (
                                    <option key={c} value={c}>{getContextLabel(c)}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>

                        {/* Custo total filtrado */}
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-secondary/10 border border-secondary/20 rounded-lg">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total:</span>
                            <span className="text-xs font-bold text-secondary">{formatBRL(totalFilteredCost)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/30">
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Timestamp</th>
                            {isSuperadmin && (
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Origem</th>
                            )}
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Modelo</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contexto</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tokens</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Custo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map((record) => {
                            const cost = calculateCostBRL(record.model, record.total_tokens);
                            return (
                                <tr key={record.id} className="hover:bg-muted/50 transition-colors group">
                                    <td className="px-6 py-4 text-sm text-muted-foreground font-medium whitespace-nowrap">
                                        {formatDate(record.created_at)}
                                    </td>
                                    {isSuperadmin && (
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-foreground">
                                                {record.tenants?.name || 'Sistema'}
                                            </span>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight uppercase bg-muted text-muted-foreground border border-border">
                                            {record.model}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-muted-foreground font-medium">
                                            {getContextLabel(record.feature_context)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm tabular-nums font-medium text-muted-foreground">
                                            {record.total_tokens?.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm tabular-nums font-bold text-foreground">
                                            {formatBRL(cost)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {filtered.length === 0 && (
                <div className="p-20 text-center space-y-2">
                    <p className="text-foreground font-semibold uppercase tracking-widest text-[10px]">Silêncio Neural</p>
                    <p className="text-muted-foreground text-sm">
                        {records.length > 0 
                            ? 'Nenhum registro corresponde aos filtros selecionados.' 
                            : 'Nenhuma atividade de IA registrada no momento.'
                        }
                    </p>
                </div>
            )}
        </div>
    );
}
