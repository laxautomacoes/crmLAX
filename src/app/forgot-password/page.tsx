'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FormInput } from '@/components/shared/forms/FormInput';
import { Logo } from '@/components/shared/Logo';
import { useTenantBranding } from '@/hooks/useTenantBranding';

export default function ForgotPasswordPage() {
  const { branding } = useTenantBranding({ systemOnly: true });
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const supabase = createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Enviamos as instruções para o seu email.' });
        }
        setLoading(false);
    };

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

                <form className="space-y-5" onSubmit={handleReset}>
                    {message && (
                        <div className={`border px-4 py-3 rounded-lg text-sm text-center ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
                            {message.text}
                        </div>
                    )}

                    <FormInput
                        label="Email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        icon={Mail}
                        className="py-3.5"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-secondary-foreground bg-secondary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-70 disabled:cursor-wait transition-all transform active:scale-[0.99]"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            'Enviar Instruções'
                        )}
                    </button>

                    <div className="flex justify-center items-center mt-6">
                        <Link
                            href="/login"
                            className="flex items-center gap-2 text-sm font-bold text-foreground hover:opacity-80 transition-opacity"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para o Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
