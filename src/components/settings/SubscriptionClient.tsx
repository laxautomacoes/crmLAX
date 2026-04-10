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
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    userRole: string;
    allPlanLimits: any[];
}

// Mapeamento de ícones por chave de plano
const planIcons: Record<string, React.ReactNode> = {
    freemium: <Zap className="h-5 w-5 text-amber-500" />,
    starter: <Sparkles className="h-5 w-5 text-blue-500" />,
    pro: <Crown className="h-5 w-5 text-[#FFE600]" />,
};

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

        const oldIndex = allPlanLimits.findIndex((p) => p.plan_type === active.id);
        const newIndex = allPlanLimits.findIndex((p) => p.plan_type === over.id);

        const newOrder = arrayMove(allPlanLimits, oldIndex, newIndex);
        setAllPlanLimits(newOrder);

        // Salvar nova ordem no banco
        const orderData = newOrder.map((p, index) => ({
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
                        items={allPlanLimits.map(p => p.plan_type)}
                        strategy={rectSortingStrategy}
                        disabled={!isSuperadmin}
                    >
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {allPlanLimits.map((planLimit) => (
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

function SortableItem({ id, children, disabled }: { id: string; children: React.ReactNode; disabled?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full">
            {children}
        </div>
    );
}

function PlanItem({ 
    planLimit, 
    currentPlan, 
    isSuperadmin, 
    selectedPlan, 
    isSubscribing, 
    setSelectedPlan, 
    handleSubscribe,
    router
}: any) {
    const isCurrent = planLimit.plan_type === currentPlan;
    const planData: any = {
        key: planLimit.plan_type,
        plan_type: planLimit.plan_type,
        name: planLimit.display_name || planLimit.plan_type,
        price: planLimit.price_text || 'R$ 0',
        period: planLimit.period_text || '',
        description: planLimit.description_text || '',
        features: planLimit.features_list || [],
        aiFeatures: planLimit.ai_features_list || [],
        ai_features: planLimit.ai_features_list || [],
        highlighted: planLimit.is_highlighted || false,
        icon: planIcons[planLimit.plan_type as keyof typeof planIcons] || <Zap />,
        cta: isCurrent ? 'Plano atual' : `Assinar ${planLimit.display_name || planLimit.plan_type}`,
        max_leads_per_month: planLimit.max_leads_per_month ?? 0,
        max_assets: planLimit.max_assets ?? 0,
        max_users: planLimit.max_users ?? 0,
        has_whatsapp: planLimit.has_whatsapp ?? false,
        has_ai: planLimit.has_ai ?? false,
        has_custom_domain: planLimit.has_custom_domain ?? false,
        ai_requests_per_month: planLimit.ai_requests_per_month ?? 0,
        display_order: planLimit.display_order ?? 0,
    };

    if (isSuperadmin) {
        return (
            <PlanCardSuperadmin
                key={planLimit.plan_type}
                plan={planData}
                onSaved={() => router.refresh()}
            />
        );
    }

    return (
        <SortableItem id={planLimit.plan_type} disabled={true}> {/* Only Superadmin can drag */}
            <PlanCardAdmin
                key={planLimit.plan_type}
                plan={planData}
                isCurrent={isCurrent}
                isSelected={planLimit.plan_type === selectedPlan}
                isSubscribing={isSubscribing}
                onSelect={() => setSelectedPlan(planLimit.plan_type)}
                onSubscribe={(e: any) => {
                    e.stopPropagation();
                    handleSubscribe(planLimit.plan_type);
                }}
            />
        </SortableItem>
    );
}
