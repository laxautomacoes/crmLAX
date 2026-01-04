'use client';

import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 transition-colors">
            <div className="bg-card w-full max-w-[480px] rounded-2xl shadow-xl p-8 md:p-12 border border-border">
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="text-3xl font-bold tracking-tight text-foreground">
                            CRM <span className="text-secondary inline-block transform -skew-x-12">LAX</span>
                        </div>
                    </div>
                    <p className="text-muted-foreground text-sm font-medium text-center">
                        Gestão e controle financeiro com IA
                    </p>
                </div>

                <LoginForm />
            </div>
        </div>
    );
}
