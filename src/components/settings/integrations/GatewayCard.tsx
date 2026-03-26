'use client';

import { useState, useEffect } from 'react';
import { 
    CreditCard, 
    ExternalLink, 
    Settings2, 
    ShieldCheck, 
    ChevronDown 
} from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { 
    getIntegration, 
    updateIntegrationStatus 
} from '@/app/_actions/integrations';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export function GatewayCard({ 
    tenantId, 
    provider = 'stripe' 
}: { 
    tenantId?: string;
    provider?: 'stripe' | 'checkout_lax';
}) {
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

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
    
    const Icon = isStripe ? CreditCard : ShieldCheck;
    const iconColor = isStripe ? 'bg-[#635BFF]/10 text-[#635BFF]' : 'bg-secondary/10 text-secondary';

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden transition-all hover:bg-muted/5">
            <div 
                className="px-6 py-4 border-b border-border bg-muted/30 cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${iconColor}`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-foreground">{title}</h3>
                                <span className={`flex h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-xl">
                                {description}
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
                        <div className="p-6 space-y-6 border-t border-border/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                            <div className="flex items-center gap-2 justify-center pt-2 border-t border-border/50">
                                <ShieldCheck size={14} className="text-emerald-500 opacity-60" />
                                <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Transações seguras SSL 256-bit</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
