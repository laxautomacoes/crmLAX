'use client';

import { useState } from 'react';
import { User, Mail } from 'lucide-react';
import { updateProfile } from '@/app/_actions/profile';
import { MessageBanner } from '@/components/shared/MessageBanner';

interface ProfileInfoProps {
    profile: any;
    onProfileUpdate: (updates: Partial<any>) => void;
}

export function ProfileInfo({ profile, onProfileUpdate }: ProfileInfoProps) {
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSaveProfile = async () => {
        if (!profile?.full_name?.trim()) {
            setMessage({ type: 'error', text: 'O nome completo é obrigatório.' });
            return;
        }

        try {
            setSaving(true);
            setMessage(null);

            const result = await updateProfile({
                full_name: profile.full_name
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

    return (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm h-full md:col-span-1 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
                <User className="text-muted-foreground" size={20} />
                <h2 className="font-semibold text-foreground">Informações Perfil</h2>
            </div>

            <div className="space-y-4 flex-1 flex flex-col">
                {message && <MessageBanner type={message.type} text={message.text} />}
                
                <div>
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">Nome Completo</label>
                    <input
                        type="text"
                        value={profile?.full_name || ''}
                        onChange={(e) => onProfileUpdate({ full_name: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm text-foreground placeholder-muted-foreground font-medium"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">Email</label>
                    <input
                        type="email"
                        value={profile?.email || ''}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm bg-muted/30 text-muted-foreground font-medium cursor-not-allowed"
                        readOnly
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        Ao alterar, você receberá um link de confirmação em ambos os emails.
                    </p>
                </div>

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

