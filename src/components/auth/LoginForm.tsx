'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { GoogleAuthButton } from './GoogleAuthButton';
import { LoginFields } from './LoginFields';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    return (
        <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}

            <LoginFields
                email={email}
                password={password}
                showPassword={showPassword}
                onEmailChange={setEmail}
                onPasswordChange={setPassword}
                onToggleShowPassword={() => setShowPassword(!showPassword)}
            />

            <div className="flex justify-center pt-1">
                <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-foreground hover:opacity-80 transition-opacity"
                >
                    Esqueceu a senha?
                </Link>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-secondary-foreground bg-secondary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-70 disabled:cursor-wait transition-all transform active:scale-[0.99]"
            >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
            </button>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-card text-muted-foreground font-medium">
                        ou continue com
                    </span>
                </div>
            </div>

            <GoogleAuthButton />

            <div className="flex justify-center items-center mt-6">
                <span className="text-muted-foreground text-sm font-medium mr-1.5">
                    Não tem uma conta?
                </span>
                <Link
                    href="/register"
                    className="text-sm font-bold text-foreground hover:opacity-80 transition-opacity"
                >
                    Cadastre-se
                </Link>
            </div>
        </form>
    );
}

