'use client';

import { useState, useEffect } from 'react';
import { 
    getIntegration, 
    updateIntegrationStatus 
} from '@/app/_actions/integrations';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/Switch';
import { Newspaper, ExternalLink, RefreshCw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsItem {
    id: string;
    title: string;
    source: string;
    date: string;
    url: string;
}

const mockNews: NewsItem[] = [
    { 
        id: '1', 
        title: 'Mercado imobiliário prevê crescimento de 5% no primeiro semestre de 2026', 
        source: 'Exame Imóveis', 
        date: 'Há 2 horas',
        url: '#' 
    },
    { 
        id: '2', 
        title: 'Novas regras para financiamento da Caixa entram em vigor este mês', 
        source: 'Valor Econômico', 
        date: 'Há 5 horas',
        url: '#' 
    },
    { 
        id: '3', 
        title: 'Tendências de design: O que os compradores de luxo buscam atualmente', 
        source: 'Portal do Corretor', 
        date: 'Há 1 dia',
        url: '#' 
    },
];

export function NewsFeedCard({ tenantId }: { tenantId?: string }) {
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (tenantId) {
            getIntegration('news_feed').then(({ data }) => setIsActive(data?.status === 'active'));
        }
    }, [tenantId]);

    const handleToggle = async (checked: boolean) => {
        setLoading(true);
        const { error } = await updateIntegrationStatus('news_feed', checked ? 'active' : 'inactive');
        if (error) {
            toast.error('Erro ao atualizar: ' + error);
        } else {
            setIsActive(checked);
            toast.success('Status atualizado!');
        }
        setLoading(false);
    };

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col transition-all hover:bg-muted/5">
            <div 
                className="px-6 py-4 border-b border-border bg-muted/30 cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                            <Newspaper size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-foreground">Notícias do Setor</h3>
                                <span className={`flex h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            </div>
                            <p className="text-xs text-muted-foreground max-w-xl line-clamp-1">
                                {isExpanded 
                                    ? 'Acompanhe as notícias mais relevantes do mercado em tempo real.' 
                                    : 'Confira as últimas novidades e tendências do mercado imobiliário.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleToggle(!isActive)}>
                            <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${isActive ? 'text-emerald-500' : 'text-muted-foreground/60'}`}>
                                {isActive ? 'Ativo' : 'Desativado'}
                            </span>
                            <Switch 
                                checked={isActive} 
                                onChange={handleToggle}
                                disabled={loading}
                                className="scale-75"
                            />
                        </div>

                        <div className="h-6 w-px bg-border hidden sm:block" />

                        <button 
                            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ChevronDown size={20} />
                            </motion.div>
                        </button>
                    </div>
                </div>
            </div> 

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="p-2 border-t border-border/50">
                            <div className="space-y-1">
                                {mockNews.map((news) => (
                                    <a 
                                        key={news.id} 
                                        href={news.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-start gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-foreground group-hover:text-secondary transition-colors leading-snug mb-1">
                                                {news.title}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider">{news.source}</span>
                                                <span className="text-[10px] text-muted-foreground/60">•</span>
                                                <span className="text-[11px] text-muted-foreground/60">{news.date}</span>
                                            </div>
                                        </div>
                                        <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                                    </a>
                                ))}
                            </div>
                            
                            <div className="p-4 pt-2">
                                <button className="w-full py-2 bg-muted/20 border border-border/50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
                                    <RefreshCw size={14} />
                                    Mais Notícias
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
