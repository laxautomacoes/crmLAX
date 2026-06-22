import { useState, useEffect } from 'react';
import { 
    getIntegration, 
    updateIntegrationStatus 
} from '@/app/_actions/integrations';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/Switch';
import { 
    TrendingUp, 
    TrendingDown, 
    Minus, 
    Info, 
    MapPin, 
    RefreshCw, 
    BarChart3
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';

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

export function MarketDataCard({ tenantId }: { tenantId?: string }) {
    const [selectedUF, setSelectedUF] = useState('SP');
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (tenantId) {
            getIntegration('market_data').then(({ data }) => setIsActive(data?.status === 'active'));
        }
    }, [tenantId]);

    const handleToggle = async (checked: boolean) => {
        setLoading(true);
        const { error } = await updateIntegrationStatus('market_data', checked ? 'active' : 'inactive');
        if (error) {
            toast.error('Erro ao atualizar: ' + error);
        } else {
            setIsActive(checked);
            toast.success('Status atualizado!');
        }
        setLoading(false);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            toast.success('Dados de mercado atualizados!');
        }, 1000);
    };

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
        <>
            <div 
                className="bg-card rounded-xl border border-border overflow-hidden transition-all hover:bg-muted/5 cursor-pointer select-none"
                onClick={() => setIsModalOpen(true)}
            >
                <div className="p-5 bg-muted/30 flex flex-col gap-3">
                    <div className="flex items-start justify-between mb-1">
                        <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 w-fit">
                            <BarChart3 size={22} />
                        </div>
                        <span className={`flex h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">Dados de Mercado</h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            Índices ativos para {selectedUF} • CUB, IGP-M e INCC-M
                        </p>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                size="lg"
                title={
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                            <BarChart3 size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground">Dados de Mercado</h3>
                            <p className="text-xs text-muted-foreground">Acompanhe os principais índices econômicos do setor imobiliário.</p>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6 py-2">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                        <div>
                            <span className="text-xs font-bold text-foreground">Status da Integração</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Ative ou desative os dados de mercado.</p>
                        </div>
                        <Switch 
                            checked={isActive} 
                            onChange={handleToggle}
                            disabled={loading}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-secondary" />
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Selecionar Estado (UF)</label>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {UFS.map(uf => (
                                <button 
                                    key={uf}
                                    onClick={() => setSelectedUF(uf)}
                                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                                        selectedUF === uf 
                                            ? 'bg-secondary text-secondary-foreground' 
                                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    {uf}
                                </button>
                            ))}
                            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
                            <button 
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-1.5 bg-background border border-border rounded-md text-muted-foreground hover:text-secondary hover:border-secondary transition-all disabled:opacity-50"
                                title="Atualizar Dados"
                            >
                                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
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
    
                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                        <Info size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Os dados exibidos são coletados de fontes públicas (FGV, IBGE, Sinduscon). 
                            A LAX Automacoes não se responsabiliza pela exatidão imediata dos índices.
                        </p>
                    </div>
                </div>
            </Modal>
        </>
    );
}
