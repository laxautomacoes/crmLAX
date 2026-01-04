'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MessageBanner } from '@/components/shared/MessageBanner';

export function PasswordForm() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handlePasswordChange = async () => {
        if (!newPassword || newPassword.length < 6) {
            setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        try {
            setLoading(true);
            setMessage(null);

            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Erro ao alterar senha: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm text-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
                <Lock className="text-muted-foreground" size={20} />
                <h2 className="font-semibold text-foreground">Alterar Senha</h2>
            </div>

            <div className="space-y-4 flex-1 flex flex-col">
                {message && <MessageBanner type={message.type} text={message.text} />}
                
                <div>
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">Nova Senha</label>
                    <input
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm text-foreground placeholder-muted-foreground font-medium"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">Confirmar Nova Senha</label>
                    <input
                        type="password"
                        placeholder="Digite novamente"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm text-foreground placeholder-muted-foreground font-medium"
                    />
                </div>

                <button
                    onClick={handlePasswordChange}
                    disabled={loading}
                    className="w-full mt-auto bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin"></div>
                            Alterando...
                        </span>
                    ) : 'Alterar Senha'}
                </button>
            </div>
        </div>
    );
}

