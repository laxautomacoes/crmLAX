'use client';

import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { FormInput } from '@/components/shared/forms/FormInput';

interface LoginFieldsProps {
    email: string;
    password: string;
    showPassword: boolean;
    onEmailChange: (email: string) => void;
    onPasswordChange: (password: string) => void;
    onToggleShowPassword: () => void;
}

export function LoginFields({
    email,
    password,
    showPassword,
    onEmailChange,
    onPasswordChange,
    onToggleShowPassword
}: LoginFieldsProps) {
    return (
        <div className="space-y-3 md:space-y-4">
            <FormInput
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="adm@laxperience.online"
                icon={Mail}
                className="py-3 md:py-3.5"
            />

            <FormInput
                label="Senha"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="•••••••••••"
                icon={Lock}
                className="py-3 md:py-3.5"
                rightElement={
                    <button
                        type="button"
                        onClick={onToggleShowPassword}
                        className="p-1 hover:text-foreground transition-colors"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                    </button>
                }
            />
        </div>
    );
}

