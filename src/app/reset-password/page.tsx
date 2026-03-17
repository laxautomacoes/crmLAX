'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ResetForm } from './components/ResetForm';
import { Logo } from '@/components/shared/Logo';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const { branding, loading: brandingLoading } = useTenantBranding({ systemOnly: true });
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres.');
          return;
        }
        if (password !== confirmPassword) {
          toast.error('As senhas não coincidem.');
          return;
        }

        try {
          setLoading(true);
          const supabase = createClient();
          const { error } = await supabase.auth.updateUser({ password });

          if (error) throw error;

          toast.success('Senha alterada com sucesso! Redirecionando...');
          setTimeout(() => router.push('/login'), 2000);
        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setLoading(false);
        }
    };

    return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-center items-center p-4 md:p-6 transition-colors overflow-hidden">
      <div className="bg-card w-full max-w-[440px] md:min-h-[500px] min-h-fit rounded-2xl shadow-2xl p-6 md:p-12 border border-border/50 flex flex-col justify-center animate-in fade-in zoom-in duration-300 overflow-hidden">
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
              <p className="text-muted-foreground text-xs md:text-sm font-medium text-center">
                A melhor experiência imobiliária
              </p>
            )}
          </div>

          <ResetForm
              password={password} setPassword={setPassword}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              loading={loading} error={null} onSubmit={handleReset}
          />
        </div>
      </div>
    </div>
    );
}
