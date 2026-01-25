'use client';

import { formatPhone } from '@/lib/utils/phone';
import { FormInput } from '@/components/shared/forms/FormInput';

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
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <FormInput
                label="Nome Completo *"
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Seu nome completo"
                className="py-3"
            />

            <FormInput
                label="WhatsApp *"
                type="tel"
                required
                value={phone}
                onChange={(e) => onPhoneChange(formatPhone(e.target.value))}
                placeholder="(48) 99999 9999"
                className="py-3"
            />

            <FormInput
                label="Email (opcional)"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="seu@email.com"
                className="py-3"
            />
        </div>
    );
}

