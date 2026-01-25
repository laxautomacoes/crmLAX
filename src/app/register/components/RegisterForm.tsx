'use client';

import { Lock, Mail, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { FormInput } from '@/components/shared/forms/FormInput';

interface RegisterFormProps {
    name: string;
    setName: (val: string) => void;
    email: string;
    setEmail: (val: string) => void;
    password: string;
    setPassword: (val: string) => void;
    loading: boolean;
    error: string | null;
    isInvited: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

export function RegisterForm({
    name, setName, email, setEmail, password, setPassword,
    loading, error, isInvited, onSubmit
}: RegisterFormProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <form className="space-y-5" onSubmit={onSubmit}>
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}

            <FormInput
                label="Nome Completo"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="João Silva"
                icon={User}
                className="py-3.5"
            />

            <FormInput
                label="Email"
                type="email"
                required
                readOnly={isInvited}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                icon={Mail}
                className={`py-3.5 ${isInvited ? 'bg-muted/50 cursor-not-allowed opacity-70' : ''}`}
            />

            <FormInput
                label="Senha"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                icon={Lock}
                className="py-3.5"
                rightElement={
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 hover:text-foreground transition-colors"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                }
            />

            <button
                type="submit" disabled={loading}
                className="w-full flex justify-center py-3.5 border border-transparent rounded-lg shadow-sm text-sm font-bold text-secondary-foreground bg-secondary hover:opacity-90 disabled:opacity-70 transition-all transform active:scale-[0.99]"
            >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar Conta'}
            </button>

            <div className="flex justify-center items-center mt-6">
                <span className="text-muted-foreground text-sm font-medium mr-1.5">Já tem uma conta?</span>
                <Link href="/login" className="text-sm font-bold text-foreground hover:opacity-80 transition-opacity">Fazer Login</Link>
            </div>
        </form>
    );
}
