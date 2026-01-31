'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/shared/Logo';
import { useTenantBranding } from '@/hooks/useTenantBranding';

export default function LoginPage() {
    const { branding, loading } = useTenantBranding({ systemOnly: true });

    return (
        <div className="min-h-screen w-full bg-background flex flex-col justify-center items-center p-4 md:p-6 transition-colors overflow-hidden">
            <div className="bg-card w-full max-w-[440px] md:min-h-[720px] min-h-fit rounded-2xl shadow-2xl p-6 md:p-12 border border-border/50 flex flex-col justify-center animate-in fade-in zoom-in duration-300 overflow-hidden">
                <div className="flex flex-col">
                    <div className="flex flex-col items-center mb-6 md:mb-10">
                        <Logo 
                            size="lg" 
                            className="mb-2 scale-75 md:scale-100 transition-transform" 
                            src={branding?.logo_full} 
                            height={branding?.logo_height} 
                            loading={loading}
                        />
                    {!loading && (
                        <p className="text-white text-xs md:text-base font-medium text-center opacity-90">
                            A melhor experiência imobiliária
                        </p>
                    )}
                </div>

                <LoginForm />
                    </div>
            </div>
        </div>
    );
}
