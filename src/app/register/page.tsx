'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getInvitationByToken } from '@/app/_actions/invitations';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<any>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (token) {
            const checkInvitation = async () => {
                const { invitation, error } = await getInvitationByToken(token);
                if (error) {
                    setError('Convite inválido ou expirado.');
                } else {
                    setInvitation(invitation);
                    setEmail(invitation.email); // Auto-fill email
                }
            };
            checkInvitation();
        }
    }, [token]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // 1. Sign up user
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
                data: {
                    full_name: name,
                    invitation_token: token // Passed to handle_new_user trigger
                }
            }
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
        }

        // 2. Create profile entry (if not handled by valid trigger) or show success
        if (data.user) {
            // Optional: You might want to manually create a profile here if you don't have a trigger
            // But usually triggers are better. Assuming trigger exists or we just rely on Auth.

            // Check if email confirmation is required
            if (data.session) {
                router.push('/dashboard');
                router.refresh();
            } else {
                // User needs to confirm email
                setError('Verifique seu e-mail para confirmar o cadastro.');
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F2F5] flex flex-col justify-center items-center p-4">
            <div className="bg-white w-full max-w-[480px] rounded-2xl shadow-xl p-8 md:p-12">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="text-3xl font-bold tracking-tight text-[#404F4F]">
                            CRM <span className="text-[#FFE600] inline-block transform -skew-x-12">LAX</span>
                        </div>
                    </div>
                    <p className="text-gray-500 text-sm font-medium text-center">
                        {invitation
                            ? `Você foi convidado para participar da ${invitation.tenants?.name}`
                            : 'Crie sua conta para começar'}
                    </p>
                </div>

                <form className="space-y-5" onSubmit={handleRegister}>
                    {error && (
                        <div className={`border px-4 py-3 rounded-lg text-sm text-center ${error.includes('Verifique') || invitation ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-800 ml-1">
                            Nome Completo
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 focus:border-[#FFE600] transition-all text-sm font-medium"
                                placeholder="João Silva"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-800 ml-1">
                            Email
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                required
                                readOnly={!!invitation}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`block w-full pl-11 pr-4 py-3.5 border border-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 focus:border-[#FFE600] transition-all text-sm font-medium ${invitation ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'}`}
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-800 ml-1">
                            Senha
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-11 pr-11 py-3.5 bg-gray-50 border border-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 focus:border-[#FFE600] transition-all text-sm font-medium"
                                placeholder="Mínimo 6 caracteres"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-[#404F4F] bg-[#FFE600] hover:bg-[#F2DB00] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFE600] disabled:opacity-70 disabled:cursor-wait transition-all transform active:scale-[0.99]"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            'Criar Conta'
                        )}
                    </button>

                    <div className="flex justify-center items-center mt-6">
                        <span className="text-gray-500 text-sm font-medium mr-1.5">
                            Já tem uma conta?
                        </span>
                        <Link
                            href="/login"
                            className="text-sm font-bold text-[#404F4F] hover:text-[#2d3939] transition-colors"
                        >
                            Fazer Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
