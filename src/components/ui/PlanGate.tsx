'use client'

import { Crown } from 'lucide-react';
import UpgradeBanner from './UpgradeBanner';

interface PlanGateProps {
    hasAccess: boolean;
    feature?: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Bloqueia o acesso a funcionalidades baseado no plano.
 * O `hasAccess` deve ser resolvido no servidor (Server Component) via checkPlanFeature().
 */
export default function PlanGate({ hasAccess, feature, children, fallback }: PlanGateProps) {
    if (!hasAccess) {
        return fallback ? <>{fallback}</> : <UpgradeBanner feature={feature} />;
    }
    return <>{children}</>;
}
