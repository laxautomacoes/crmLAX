'use client';

import { useState, useEffect } from 'react';
import { FormInput } from '@/components/shared/forms/FormInput';
import { updateProfile, requestEmailChange } from '@/app/_actions/profile';
import { toast } from 'sonner';

interface ProfileInfoProps {
    profile: any;
    onProfileUpdate: (updates: Partial<any>) => void;
}

export function ProfileInfo({ profile, onProfileUpdate }: ProfileInfoProps) {
    const [saving, setSaving] = useState(false);
    const [requesting, setRequesting] = useState(false);
    const [requestEmail, setRequestEmail] = useState('');

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

    useEffect(() => {
        const handleGlobalSave = () => {
            handleSaveProfile();
        };
        window.addEventListener('trigger-save-settings', handleGlobalSave);
        return () => window.removeEventListener('trigger-save-settings', handleGlobalSave);
    }, [profile]);

    const handleSaveProfile = async () => {
        if (!profile?.full_name?.trim()) {
            toast.error('O nome completo é obrigatório.');
            return;
        }

        try {
            setSaving(true);

            const result = await updateProfile({
                full_name: profile.full_name,
                whatsapp_number: profile.whatsapp_number,
                email: profile.email
            });

            if (result.error) throw new Error(result.error);

            // Disparar evento para atualizar outros componentes (Header, Sidebar, etc.)
            window.dispatchEvent(new CustomEvent('profile-updated', { 
                detail: { 
                    full_name: profile.full_name,
                    whatsapp_number: profile.whatsapp_number,
                    email: profile.email
                } 
            }));

            toast.success('Perfil atualizado com sucesso!');
        } catch (error: any) {
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRequestEmailChange = async () => {
        if (!requestEmail || !requestEmail.includes('@')) {
            toast.error('Informe um e-mail válido para a solicitação.');
            return;
        }

        try {
            setRequesting(true);

            const result = await requestEmailChange(requestEmail);

            if (result.error) throw new Error(result.error);

            toast.success('Solicitação enviada com sucesso! O administrador entrará em contato.');
            setRequestEmail('');
        } catch (error: any) {
            toast.error('Erro ao enviar solicitação: ' + error.message);
        } finally {
            setRequesting(false);
        }
    };

    const isAdmin = ['admin', 'superadmin', 'super_admin', 'super administrador', 'super admin', 'super_administrador'].includes(profile?.role?.toLowerCase() || '');

    return (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm h-full flex flex-col">
            <div className="space-y-4 flex flex-col flex-1">

                <div className="space-y-4 flex-1">
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
                            onChange={isAdmin ? (e) => onProfileUpdate({ email: e.target.value }) : undefined}
                            readOnly={!isAdmin}
                            disabled={!isAdmin}
                            className={!isAdmin ? "cursor-not-allowed" : ""}
                        />
                        {!isAdmin && (
                            <div className="mt-4 space-y-1.5 w-full">
                                <label className="block text-sm font-bold text-foreground ml-1 mb-1 tracking-tight">
                                    Solicitar alteração de e-mail
                                </label>
                                <div className="flex gap-2 items-stretch">
                                    <div className="flex-1">
                                        <FormInput
                                            type="email"
                                            placeholder="Novo e-mail"
                                            value={requestEmail}
                                            onChange={(e) => setRequestEmail(e.target.value)}
                                            className="bg-background"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRequestEmailChange}
                                        disabled={requesting || !requestEmail}
                                        className="bg-secondary text-secondary-foreground text-xs font-bold px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center whitespace-nowrap shadow-sm"
                                    >
                                        {requesting ? '...' : 'Solicitar'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <FormInput
                        label="Telefone | WhatsApp"
                        value={formatPhone(profile?.whatsapp_number || '')}
                        onChange={handlePhoneChange}
                        placeholder="(48) 98823 1720"
                    />
                </div>

                <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="w-full bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
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

