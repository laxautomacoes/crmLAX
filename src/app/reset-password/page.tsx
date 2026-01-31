'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ResetForm } from './components/ResetForm';
import { ResetSuccess } from './components/ResetSuccess';
import { Logo } from '@/components/shared/Logo';
import { useTenantBranding } from '@/hooks/useTenantBranding';

export default function ResetPasswordPage() {
  const { branding, loading: brandingLoading } = useTenantBranding({ systemOnly: true });
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) return setMessage({ type: 'error', text: 'Mínimo 6 caracteres.' });
        if (password !== confirmPassword) return setMessage({ type: 'error', text: 'As senhas não coincidem.' });

        setLoading(true);
        setMessage(null);

        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setMessage({ type: 'error', text: error.message });
            setLoading(false);
        } else {
            setMessage({ type: 'success', text: 'Senha alterada com sucesso! Redirecionando...' });
            setTimeout(() => router.push('/login'), 2000);
        }
    };

    return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-center items-center p-4 md:p-6 transition-colors overflow-hidden">
      <div className="bg-card w-full max-w-[440px] md:min-h-[640px] min-h-fit rounded-2xl shadow-2xl p-6 md:p-12 border border-border/50 flex flex-col justify-center animate-in fade-in zoom-in duration-300 overflow-hidden">
        <div className="flex flex-col">
          <div className="flex flex-col items-center mb-6 md:mb-10">
         <Logo 
           size="lg" 
           className="mb-0 scale-75 md:scale-100 transition-transform" 
           src={branding?.logo_full} 
           height={branding?.logo_height} 
           loading={brandingLoading}
         />
         {!brandingLoading && (
           <p className="text-white text-xs md:text-base font-medium text-center opacity-90">
             A melhor experiência imobiliária
           </p>
         )}
       </div>

                {message?.type === 'success' ? (
                    <ResetSuccess message={message.text} />
                ) : (
                    <ResetForm
                        password={password} setPassword={setPassword}
                        confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                        loading={loading} error={message?.text || null} onSubmit={handleReset}
                    />
                )}
                    </div>
            </div>
        </div>
    );
}
