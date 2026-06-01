'use client';

import { useState } from 'react';
import { LocationFilters, NEIGHBORHOOD_COLORS } from '@/components/properties/analysis/LocationFilters';
import { AnalysisResults, ComparisonEntry } from '@/components/properties/analysis/AnalysisResults';
import { AnalysisHistory } from '@/components/properties/analysis/AnalysisHistory';
import { analyzeMarketValue, MarketAnalysisResult, SearchFilters } from '@/app/_actions/market-analysis';
import { saveMarketAnalysisHistory } from '@/app/_actions/market-analysis-history';
import { toast } from 'sonner';
import { Info, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/shared/PageHeader';

interface MultiSearchFilters {
    uf: string;
    city: string;
    neighborhoods: string[];
    propertyType?: string;
    bedrooms?: string;
    priceMin?: string;
    priceMax?: string;
}

export default function AnalysisPage() {
    const [loading, setLoading] = useState(false);
    const [entries, setEntries] = useState<ComparisonEntry[]>([]);
    const [lastQuery, setLastQuery] = useState<MultiSearchFilters | null>(null);

    const handleSearch = async (filters: MultiSearchFilters) => {
        setLoading(true);
        setEntries([]);
        setLastQuery(filters);

        try {
            // Disparar chamadas paralelas para cada bairro
            const promises = filters.neighborhoods.map(neighborhood => 
                analyzeMarketValue({
                    uf: filters.uf,
                    city: filters.city,
                    neighborhood,
                    propertyType: filters.propertyType,
                    bedrooms: filters.bedrooms,
                    priceMin: filters.priceMin,
                    priceMax: filters.priceMax,
                } as SearchFilters)
            );

            const results = await Promise.allSettled(promises);
            
            const successEntries: ComparisonEntry[] = [];
            const errors: string[] = [];

            results.forEach((result, index) => {
                const neighborhood = filters.neighborhoods[index];
                if (result.status === 'fulfilled' && result.value.success && result.value.data) {
                    successEntries.push({
                        data: result.value.data,
                        neighborhood,
                        color: NEIGHBORHOOD_COLORS[index].color,
                    });
                } else {
                    const errorMsg = result.status === 'fulfilled' 
                        ? result.value.error 
                        : 'Erro inesperado';
                    errors.push(`${neighborhood}: ${errorMsg}`);
                }
            });

            if (successEntries.length > 0) {
                setEntries(successEntries);

                // Salvar no histórico (fire-and-forget)
                const historyStatus = errors.length > 0 ? 'partial' as const : 'completed' as const;
                saveMarketAnalysisHistory({
                    uf: filters.uf,
                    city: filters.city,
                    neighborhoods: filters.neighborhoods,
                    propertyType: filters.propertyType,
                    bedrooms: filters.bedrooms,
                    priceMin: filters.priceMin,
                    priceMax: filters.priceMax,
                    results: successEntries.map(e => ({ neighborhood: e.neighborhood, data: e.data })),
                    status: historyStatus,
                }).catch(console.error);

                if (errors.length > 0) {
                    toast.warning(`Análise parcial. Falha em: ${errors.join('; ')}`);
                } else {
                    toast.success(
                        successEntries.length === 1 
                            ? 'Análise concluída com sucesso!' 
                            : `Comparação de ${successEntries.length} bairros concluída!`
                    );
                }
            } else {
                // Salvar falha no histórico
                saveMarketAnalysisHistory({
                    uf: filters.uf,
                    city: filters.city,
                    neighborhoods: filters.neighborhoods,
                    propertyType: filters.propertyType,
                    bedrooms: filters.bedrooms,
                    priceMin: filters.priceMin,
                    priceMax: filters.priceMax,
                    results: [],
                    status: 'failed',
                }).catch(console.error);

                toast.error(`Falha em todos os bairros: ${errors.join('; ')}`);
            }
        } catch (error) {
            toast.error('Ocorreu um erro inesperado.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Carregar resultados do histórico
    const handleLoadFromHistory = (results: any[]) => {
        const restored: ComparisonEntry[] = results.map((entry: any, idx: number) => ({
            data: entry.data,
            neighborhood: entry.neighborhood,
            color: NEIGHBORHOOD_COLORS[idx]?.color || 'var(--border)',
        }));
        setEntries(restored);
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header Section */}
            <PageHeader 
                title="Análise de Valor de m²"
                subtitle="Consulte o valor médio do metro quadrado baseado em ofertas reais da internet para uma região específica."
            />

            {/* Filters + Resultados + Histórico (tudo dentro do card) */}
            <LocationFilters onSearch={handleSearch} loading={loading}>
                {/* Content Section */}
                <div className="relative">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div 
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-20 bg-background rounded-xl border border-border"
                            >
                                <div className="relative mb-6">
                                    <Search size={48} className="text-secondary/20 animate-pulse" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Sparkles size={24} className="text-secondary animate-bounce" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-foreground">Escaneando o Mercado...</h3>
                                <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm px-4">
                                    {lastQuery && lastQuery.neighborhoods.length > 1 
                                        ? `Comparando ${lastQuery.neighborhoods.join(', ')} em ${lastQuery.city} com IA.`
                                        : `Buscando imóveis em ${lastQuery?.neighborhoods[0]}, ${lastQuery?.city} e extraindo padrões de preços com IA.`
                                    }
                                </p>
                                <div className="mt-8 flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                            className="h-2 w-2 rounded-full bg-secondary"
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        ) : entries.length > 0 ? (
                            <AnalysisResults key="results" entries={entries} />
                        ) : (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex flex-col items-center justify-center py-16 bg-background rounded-xl border border-border"
                            >
                                <div className="p-4 rounded-full bg-muted/20 text-muted-foreground mb-4">
                                    <Search size={32} />
                                </div>
                                <h3 className="text-base font-bold text-muted-foreground">Pronto para iniciar a consulta</h3>
                                <p className="text-xs text-muted-foreground/60 mt-1">Preencha os filtros acima para analisar uma região.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Histórico de Pesquisas */}
                <AnalysisHistory onLoadResults={handleLoadFromHistory} />
            </LocationFilters>

            {/* Footer / Info */}
            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                <Info size={16} className="text-secondary mt-0.5 shrink-0" />
                <div className="space-y-1">
                    <p className="text-xs text-foreground font-bold leading-relaxed">Sobre esta análise</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Os dados são obtidos via pesquisa web aberta em tempo real e processados por inteligência artificial. 
                        Os valores apresentados são estimativas baseadas em ofertas atuais.
                    </p>
                </div>
            </div>
        </div>
    );
}
