'use client';
 
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/Switch';
import { getIntegration, updateIntegrationStatus } from '@/app/_actions/integrations';
import { toast } from 'sonner';
 
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
        <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Notícias do Setor</h3>
                        <p className="text-sm text-muted-foreground">Fique por dentro das novidades do mercado imobiliário.</p>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                        <Switch 
                            checked={isActive} 
                            onChange={handleToggle}
                            disabled={loading}
                            className="scale-90"
                        />
                        <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:block ${isActive ? 'text-emerald-500' : 'text-muted-foreground/60'}`}>
                            {isActive ? 'Ativo' : 'Desativado'}
                        </span>
                    </div>
                </div>
            </div>
 
            <div className="flex-1 overflow-auto p-2">
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
            </div>
 
            <div className="p-4 border-t border-border/50 bg-muted/10">
                <button className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw size={14} />
                    Ver mais notícias
                </button>
            </div>
        </div>
    );
}
