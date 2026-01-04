'use client';

import { Lock, Mail, User, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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

            <div className="space-y-1.5">
                <label className="block text-sm font-bold text-foreground ml-1">Nome Completo</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary placeholder-muted-foreground text-sm font-medium transition-all"
                        placeholder="João Silva"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-sm font-bold text-foreground ml-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type="email" required readOnly={isInvited} value={email} onChange={(e) => setEmail(e.target.value)}
                        className={`block w-full pl-11 pr-4 py-3.5 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary placeholder-muted-foreground text-sm font-medium transition-all ${isInvited ? 'bg-muted/50 cursor-not-allowed opacity-70' : 'bg-muted/30'}`}
                        placeholder="seu@email.com"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-sm font-bold text-foreground ml-1">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-11 pr-11 py-3.5 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary placeholder-muted-foreground text-sm font-medium transition-all"
                        placeholder="Mínimo 6 caracteres"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

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
