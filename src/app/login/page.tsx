'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/shared/Logo';
import { useTenantBranding } from '@/hooks/useTenantBranding';

export default function LoginPage() {
    const { branding } = useTenantBranding({ systemOnly: true });

    return (
        <div className="h-screen w-screen bg-background flex flex-col justify-center items-center p-4 transition-colors overflow-hidden">
            <div className="bg-card w-full max-w-[480px] rounded-2xl shadow-xl p-8 md:p-12 border border-border">
                <div className="flex flex-col items-center mb-12">
                    <Logo 
                        size="lg" 
                        className="mb-0" 
                        src={branding?.logo_full} 
                        height={branding?.logo_height} 
                    />
                    <p className="text-white text-sm md:text-base font-medium text-center -mt-12 opacity-90">
                        A melhor experiência imobiliária
                    </p>
                </div>

                <LoginForm />
            </div>
        </div>
    );
}
