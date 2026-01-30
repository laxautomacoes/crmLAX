'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { getInvitationByToken } from '@/app/_actions/invitations';
import { RegisterForm } from './RegisterForm';
import { RegisterSuccess } from './RegisterSuccess';

export function RegisterContent() {
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
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 transition-colors">
            <div className="bg-card w-full max-w-[480px] rounded-2xl shadow-xl p-8 md:p-12 border border-border">
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo-full.png" alt="CRM LAX" className="h-10 w-auto mb-2" />
                    {!isSuccess && (
                        <p className="text-muted-foreground text-sm font-medium text-center">
                            {invitation ? `Você foi convidado para participar da ${invitation.tenants?.name}` : 'Crie sua conta para começar'}
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
