'use client'

import { Crown, Sparkles } from 'lucide-react';

const featureLabels: Record<string, string> = {
    ai: 'Inteligência Artificial',
    whatsapp: 'WhatsApp',
    custom_domain: 'Domínio Próprio',
};

interface UpgradeBannerProps {
    feature?: string;
}

export default function UpgradeBanner({ feature }: UpgradeBannerProps) {
    const label = feature ? featureLabels[feature] || feature : 'esta funcionalidade';

    return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-accent-icon/30 bg-gradient-to-br from-[#404F4F]/5 to-accent-icon/10 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-icon/20">
                <Crown className="h-7 w-7 text-[#404F4F]" />
            </div>

            <div className="space-y-1">
                <p className="text-base font-bold text-[#404F4F]">
                    Funcionalidade do Plano Pro
                </p>
                <p className="text-sm text-gray-500">
                    <span className="font-semibold text-[#404F4F]">{label}</span> está disponível apenas no plano Pro.
                </p>
            </div>

            <a
                href="/settings/subscription"
                className="inline-flex items-center gap-2 rounded-lg bg-[#FFE600] px-5 py-2.5 text-sm font-bold text-[#404F4F] transition-all hover:bg-[#F2DB00] active:scale-[0.99]"
            >
                <Sparkles className="h-4 w-4" />
                Ver Planos
            </a>
        </div>
    );
}
