'use client';

import { formatPhone } from '@/lib/utils/phone';

interface LeadFormFieldsProps {
    name: string;
    phone: string;
    email: string;
    onNameChange: (value: string) => void;
    onPhoneChange: (value: string) => void;
    onEmailChange: (value: string) => void;
    error?: string | null;
}

export function LeadFormFields({
    name,
    phone,
    email,
    onNameChange,
    onPhoneChange,
    onEmailChange,
    error
}: LeadFormFieldsProps) {
    return (
        <>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">
                    Nome Completo *
                </label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm text-foreground placeholder-muted-foreground font-medium"
                    placeholder="Seu nome completo"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">
                    WhatsApp *
                </label>
                <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => onPhoneChange(formatPhone(e.target.value))}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm text-foreground placeholder-muted-foreground font-medium"
                    placeholder="(48) 99999 9999"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">
                    Email (opcional)
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm text-foreground placeholder-muted-foreground font-medium"
                    placeholder="seu@email.com"
                />
            </div>
        </>
    );
}

