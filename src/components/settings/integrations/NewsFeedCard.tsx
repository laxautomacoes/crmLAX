import { useState, useEffect } from 'react';
import { 
    getIntegration, 
    updateIntegrationStatus 
} from '@/app/_actions/integrations';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/Switch';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';

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
    const [isModalOpen, setIsModalOpen] = useState(false);

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
        <>
            <div 
                className="bg-card rounded-xl border border-border overflow-hidden flex flex-col transition-all hover:bg-muted/5 cursor-pointer select-none"
                onClick={() => setIsModalOpen(true)}
            >
                <div className="px-6 py-6 bg-muted/30">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                <Newspaper size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-foreground">Notícias do Setor</h3>
                                    <span className={`flex h-2 w-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                </div>
                                <p className="text-xs text-muted-foreground max-w-xl line-clamp-1">
                                    Confira as últimas novidades e tendências do mercado imobiliário.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div> 

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                size="lg"
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                            <Newspaper size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground">Notícias do Setor</h3>
                            <p className="text-xs text-muted-foreground">Acompanhe as notícias mais relevantes do mercado em tempo real.</p>
                        </div>
                    </div>
                }
            >
                <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                        <div>
                            <span className="text-xs font-bold text-foreground">Status da Integração</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Ative ou desative as notícias do setor.</p>
                        </div>
                        <Switch 
                            checked={isActive} 
                            onChange={handleToggle}
                            disabled={loading}
                        />
                    </div>

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
                    
                    <div className="pt-2 border-t border-border/50">
                        <button className="w-full py-2.5 bg-muted/20 border border-border/50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
                            <RefreshCw size={14} />
                            Mais Notícias
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
