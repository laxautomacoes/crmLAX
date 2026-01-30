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
    const { branding, loading: brandingLoading } = useTenantBranding({ systemOnly: true });
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
        <div className="min-h-screen w-full bg-background flex flex-col justify-center items-center p-4 md:p-6 transition-colors overflow-hidden">
            <div className="bg-card w-full max-w-[440px] md:min-h-[760px] min-h-fit rounded-2xl shadow-2xl p-6 md:p-12 border border-border/50 flex flex-col justify-center animate-in fade-in zoom-in duration-300 overflow-hidden">
                <div className="flex flex-col -mt-8 md:-mt-20">
                    <div className="flex flex-col items-center mb-6 md:mb-10">
                    <Logo 
                        size="lg" 
                        className="mb-0 scale-75 md:scale-100 transition-transform" 
                        src={branding?.logo_full} 
                        height={branding?.logo_height} 
                        loading={brandingLoading}
                    />
                    {!isSuccess && !brandingLoading && (
                        <p className="text-white text-xs md:text-base font-medium text-center -mt-8 md:-mt-12 opacity-90">
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
        </div>
    );
}
