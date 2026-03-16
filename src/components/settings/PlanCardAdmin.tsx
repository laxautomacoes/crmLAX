'use client'

import { Check, Loader2, Sparkles } from 'lucide-react';

interface Plan {
    key: string;
    name: string;
    price: string;
    period: string;
    description: string;
    icon: React.ReactNode;
    features: string[];
    aiFeatures: string[];
    cta: string;
    highlighted: boolean;
}

interface PlanCardAdminProps {
    plan: Plan;
    isCurrent: boolean;
    isSelected: boolean;
    isSubscribing: string | null;
    onSelect: () => void;
    onSubscribe: (e: React.MouseEvent) => void;
}

export default function PlanCardAdmin({
    plan,
    isCurrent,
    isSelected,
    isSubscribing,
    onSelect,
    onSubscribe,
}: PlanCardAdminProps) {
    return (
        <div
            onClick={onSelect}
            className={`relative flex flex-col rounded-2xl border bg-background p-6 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                isSelected
                    ? 'border-[#FFE600] shadow-lg shadow-[#FFE600]/10'
                    : 'border-muted-foreground/50'
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
                {plan.features.map((f) => {
                    const hasNoIcon = f.startsWith('[no-icon]');
                    const displayText = hasNoIcon ? f.replace('[no-icon]', '').trim() : f;
                    return (
                        <li key={f} className={`flex items-start gap-2 text-sm text-foreground/80 ${hasNoIcon ? 'ml-6' : ''}`}>
                            {!hasNoIcon && <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00B087]" />}
                            {displayText}
                        </li>
                    );
                })}
            </ul>

            {plan.aiFeatures.length > 0 && (
                <div className="mb-4 rounded-xl bg-[#FFE600]/10 p-3 space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Sparkles className="h-3.5 w-3.5" /> Inteligência Artificial
                    </p>
                    {plan.aiFeatures.map((f) => {
                        const hasNoIcon = f.startsWith('[no-icon]');
                        const displayText = hasNoIcon ? f.replace('[no-icon]', '').trim() : f.replace('IA: ', '');
                        return (
                            <p key={f} className={`flex items-start gap-2 text-xs text-foreground/80 ${hasNoIcon ? 'ml-5' : ''}`}>
                                {!hasNoIcon && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFE600]" />}
                                {displayText}
                            </p>
                        );
                    })}
                </div>
            )}

            {isCurrent ? (
                <div className="rounded-lg bg-[#00B087] py-2.5 text-center text-sm font-bold text-black shadow-lg shadow-[#00B087]/20">
                    Plano Atual
                </div>
            ) : (
                <button
                    onClick={onSubscribe}
                    disabled={!!isSubscribing}
                    className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-center text-sm font-bold transition-all active:scale-[0.99] disabled:opacity-50 ${
                        isSelected
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
}
