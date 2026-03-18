'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/shared/Logo';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginContent() {
    const searchParams = useSearchParams();
    const tenantId = searchParams.get('tenant');
    
    const { branding, loading } = useTenantBranding({ 
        tenantId: tenantId || undefined,
        systemOnly: !tenantId
    });

    return (
        <div className="flex flex-col">
            <div className="flex flex-col items-center mb-6 md:mb-10">
                <Logo 
                    size="lg" 
                    className="mb-0 scale-75 md:scale-100 transition-transform" 
                    src={branding?.logo_full} 
                    height={branding?.logo_height} 
                    loading={loading}
                />
                {!loading && (
                    <p className="text-muted-foreground text-xs md:text-sm font-medium text-center">
                        {tenantId && branding?.logo_full ? "Portal do Colaborador" : "A melhor experiência imobiliária"}
                    </p>
                )}
            </div>

            <LoginForm />
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen w-full bg-background flex flex-col justify-center items-center p-4 md:p-6 transition-colors overflow-hidden">
            <div className="bg-card w-full max-w-[440px] rounded-2xl shadow-2xl p-6 md:p-12 border border-border/50 flex flex-col justify-center animate-in fade-in zoom-in duration-300 overflow-hidden">
                <Suspense fallback={<div className="flex justify-center"><Logo size="lg" loading={true} /></div>}>
                    <LoginContent />
                </Suspense>
            </div>
        </div>
    );
}
