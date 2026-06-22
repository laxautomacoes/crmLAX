import { useState, useEffect } from 'react';
import { 
    ExternalLink, 
    Settings2, 
    ShieldCheck 
} from 'lucide-react';
import { StripeIcon, CheckoutIcon } from '@/components/icons/BrandIcons';
import { Switch } from '@/components/ui/Switch';
import { 
    getIntegration, 
    updateIntegrationStatus 
} from '@/app/_actions/integrations';
import { toast } from 'sonner';
import { Modal } from '@/components/shared/Modal';

export function GatewayCard({ 
    tenantId, 
    provider = 'stripe' 
}: { 
    tenantId?: string;
    provider?: 'stripe' | 'checkout_lax';
}) {
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (tenantId) {
            getIntegration(provider).then(({ data }) => setIsActive(data?.status === 'active'));
        }
    }, [tenantId, provider]);

    const handleToggle = async (checked: boolean) => {
        setLoading(true);
        const { error } = await updateIntegrationStatus(provider, checked ? 'active' : 'inactive');
        if (error) {
            toast.error('Erro ao atualizar: ' + error);
        } else {
            setIsActive(checked);
            toast.success('Status atualizado!');
        }
        setLoading(false);
    };

    const isStripe = provider === 'stripe';
    const title = isStripe ? 'Pagamentos (Stripe)' : 'Checkout LAX';
    const description = isStripe 
        ? 'Processamento oficial de cartões e recorrência.' 
        : 'Página de checkout otimizada para conversão.';
    
    const Icon = isStripe ? StripeIcon : CheckoutIcon;
    const iconColor = isStripe ? 'bg-[#635BFF]/10 text-[#635BFF]' : 'bg-secondary/10 text-secondary';

    return (
        <>
            <div 
                className="bg-card rounded-xl border border-border overflow-hidden transition-all hover:bg-muted/5 cursor-pointer select-none"
                onClick={() => setIsModalOpen(true)}
            >
                <div className="p-5 bg-muted/30 flex flex-col gap-3">
                    <div className="flex items-start justify-between mb-1">
                        <div className={`p-2.5 rounded-xl ${iconColor} w-fit`}>
                            <Icon size={22} />
                        </div>
                        <span className={`flex h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-foreground line-clamp-1">{title}</h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                size="md"
                title={
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${iconColor}`}>
                            <Icon size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground">Configurar {title}</h3>
                            <p className="text-xs text-muted-foreground">{description}</p>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6 py-2">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                        <div>
                            <span className="text-xs font-bold text-foreground">Status da Integração</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Ative ou desative esta integração.</p>
                        </div>
                        <Switch 
                            checked={isActive} 
                            onChange={handleToggle}
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {isStripe ? (
                            <>
                                <button className="flex items-center justify-center gap-3 p-4 bg-muted/20 border border-border rounded-xl hover:bg-muted/30 hover:border-secondary/30 transition-all group overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Settings2 size={18} className="text-muted-foreground group-hover:text-secondary transition-colors" />
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-foreground">Configurar Stripe</div>
                                        <div className="text-[10px] text-muted-foreground">Chaves e Webhooks</div>
                                    </div>
                                </button>
                                <a 
                                    href="https://dashboard.stripe.com" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center justify-center gap-3 p-4 bg-muted/20 border border-border rounded-xl hover:bg-muted/30 hover:border-secondary/30 transition-all group overflow-hidden relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <ExternalLink size={18} className="text-muted-foreground group-hover:text-secondary transition-colors" />
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-foreground">Acessar Dashboard</div>
                                        <div className="text-[10px] text-muted-foreground">Ir para stripe.com</div>
                                    </div>
                                </a>
                            </>
                        ) : (
                            <>
                                <button className="flex items-center justify-center gap-3 p-4 bg-muted/20 border border-border rounded-xl hover:bg-muted/30 hover:border-secondary/30 transition-all group overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <ExternalLink size={18} className="text-muted-foreground group-hover:text-secondary transition-colors" />
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-foreground">Visualizar Checkout</div>
                                        <div className="text-[10px] text-muted-foreground">Ver página de pagamento</div>
                                    </div>
                                </button>
                                <button className="flex items-center justify-center gap-3 p-4 bg-muted/20 border border-border rounded-xl hover:bg-muted/30 hover:border-secondary/30 transition-all group overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Settings2 size={18} className="text-muted-foreground group-hover:text-secondary transition-colors" />
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-foreground">Personalizar</div>
                                        <div className="text-[10px] text-muted-foreground">Cores e Layout</div>
                                    </div>
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2 justify-center pt-4 border-t border-border/50">
                        <ShieldCheck size={14} className="text-emerald-500 opacity-60" />
                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Transações seguras SSL 256-bit</span>
                    </div>
                </div>
            </Modal>
        </>
    );
}
