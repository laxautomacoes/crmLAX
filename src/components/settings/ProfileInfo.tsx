'use client';

import { useState } from 'react';
import { User, Mail } from 'lucide-react';
import { FormInput } from '@/components/shared/forms/FormInput';
import { updateProfile, requestEmailChange } from '@/app/_actions/profile';
import { MessageBanner } from '@/components/shared/MessageBanner';

interface ProfileInfoProps {
    profile: any;
    onProfileUpdate: (updates: Partial<any>) => void;
}

export function ProfileInfo({ profile, onProfileUpdate }: ProfileInfoProps) {
    const [saving, setSaving] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const formatPhone = (value: string) => {
        if (!value) return '';
        const numbers = value.replace(/\D/g, '');
        
        if (numbers.length <= 2) return `(${numbers}`;
        if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        
        // 10 dígitos: (XX) 8888 9999
        if (numbers.length <= 10) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)} ${numbers.slice(6, 10)}`;
        }
        
        // 11 dígitos: (XX) 99999 9999
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)} ${numbers.slice(7, 11)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        onProfileUpdate({ whatsapp_number: formatted });
    };

    const handleSaveProfile = async () => {
        if (!profile?.full_name?.trim()) {
            setMessage({ type: 'error', text: 'O nome completo é obrigatório.' });
            return;
        }

        try {
            setSaving(true);
            setMessage(null);

            const result = await updateProfile({
                full_name: profile.full_name,
                whatsapp_number: profile.whatsapp_number
            });

            if (result.error) throw new Error(result.error);

            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Erro ao salvar: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleRequestEmailChange = async () => {
        try {
            setRequesting(true);
            setMessage(null);

            const result = await requestEmailChange();

            if (result.error) throw new Error(result.error);

            setMessage({ type: 'success', text: 'Solicitação enviada com sucesso! O administrador entrará em contato.' });
            setTimeout(() => setMessage(null), 5000);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Erro ao enviar solicitação: ' + error.message });
        } finally {
            setRequesting(false);
        }
    };

    return (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm h-full md:col-span-1 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
                <User className="text-muted-foreground" size={20} />
                <h2 className="font-semibold text-foreground">Informações</h2>
            </div>

            <div className="space-y-4 flex-1 flex flex-col">
                {message && <MessageBanner type={message.type} text={message.text} />}
                
                <FormInput
                    label="Nome Completo"
                    value={profile?.full_name || ''}
                    onChange={(e) => onProfileUpdate({ full_name: e.target.value })}
                />
                
                <div>
                    <FormInput
                        label="Email"
                        type="email"
                        value={profile?.email || ''}
                        readOnly
                        disabled
                        className="cursor-not-allowed"
                    />
                    <div className="mt-2 flex items-center justify-between bg-background p-2 rounded-lg border border-muted-foreground/30">
                        <p className="text-xs text-muted-foreground">
                            Alteração de e-mail?
                        </p>
                        <button
                            type="button"
                            onClick={handleRequestEmailChange}
                            disabled={requesting}
                            className="text-xs font-bold bg-secondary text-secondary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity px-3 py-1.5 rounded-lg shadow-sm"
                        >
                            {requesting ? 'Enviando...' : 'Solicitar'}
                        </button>
                    </div>
                </div>

                <FormInput
                    label="Telefone | WhatsApp"
                    value={formatPhone(profile?.whatsapp_number || '')}
                    onChange={handlePhoneChange}
                    placeholder="(48) 98823 1720"
                />

                <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full mt-auto bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin"></div>
                            Salvando...
                        </span>
                    ) : 'Salvar Alterações'}
                </button>
            </div>
        </div>
    );
}

