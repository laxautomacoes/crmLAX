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
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}

            <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-800 ml-1">Nome Completo</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 placeholder-gray-500 text-sm font-medium"
                        placeholder="João Silva"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-800 ml-1">Email</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="email" required readOnly={isInvited} value={email} onChange={(e) => setEmail(e.target.value)}
                        className={`block w-full pl-11 pr-4 py-3.5 border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 placeholder-gray-500 text-sm font-medium ${isInvited ? 'bg-gray-100' : 'bg-gray-50'}`}
                        placeholder="seu@email.com"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-800 ml-1">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-11 pr-11 py-3.5 bg-gray-50 border border-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFE600]/50 placeholder-gray-500 text-sm font-medium"
                        placeholder="Mínimo 6 caracteres"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            <button
                type="submit" disabled={loading}
                className="w-full flex justify-center py-3.5 border border-transparent rounded-lg shadow-sm text-sm font-bold text-[#404F4F] bg-[#FFE600] hover:bg-[#F2DB00] disabled:opacity-70 transition-all transform active:scale-[0.99]"
            >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Criar Conta'}
            </button>

            <div className="flex justify-center items-center mt-6">
                <span className="text-gray-500 text-sm font-medium mr-1.5">Já tem uma conta?</span>
                <Link href="/login" className="text-sm font-bold text-[#404F4F] hover:text-[#2d3939] transition-colors">Fazer Login</Link>
            </div>
        </form>
    );
}
