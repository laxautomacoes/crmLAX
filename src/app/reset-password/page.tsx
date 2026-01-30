'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ResetForm } from './components/ResetForm';
import { ResetSuccess } from './components/ResetSuccess';

export default function ResetPasswordPage() {
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
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 transition-colors">
            <div className="bg-card w-full max-w-[480px] rounded-2xl shadow-xl p-8 md:p-12 border border-border">
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo-full.png" alt="CRM LAX" className="h-10 w-auto mb-2" />
                    <p className="text-muted-foreground text-sm font-medium text-center">Defina sua nova senha de acesso</p>
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
    );
}
