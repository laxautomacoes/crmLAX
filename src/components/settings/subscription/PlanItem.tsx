'use client'

import { Zap, Sparkles, Crown } from 'lucide-react';
import PlanCardAdmin from '../PlanCardAdmin';
import PlanCardSuperadmin from '../PlanCardSuperadmin';
import { SortableItem } from './SortableItem';

const planIcons: Record<string, React.ReactNode> = {
    freemium: <Zap className="h-5 w-5 text-amber-500" />,
    starter: <Sparkles className="h-5 w-5 text-blue-500" />,
    pro: <Crown className="h-5 w-5 text-accent-icon" />,
};

interface PlanItemProps {
    planLimit: any;
    currentPlan: string;
    isSuperadmin: boolean;
    selectedPlan: string;
    isSubscribing: string | null;
    setSelectedPlan: (plan: string) => void;
    handleSubscribe: (plan: string) => void;
    router: any;
}

export function PlanItem({ 
    planLimit, 
    currentPlan, 
    isSuperadmin, 
    selectedPlan, 
    isSubscribing, 
    setSelectedPlan, 
    handleSubscribe,
    router
}: PlanItemProps) {
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
        max_properties: planLimit.max_properties ?? 0,
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
        <SortableItem id={planLimit.plan_type} disabled={true}>
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
