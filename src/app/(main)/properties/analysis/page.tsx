'use client';

import { useState } from 'react';
import { LocationFilters } from '@/components/properties/analysis/LocationFilters';
import { AnalysisResults } from '@/components/properties/analysis/AnalysisResults';
import { analyzeMarketValue, MarketAnalysisResult } from '@/app/_actions/market-analysis';
import { toast } from 'sonner';
import { Info, BarChart3, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnalysisPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<MarketAnalysisResult | null>(null);
    const [lastQuery, setLastQuery] = useState<{ uf: string; city: string; neighborhood: string } | null>(null);

    const handleSearch = async (filters: { uf: string; city: string; neighborhood: string }) => {
        setLoading(true);
        setResult(null);
        setLastQuery(filters);

        try {
            const response = await analyzeMarketValue(filters.uf, filters.city, filters.neighborhood);
            
            if (response.success && response.data) {
                setResult(response.data);
                toast.success('Análise concluída com sucesso!');
            } else {
                toast.error(response.error || 'Falha ao processar análise.');
            }
        } catch (error) {
            toast.error('Ocorreu um erro inesperado.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                            <BarChart3 size={20} />
                        </div>
                        <span className="text-xs font-black text-secondary uppercase tracking-widest">Inteligência de Mercado</span>
                    </div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">
                        Análise de Valor de m²
                    </h1>
                    <p className="text-muted-foreground mt-1 max-w-xl">
                        Consulte o valor médio do metro quadrado baseado em ofertas reais da internet para uma região específica.
                    </p>
                </div>
            </div>

            {/* Filters Section */}
            <LocationFilters onSearch={handleSearch} loading={loading} />

            {/* Content Section */}
            <div className="min-h-[400px] relative">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20 bg-card/30 rounded-3xl border border-dashed border-border"
                        >
                            <div className="relative mb-6">
                                <Search size={48} className="text-secondary/20 animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={24} className="text-secondary animate-bounce" />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-foreground">Escaneando o Mercado...</h3>
                            <p className="text-sm text-muted-foreground mt-1 text-center max-w-xs px-4">
                                Buscando imóveis em {lastQuery?.neighborhood}, {lastQuery?.city} e extraindo padrões de preços com IA.
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
                    ) : result ? (
                        <AnalysisResults key="results" data={result} />
                    ) : (
                        <motion.div 
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-24 bg-muted/10 rounded-3xl border border-dashed border-border"
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

            {/* Footer / Info */}
            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
                <Info size={16} className="text-secondary mt-0.5 shrink-0" />
                <div className="space-y-1">
                    <p className="text-xs text-foreground font-bold leading-relaxed">Sobre esta análise</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Os dados são obtidos via pesquisa web aberta em tempo real e processador por inteligência artificial (Gemini 2.0 Flash). 
                        Os valores apresentados são estimativas baseadas em ofertas atuais e podem variar conforme o estado de conservação e acabamento de cada imóvel.
                    </p>
                </div>
            </div>
        </div>
    );
}
