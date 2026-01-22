'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createLeadFromSite } from '@/app/_actions/leads-site';
import { LeadFormFields } from './LeadFormFields';

interface LeadFormProps {
    assetId?: string;
    assetTitle?: string;
    onSubmit: (result: { success?: boolean; error?: string }) => void;
}

export function LeadForm({ assetId, assetTitle, onSubmit }: LeadFormProps) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await createLeadFromSite({
            name,
            phone,
            email: email || undefined,
            asset_id: assetId
        });

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            onSubmit({ success: true });
            setName('');
            setPhone('');
            setEmail('');
        }
    };

    return (
        <>
            {assetTitle && (
                <p className="text-sm text-muted-foreground mb-6">
                    Interesse em: <strong>{assetTitle}</strong>
                </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <LeadFormFields
                    name={name}
                    phone={phone}
                    email={email}
                    onNameChange={setName}
                    onPhoneChange={setPhone}
                    onEmailChange={setEmail}
                    error={error}
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FFE600] hover:bg-[#F2DB00] text-[#404F4F] font-bold py-3 px-4 rounded-lg transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        'Enviar Solicitação'
                    )}
                </button>
            </form>
        </>
    );
}

