'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { getInvitationByToken } from '@/app/_actions/invitations';
import { RegisterForm } from './RegisterForm';
import { RegisterSuccess } from './RegisterSuccess';
import { Logo } from '@/components/shared/Logo';
import { useTenantBranding } from '@/hooks/useTenantBranding';

export function RegisterContent() {
    const { branding } = useTenantBranding({ systemOnly: true });
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<any>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (token) {
            getInvitationByToken(token).then(({ invitation, error }) => {
                if (error) setError('Convite inválido ou expirado.');
                else {
                    setInvitation(invitation);
                    setEmail(invitation.email);
                    if (invitation.name) setName(invitation.name);
                }
            });
        }
    }, [token]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data, error: signUpError } = await supabase.auth.signUp({
            email, password,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
                data: { full_name: name, invitation_token: token }
            }
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            if (data.session) {
                router.push('/dashboard');
                router.refresh();
            } else setIsSuccess(true);
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
                    {!isSuccess && (
                        <p className="text-white text-sm md:text-base font-medium text-center -mt-12 opacity-90">
                            {invitation ? `Você foi convidado para participar da ${invitation.tenants?.name}` : "A melhor experiência imobiliária"}
                        </p>
                    )}
                </div>

                {isSuccess ? <RegisterSuccess /> : (
                    <RegisterForm
                        name={name} setName={setName} email={email} setEmail={setEmail}
                        password={password} setPassword={setPassword} loading={loading}
                        error={error} isInvited={!!invitation} onSubmit={handleRegister}
                    />
                )}
            </div>
        </div>
    );
}
