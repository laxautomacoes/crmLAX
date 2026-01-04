'use client';

import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

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
        <>
            <div className="space-y-1.5">
                <label className="block text-sm font-bold text-foreground ml-1">Email</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3.5 bg-muted/30 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all text-sm font-medium"
                        placeholder="adm@laxperience.online"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-sm font-bold text-foreground ml-1">Senha</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        className="block w-full pl-11 pr-11 py-3.5 bg-muted/30 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all text-sm font-medium"
                        placeholder="•••••••••••"
                    />
                    <button
                        type="button"
                        onClick={onToggleShowPassword}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </>
    );
}

