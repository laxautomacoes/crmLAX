'use client'

import { useState, useEffect } from 'react';
import { Check, CreditCard, Crown, Loader2, Settings2, Sparkles, Zap, AlertTriangle, ArrowUpRight, ArrowDownRight, MessageCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { getStripePortalUrl, type PlanConfigInput } from '@/app/_actions/plan';
import { useSearchParams } from 'next/navigation';
import PlanCardAdmin from './PlanCardAdmin';
import PlanCardSuperadmin from './PlanCardSuperadmin';
import { updatePlansOrderAction } from '@/app/_actions/plan';
import { PageHeader } from '@/components/shared/PageHeader';
import { PlanItem } from './subscription/PlanItem';
import { SortableItem } from './subscription/SortableItem';

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    rectSortingStrategy,
} from '@dnd-kit/sortable';

const PLAN_ORDER = ['starter', 'pro', 'business', 'enterprise'];
const CRMLAX_WHATSAPP = '5548988231720';

interface SubscriptionClientProps {
    currentPlan: string;
    limits: any;
    aiUsageCount: number;
    aiRequestsLimit: number;
    userRole: string;
    allPlanLimits: any[];
}

import { useRouter } from 'next/navigation';

export default function SubscriptionClient({ currentPlan, aiUsageCount, aiRequestsLimit, userRole, allPlanLimits: initialPlanLimits }: SubscriptionClientProps) {
    const isSuperadmin = userRole === 'superadmin';
    const router = useRouter();
    const [allPlanLimits, setAllPlanLimits] = useState(initialPlanLimits);
    const [selectedPlan, setSelectedPlan] = useState<string>(currentPlan);
    const [isSubscribing, setIsSubscribing] = useState<string | null>(null);
    const [isPortaling, setIsPortaling] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingPlan, setPendingPlan] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const aiUsagePercent = aiRequestsLimit > 0 ? Math.min((aiUsageCount / aiRequestsLimit) * 100, 100) : 0;

    useEffect(() => {
        if (searchParams.get('success')) {
            toast.success('Assinatura realizada com sucesso! Suas funções serão liberadas em instantes.');
        }
        if (searchParams.get('canceled')) {
            toast.error('O processo de assinatura foi cancelado.');
        }
    }, [searchParams]);

    const isUpgrade = (targetPlan: string) => {
        return PLAN_ORDER.indexOf(targetPlan) > PLAN_ORDER.indexOf(currentPlan);
    };

    const getPlanDisplayName = (planKey: string) => {
        const plan = allPlanLimits.find((p: any) => p.plan_type === planKey);
        return plan?.display_name || planKey.charAt(0).toUpperCase() + planKey.slice(1);
    };

    const getPlanPrice = (planKey: string) => {
        const plan = allPlanLimits.find((p: any) => p.plan_type === planKey);
        return plan?.price_text || '';
    };

    const handleSubscribeClick = (planKey: string) => {
        if (planKey === currentPlan) return;
        setPendingPlan(planKey);
        setShowConfirmModal(true);
    };

    const handleConfirmChange = async () => {
        if (!pendingPlan) return;
        setShowConfirmModal(false);
        setIsSubscribing(pendingPlan);

        try {
            const response = await fetch('/api/checkout/abacatepay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ planId: pendingPlan }),
            });

            const data = await response.json();
            if (data.url) {
                window.open(data.url, '_blank');
            } else {
                toast.error(data.error || 'Erro ao iniciar checkout');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Erro de conexão ao iniciar checkout');
        } finally {
            setIsSubscribing(null);
            setPendingPlan(null);
        }
    };

    const handleCancelSubscription = () => {
        const message = encodeURIComponent(
            `Olá! Sou cliente do CRM LAX (plano ${getPlanDisplayName(currentPlan)}) e gostaria de solicitar o cancelamento da minha assinatura.`
        );
        window.open(`https://wa.me/${CRMLAX_WHATSAPP}?text=${message}`, '_blank');
    };

    const handlePortal = async () => {
        setIsPortaling(true);
        try {
            const result = await getStripePortalUrl();
            if (result.url) {
                window.open(result.url, '_blank');
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error('Erro ao acessar portal de faturamento');
        } finally {
            setIsPortaling(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = allPlanLimits.findIndex((p: any) => p.plan_type === active.id);
        const newIndex = allPlanLimits.findIndex((p: any) => p.plan_type === over.id);

        const newOrder = arrayMove(allPlanLimits, oldIndex, newIndex);
        setAllPlanLimits(newOrder);

        const orderData = newOrder.map((p: any, index: number) => ({
            plan_type: p.plan_type,
            display_order: index + 1,
        }));

        const result = await updatePlansOrderAction(orderData);
        if (result.error) {
            toast.error('Erro ao salvar nova ordem: ' + result.error);
            setAllPlanLimits(allPlanLimits);
        } else {
            router.refresh();
        }
    };

    return (
        <div className="bg-card -m-4 md:-m-8 p-4 md:p-8 min-h-screen">
            <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <PageHeader 
                title="Assinatura"
                subtitle={isSuperadmin ? 'Edite os planos exibidos para seus clientes.' : 'Gerencie seu plano e acompanhe o uso de IA.'}
            >
                <div className="flex items-center gap-3">
                    {isSuperadmin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#404F4F] px-2.5 py-0.5 text-xs font-bold text-white">
                            <Settings2 className="h-3 w-3" /> Modo Editor
                        </span>
                    )}
                    {!isSuperadmin && (
                        <div className="flex items-center gap-2">
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
                            <button
                                onClick={handleCancelSubscription}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-card border border-red-500/30 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all active:scale-[0.98]"
                            >
                                <MessageCircle size={14} />
                                Cancelar Assinatura
                            </button>
                        </div>
                    )}
                </div>
            </PageHeader>

            <hr className="hidden md:block border-border" />

            {/* Cards de Planos */}
            <div className="mt-4 md:mt-10">
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={allPlanLimits.map((p: any) => p.plan_type)}
                        strategy={rectSortingStrategy}
                        disabled={!isSuperadmin}
                    >
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                            {allPlanLimits.map((planLimit: any) => (
                                <SortableItem 
                                    key={planLimit.plan_type} 
                                    id={planLimit.plan_type}
                                    disabled={!isSuperadmin}
                                >
                                    <PlanItem 
                                        planLimit={planLimit}
                                        currentPlan={currentPlan}
                                        isSuperadmin={isSuperadmin}
                                        selectedPlan={selectedPlan}
                                        isSubscribing={isSubscribing}
                                        setSelectedPlan={setSelectedPlan}
                                        handleSubscribe={handleSubscribeClick}
                                        router={router}
                                    />
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {!isSuperadmin && (
                <div className="rounded-xl border border-border/50 bg-background p-5 space-y-3">
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-[#FFE600]" />
                        Como funciona a troca de plano
                    </p>
                    <div className="space-y-2.5 text-xs text-muted-foreground">
                        <div className="flex items-start gap-2">
                            <ArrowUpRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-400" />
                            <p><strong className="text-foreground">Upgrade:</strong> Sua assinatura atual é cancelada e uma nova é criada com o plano superior. As novas funcionalidades são liberadas imediatamente.</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <ArrowDownRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-orange-400" />
                            <p><strong className="text-foreground">Downgrade:</strong> Sua assinatura atual é cancelada imediatamente. Os dias restantes do plano atual não são reembolsados.</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Dúvidas? Entre em contato: <a href={`https://wa.me/${CRMLAX_WHATSAPP}`} target="_blank" className="font-semibold text-foreground hover:underline">WhatsApp CRM LAX</a> ou <a href="mailto:contato@laxperience.online" className="font-semibold text-foreground hover:underline">contato@laxperience.online</a>
                    </p>
                </div>
            )}
            </div>

            {/* Modal de Confirmação de Troca de Plano */}
            {showConfirmModal && pendingPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}>
                    <div className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setShowConfirmModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-5 w-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isUpgrade(pendingPlan) ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                                {isUpgrade(pendingPlan) ? (
                                    <ArrowUpRight className="h-5 w-5 text-green-400" />
                                ) : (
                                    <ArrowDownRight className="h-5 w-5 text-orange-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-foreground">
                                    {isUpgrade(pendingPlan) ? 'Confirmar Upgrade' : 'Confirmar Downgrade'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {getPlanDisplayName(currentPlan)} → {getPlanDisplayName(pendingPlan)}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-xl bg-background border border-border/50 p-4 mb-5 space-y-3">
                            {isUpgrade(pendingPlan) ? (
                                <>
                                    <p className="text-sm text-foreground">
                                        Sua assinatura do plano <strong>{getPlanDisplayName(currentPlan)}</strong> será cancelada e uma nova será criada no plano <strong>{getPlanDisplayName(pendingPlan)}</strong>.
                                    </p>
                                    <p className="text-sm text-foreground">
                                        Novo valor: <strong className="text-[#FFE600]">{getPlanPrice(pendingPlan)}/mês</strong>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        As novas funcionalidades serão liberadas imediatamente após o pagamento.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-foreground">
                                        Sua assinatura do plano <strong>{getPlanDisplayName(currentPlan)}</strong> será cancelada e uma nova será criada no plano <strong>{getPlanDisplayName(pendingPlan)}</strong>.
                                    </p>
                                    <p className="text-sm text-foreground">
                                        Novo valor: <strong className="text-[#FFE600]">{getPlanPrice(pendingPlan)}/mês</strong>
                                    </p>
                                    <div className="flex items-start gap-2 text-xs text-orange-400 bg-orange-500/10 rounded-lg p-2.5">
                                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                        <p>Os dias restantes do plano atual não serão reembolsados. Funcionalidades exclusivas do plano anterior serão desativadas.</p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-all"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleConfirmChange}
                                className="flex-1 py-2.5 rounded-lg bg-[#FFE600] text-sm font-bold text-black hover:bg-[#F2DB00] transition-all active:scale-[0.98]"
                            >
                                {isUpgrade(pendingPlan) ? 'Confirmar Upgrade' : 'Confirmar Downgrade'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
