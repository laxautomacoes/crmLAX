'use client';

import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 transition-colors">
            <div className="bg-card w-full max-w-[480px] rounded-2xl shadow-xl p-8 md:p-12 border border-border">
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo-full.png" alt="CRM LAX" className="h-10 w-auto mb-2" />
                    <p className="text-muted-foreground text-sm font-medium text-center">
                        CRM e Organização Imobiliária
                    </p>
                </div>

                <LoginForm />
            </div>
        </div>
    );
}
