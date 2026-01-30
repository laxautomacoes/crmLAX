'use client';

import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { FormInput } from '@/components/shared/forms/FormInput';

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
        <form className="space-y-4 md:space-y-5" onSubmit={onSubmit}>
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-2.5 md:py-3 rounded-lg text-xs md:text-sm text-center">
                    {error}
                </div>
            )}

            <FormInput
                label="Nova Senha"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••••••"
                icon={Lock}
                className="py-3 md:py-3.5"
                rightElement={
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 hover:text-foreground transition-colors"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                    </button>
                }
            />

            <FormInput
                label="Confirmar Nova Senha"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="•••••••••••"
                icon={Lock}
                className="py-3 md:py-3.5"
            />

            <button
                type="submit" disabled={loading}
                className="w-full flex justify-center py-3 md:py-3.5 border border-transparent rounded-lg shadow-sm text-sm font-bold text-secondary-foreground bg-secondary hover:opacity-90 disabled:opacity-70 transition-all transform active:scale-[0.99]"
            >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Redefinir Senha'}
            </button>
        </form>
    );
}
