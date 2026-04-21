'use client'

import { useState, useEffect } from 'react';
import { Check, CreditCard, Crown, Loader2, Settings2, Sparkles, Zap } from 'lucide-react';
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

        // Salvar nova ordem no banco
        const orderData = newOrder.map((p: any, index: number) => ({
            plan_type: p.plan_type,
            display_order: index + 1,
        }));

        const result = await updatePlansOrderAction(orderData);
        if (result.error) {
            toast.error('Erro ao salvar nova ordem: ' + result.error);
            setAllPlanLimits(allPlanLimits); // Revert on error
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
                    {!isSuperadmin && currentPlan !== 'freemium' && (
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
                </div>
            </PageHeader>


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
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
                                        handleSubscribe={handleSubscribe}
                                        router={router}
                                    />
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {!isSuperadmin && (
                <p className="text-center text-xs text-muted-foreground">
                    Para upgrades ou dúvidas, entre em contato: <a href="mailto:contato@laxperience.online" className="font-semibold text-foreground hover:underline">contato@laxperience.online</a>
                </p>
            )}
            </div>
        </div>
    );
}
