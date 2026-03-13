'use client'

import { useState, useEffect } from 'react';
import { Check, CreditCard, Crown, Loader2, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { getStripePortalUrl } from '@/app/_actions/plan';
import { useSearchParams } from 'next/navigation';

interface Plan {
    key: string;
    name: string;
    price: string;
    period: string;
    description: string;
    color: string;
    icon: React.ReactNode;
    features: string[];
    aiFeatures: string[];
    cta: string;
    highlighted: boolean;
}

interface SubscriptionClientProps {
    currentPlan: string;
    limits: any;
    aiUsageCount: number;
    aiRequestsLimit: number;
}

const plans: Plan[] = [
    {
        key: 'freemium',
        name: 'Freemium',
        price: 'Grátis',
        period: '',
        description: 'Para começar e explorar o CRM LAX',
        color: 'border-border',
        icon: <Zap className="h-5 w-5 text-amber-500" />,
        features: ['20 leads/mês', '10 imóveis', '1 usuário', 'Kanban de Leads', 'Relatórios básicos'],
        aiFeatures: [],
        cta: 'Plano atual',
        highlighted: false,
    },
    {
        key: 'starter',
        name: 'Starter',
        price: 'R$ 97',
        period: '/mês',
        description: 'Para corretores em crescimento',
        color: 'border-[#404F4F]/30',
        icon: <Sparkles className="h-5 w-5 text-blue-500" />,
        features: ['200 leads/mês', '100 imóveis', '5 usuários', 'WhatsApp (Evolution)', 'Site Vitrine (subdomínio)', 'Relatórios avançados'],
        aiFeatures: [],
        cta: 'Assinar Starter',
        highlighted: false,
    },
    {
        key: 'pro',
        name: 'Pro',
        price: 'R$ 247',
        period: '/mês',
        description: 'Para imobiliárias que querem vender mais',
        color: 'border-[#FFE600]',
        icon: <Crown className="h-5 w-5 text-[#FFE600]" />,
        features: ['Leads ilimitados', 'Imóveis ilimitados', 'Usuários ilimitados', 'WhatsApp (Evolution)', 'Domínio próprio', 'Relatórios avançados'],
        aiFeatures: ['IA: Análise de Probabilidade de Fechamento', 'IA: Matchmaking Lead ↔ Imóvel', 'IA: Insights Inteligentes de Relatórios', 'IA: Geração de Copy de Anúncios', '500 requisições de IA/mês'],
        cta: 'Assinar Pro',
        highlighted: true,
    },
];

export default function SubscriptionClient({ currentPlan, aiUsageCount, aiRequestsLimit }: SubscriptionClientProps) {
    const [selectedPlan, setSelectedPlan] = useState<string>(currentPlan);
    const [isSubscribing, setIsSubscribing] = useState<string | null>(null);
    const [isPortaling, setIsPortaling] = useState(false);
    const searchParams = useSearchParams();
    const aiUsagePercent = aiRequestsLimit > 0 ? Math.min((aiUsageCount / aiRequestsLimit) * 100, 100) : 0;
    const currentPlanData = plans.find(p => p.key === currentPlan) || plans[0];

    useEffect(() => {
        if (searchParams.get('success')) {
            toast.success('Assinatura realizada com sucesso! Suas funções serão liberadas em instantes.');
        }
        if (searchParams.get('canceled')) {
            toast.error('O processo de assinatura foi cancelado.');
        }
    }, [searchParams]);

    const handleSubscribe = async (planKey: string) => {
        if (planKey === currentPlan || planKey === 'freemium') return;

        setIsSubscribing(planKey);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ planId: planKey }),
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error(data.error || 'Erro ao iniciar checkout');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Erro de conexão ao iniciar checkout');
        } finally {
            setIsSubscribing(null);
        }
    };

    const handlePortal = async () => {
        setIsPortaling(true);
        try {
            const result = await getStripePortalUrl();
            if (result.url) {
                window.location.href = result.url;
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error('Erro ao acessar portal de faturamento');
        } finally {
            setIsPortaling(false);
        }
    };

    return (
        <div className="bg-card -m-4 md:-m-8 p-4 md:p-8 min-h-screen">
            <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Gerencie seu plano e acompanhe o uso de IA.</p>
                </div>
                {currentPlan !== 'freemium' && (
                    <button
                        onClick={handlePortal}
                        disabled={isPortaling}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-bold text-foreground hover:bg-muted transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {isPortaling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <CreditCard size={16} />
                                Gerenciar Faturamento
                            </>
                        )}
                    </button>
                )}
                <div className="h-px bg-foreground/25 w-full md:hidden mt-2 mb-6" />
            </div>


            {/* Cards de Planos */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mt-4 md:mt-10">
                {plans.map((plan) => {
                    const isCurrent = plan.key === currentPlan;
                    return (
                        <div
                            key={plan.key}
                            onClick={() => {
                                setSelectedPlan(plan.key);
                            }}
                            className={`relative flex flex-col rounded-2xl border-2 bg-background p-6 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                                plan.key === selectedPlan 
                                    ? 'border-[#FFE600] shadow-lg shadow-[#FFE600]/10' 
                                    : 'border-border'
                            } ${isCurrent ? 'ring-2 ring-primary/30 !cursor-default !hover:translate-y-0 !hover:shadow-none' : ''}`}
                        >
                            {plan.highlighted && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#FFE600] px-4 py-0.5 text-xs font-bold text-black">
                                    Mais Popular
                                </div>
                            )}
                            {isCurrent && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#00B087] px-3 py-0.5 text-xs font-bold text-black shadow-sm">
                                    Seu Plano
                                </div>
                            )}

                            <div className="mb-4 flex items-center gap-2">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${plan.highlighted ? 'bg-[#FFE600]/20' : 'bg-muted'}`}>
                                    {plan.icon}
                                </div>
                                <div>
                                    <p className="font-bold text-foreground">{plan.name}</p>
                                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                                <span className="text-sm text-muted-foreground">{plan.period}</span>
                            </div>

                            <ul className="mb-4 flex-1 space-y-2.5">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00B087]" />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {plan.aiFeatures.length > 0 && (
                                <div className="mb-4 rounded-xl bg-[#FFE600]/10 p-3 space-y-2">
                                    <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                        <Sparkles className="h-3.5 w-3.5" /> Inteligência Artificial
                                    </p>
                                    {plan.aiFeatures.map((f) => (
                                        <p key={f} className="flex items-start gap-2 text-xs text-foreground/80">
                                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFE600]" />
                                            {f.replace('IA: ', '')}
                                        </p>
                                    ))}
                                </div>
                            )}

                             {isCurrent ? (
                                <div className="rounded-lg bg-[#00B087] py-2.5 text-center text-sm font-bold text-black shadow-lg shadow-[#00B087]/20">
                                    Plano Atual
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSubscribe(plan.key);
                                    }}
                                    disabled={!!isSubscribing}
                                    className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-center text-sm font-bold transition-all active:scale-[0.99] disabled:opacity-50 ${
                                        plan.key === selectedPlan 
                                            ? 'bg-[#FFE600] text-black hover:bg-[#F2DB00]' 
                                            : 'border border-border text-foreground hover:bg-[#404F4F]/5'
                                    }`}
                                >
                                    {isSubscribing === plan.key ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        plan.cta
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <p className="text-center text-xs text-muted-foreground">
                Para upgrades ou dúvidas, entre em contato: <a href="mailto:contato@laxperience.online" className="font-semibold text-foreground hover:underline">contato@laxperience.online</a>
            </p>
            </div>
        </div>
    );
}
