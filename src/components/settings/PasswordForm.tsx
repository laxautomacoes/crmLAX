import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { FormInput } from '@/components/shared/forms/FormInput';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function PasswordForm() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handlePasswordChange = async () => {
        if (!currentPassword) {
            toast.error('Informe a senha atual para continuar.');
            return;
        }

        if (!newPassword || newPassword.length < 6) {
            toast.error('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }

        try {
            setLoading(true);

            const supabase = createClient();

            // 1. Verificar a senha atual (Re-autenticação)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error('Usuário não encontrado.');

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

            if (signInError) {
                throw new Error('Senha atual incorreta.');
            }

            // 2. Atualizar para a nova senha
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            toast.success('Senha alterada com sucesso!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
                <Lock className="text-muted-foreground" size={20} />
                <h2 className="font-semibold text-foreground">Alterar Senha</h2>
            </div>

            <div className="space-y-4 flex flex-col flex-1">
                <div className="space-y-4 flex-1">
                    <FormInput
                        key={`current-${showCurrentPassword}`}
                        label="Senha Atual"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Sua senha atual"
                        value={currentPassword}
                        autoComplete="current-password"
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        rightElement={
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showCurrentPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        }
                    />

                    <div className="pt-2 border-t border-border/50">
                        <FormInput
                            key={`new-${showNewPassword}`}
                            label="Nova Senha"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Mínimo 6 caracteres"
                            value={newPassword}
                            autoComplete="new-password"
                            onChange={(e) => setNewPassword(e.target.value)}
                            rightElement={
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showNewPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            }
                        />
                    </div>
                    
                    <FormInput
                        key={`confirm-${showConfirmPassword}`}
                        label="Confirmar Nova Senha"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Digite novamente"
                        value={confirmPassword}
                        autoComplete="new-password"
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        rightElement={
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        }
                    />
                </div>

                <button
                    onClick={handlePasswordChange}
                    disabled={loading}
                    className="w-full bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-3 px-4 rounded-lg transition-all transform active:scale-[0.99] text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
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

