'use client';

import { useState } from 'react';
import { Camera, Save, Trash2, CheckCircle, Square, CheckSquare, Bell, User, Lock, Mail } from 'lucide-react';
import { NotificationsList } from '@/components/dashboard/NotificationsList';
import { getNotifications } from '@/app/_actions/notifications';
import { createClient } from '@/lib/supabase/client';
import { getProfile, updateProfileAvatar, updateProfile } from '@/app/_actions/profile';
import { useEffect, useRef } from 'react';

import { useSearchParams } from 'next/navigation';

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const activeTab = tabParam === 'notifications' ? 'notifications' : 'profile';

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground text-center md:text-left">
                    {activeTab === 'notifications' ? 'Notificações' : 'Meu Perfil'}
                </h1>
            </div>

            {/* Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'notifications' && <NotificationsTab />}
            </div>
        </div>
    );
}

import { UserAvatar } from '@/components/shared/UserAvatar';

function ProfileTab() {
    const [profile, setProfile] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function loadProfile() {
            const { profile } = await getProfile();
            if (profile) setProfile(profile);
        }
        loadProfile();
    }, []);

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

            // Limpa a mensagem após 3 segundos
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Erro ao salvar: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            setMessage(null);

            if (!profile?.id) {
                throw new Error('Perfil não carregado. Por favor, recarregue a página.');
            }

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Você deve selecionar uma imagem para fazer upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${profile.id}/${fileName}`;

            const supabase = createClient();

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const result = await updateProfileAvatar(publicUrl);

            if (result.error) {
                throw new Error(result.error);
            }

            setProfile({ ...profile, avatar_url: publicUrl });
            setMessage({ type: 'success', text: 'Avatar atualizado com sucesso!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            console.error('Erro detalhado no upload:', error);
            const errorMessage = error.message || (typeof error === 'string' ? error : 'Erro desconhecido');
            setMessage({ type: 'error', text: 'Erro ao atualizar avatar: ' + errorMessage });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
            {/* Foto de Perfil */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col h-full">
                <div className="flex items-center gap-2 mb-6">
                    <Camera className="text-muted-foreground" size={20} />
                    <h2 className="font-semibold text-foreground">Foto Perfil</h2>
                </div>

                <div className="flex flex-col items-center flex-1 justify-center">
                    <div
                        className="relative group cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UserAvatar
                            src={profile?.avatar_url}
                            name={profile?.full_name}
                            className="w-32 h-32 text-3xl font-bold border-4 border-card shadow-md"
                        />

                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white" size={24} />
                        </div>
                        <div className="absolute bottom-0 right-0 bg-secondary p-2 rounded-full text-secondary-foreground border-2 border-card shadow-sm">
                            <Camera size={14} />
                        </div>
                    </div>

                    <input
                        type="file"
                        id="avatar"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        ref={fileInputRef}
                        disabled={uploading}
                        className="hidden"
                    />

                    <p className="mt-4 text-sm font-medium text-foreground">
                        {uploading ? 'Enviando...' : 'JPG, PNG ou WebP'}
                    </p>
                    <p className="text-xs text-muted-foreground">Máximo 2MB</p>
                </div>
            </div>

            {/* Informações Perfil */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm h-full md:col-span-1 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <User className="text-muted-foreground" size={20} />
                    <h2 className="font-semibold text-foreground">Informações Perfil</h2>
                </div>

                <div className="space-y-4 flex-1 flex flex-col">
                    {message && (
                        <div className={`px-4 py-2 rounded-lg text-xs font-medium text-center border animate-in fade-in duration-300 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
                            }`}>
                            {message.text}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-bold text-foreground ml-1 mb-1.5">Nome Completo</label>
                        <input
                            type="text"
                            value={profile?.full_name || ''}
                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
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

            {/* Alterar Senha */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm text-sm flex flex-col h-full">
                <div className="flex items-center gap-2 mb-6">
                    <Lock className="text-muted-foreground" size={20} />
                    <h2 className="font-semibold text-foreground">Alterar Senha</h2>
                </div>

                <PasswordForm />
            </div>
        </div>
    );
}

function PasswordForm() {
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
        <div className="space-y-4 flex-1 flex flex-col">
            {message && (
                <div className={`px-4 py-2 rounded-lg text-xs font-medium text-center border animate-in fade-in duration-300 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600' : 'bg-red-500/10 border-red-500/20 text-red-600'
                    }`}>
                    {message.text}
                </div>
            )}
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
                className="w-full mt-auto bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed group"
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin"></div>
                        Alterando...
                    </span>
                ) : 'Alterar Senha'}
            </button>
        </div>
    );
}

function NotificationsTab() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        setLoading(true);
        const { notifications: data } = await getNotifications();
        if (data) setNotifications(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    if (loading) {
        return (
            <div className="bg-card rounded-2xl border border-border shadow-sm min-h-[500px] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm min-h-[500px] flex flex-col overflow-hidden">
            <NotificationsList
                notifications={notifications}
                onRefresh={fetchNotifications}
            />
        </div>
    );
}
