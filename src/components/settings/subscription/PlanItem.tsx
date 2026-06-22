'use client'

import { Zap, Sparkles, Crown, Gem, Shield } from 'lucide-react';
import PlanCardAdmin from '../PlanCardAdmin';
import PlanCardSuperadmin from '../PlanCardSuperadmin';
import { SortableItem } from './SortableItem';

const planIcons: Record<string, React.ReactNode> = {
    starter: <Sparkles className="h-5 w-5 text-blue-500" strokeWidth={1} />,
    pro: <Crown className="h-5 w-5 text-purple-500" strokeWidth={1} />,
    business: <Gem className="h-5 w-5 text-emerald-500" strokeWidth={1} />,
    enterprise: <Shield className="h-5 w-5 text-amber-500" strokeWidth={1} />,
};

const planColors: Record<string, string> = {
    starter: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white',
    pro: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white',
    business: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white',
    enterprise: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white',
};
const planIconBgs: Record<string, string> = {
    starter: 'bg-blue-500/10',
    pro: 'bg-purple-500/10',
    business: 'bg-emerald-500/10',
    enterprise: 'bg-amber-500/10',
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
        icon: planIcons[planLimit.plan_type as keyof typeof planIcons] || <Zap strokeWidth={1} />,
        cta: isCurrent ? 'Plano atual' : `Assinar ${planLimit.display_name || planLimit.plan_type}`,
        max_leads_per_month: planLimit.max_leads_per_month ?? 0,
        max_properties: planLimit.max_properties ?? 0,
        max_users: planLimit.max_users ?? 0,
        has_whatsapp: planLimit.has_whatsapp ?? false,
        has_ai: planLimit.has_ai ?? false,
        has_custom_domain: planLimit.has_custom_domain ?? false,
        ai_requests_per_month: planLimit.ai_requests_per_month ?? 0,
        display_order: planLimit.display_order ?? 0,
        buttonClass: planColors[planLimit.plan_type as keyof typeof planColors] || 'bg-muted text-foreground hover:bg-muted/80',
        iconBgClass: planIconBgs[planLimit.plan_type as keyof typeof planIconBgs] || 'bg-muted',
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
