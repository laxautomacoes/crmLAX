'use client';

import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ResetFormProps {
    password: string;
    setPassword: (val: string) => void;
    confirmPassword: string;
    setConfirmPassword: (val: string) => void;
    loading: boolean;
    error: string | null;
    onSubmit: (e: React.FormEvent) => void;
}

export function ResetForm({
    password, setPassword, confirmPassword, setConfirmPassword,
    loading, error, onSubmit
}: ResetFormProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <form className="space-y-5" onSubmit={onSubmit}>
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}

            <div className="space-y-1.5">
                <label className="block text-sm font-bold text-foreground ml-1">Nova Senha</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-11 pr-11 py-3.5 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary placeholder-muted-foreground text-sm font-medium transition-all"
                        placeholder="•••••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-sm font-bold text-foreground ml-1">Confirmar Nova Senha</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type={showPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary placeholder-muted-foreground text-sm font-medium transition-all"
                        placeholder="•••••••••••"
                    />
                </div>
            </div>

            <button
                type="submit" disabled={loading}
                className="w-full flex justify-center py-3.5 border border-transparent rounded-lg shadow-sm text-sm font-bold text-secondary-foreground bg-secondary hover:opacity-90 disabled:opacity-70 transition-all transform active:scale-[0.99]"
            >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Redefinir Senha'}
            </button>
        </form>
    );
}
