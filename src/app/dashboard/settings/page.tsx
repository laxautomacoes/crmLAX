'use client';

import { useState } from 'react';
import { Camera, Save, Trash2, CheckCircle, Square, CheckSquare, Bell, User, Lock, Mail } from 'lucide-react';
import { NotificationsList } from '@/components/dashboard/NotificationsList';
import { createClient } from '@/lib/supabase/client';
import { getProfile, updateProfileAvatar } from '@/app/_actions/profile';
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function loadProfile() {
            const { profile } = await getProfile();
            if (profile) setProfile(profile);
        }
        loadProfile();
    }, []);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

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
            alert('Avatar atualizado com sucesso!');
        } catch (error: any) {
            console.error('Erro detalhado no upload:', error);
            const errorMessage = error.message || (typeof error === 'string' ? error : 'Erro desconhecido');
            alert('Erro ao atualizar avatar: ' + errorMessage);
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

                    <button className="w-full mt-auto bg-secondary hover:opacity-90 text-secondary-foreground font-bold py-2 px-4 rounded-lg transition-opacity text-sm">
                        Salvar Alterações
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
                <div className={`px-4 py-2 rounded-lg text-xs font-medium text-center border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'
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
    // Mock data for notifications
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'Nova venda realizada', message: 'Você realizou uma nova venda no valor de R$ 1.500,00', date: 'Há 5 min', read: false },
        { id: 2, title: 'Lead qualificado', message: 'Um novo lead foi marcado como qualificado.', date: 'Há 1 hora', read: false },
        { id: 3, title: 'Meta atingida!', message: 'Parabéns! Você atingiu sua meta mensal de vendas.', date: 'Ontem', read: true },
        { id: 4, title: 'Atualização do sistema', message: 'O sistema passará por manutenção programada às 22h.', date: 'Ontem', read: true },
    ]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(itemId => itemId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === notifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n.id));
        }
    };

    const deleteSelected = () => {
        setNotifications(notifications.filter(n => !selectedIds.includes(n.id)));
        setSelectedIds([]);
    };

    const markAsRead = () => {
        setNotifications(notifications.map(n =>
            selectedIds.includes(n.id) ? { ...n, read: true } : n
        ));
        setSelectedIds([]);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm min-h-[500px] flex flex-col">
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between p-4 border-b border-border gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm font-medium"
                    >
                        {selectedIds.length === notifications.length && notifications.length > 0 ? (
                            <CheckSquare size={18} className="text-[#00B087]" />
                        ) : (
                            <Square size={18} />
                        )}
                        Selecionar todos
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground font-medium">
                            Tudo <span className="text-foreground ml-1">{notifications.length}</span>
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-600 font-medium">
                            Não lidas <span className="text-red-600 ml-1">{unreadCount}</span>
                        </span>
                    </div>

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                            <button
                                onClick={markAsRead}
                                className="px-3 py-1.5 text-xs font-medium text-[#00B087] bg-[#00B087]/10 hover:bg-[#00B087]/20 rounded-md transition-colors flex items-center gap-1"
                            >
                                <CheckCircle size={14} />
                                Marcar como lida
                            </button>
                            <button
                                onClick={deleteSelected}
                                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center gap-1"
                            >
                                <Trash2 size={14} />
                                Excluir
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                        <Bell size={48} className="mb-4 opacity-20" />
                        <p className="font-medium text-foreground">Nenhuma notificação</p>
                        <p className="text-sm">Sua caixa de entrada está vazia.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group ${!notification.read ? 'bg-blue-500/5' : ''
                                    }`}
                            >
                                <button
                                    onClick={() => toggleSelect(notification.id)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    {selectedIds.includes(notification.id) ? (
                                        <CheckSquare size={18} className="text-[#00B087]" />
                                    ) : (
                                        <Square size={18} />
                                    )}
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between mb-1">
                                        <h4 className={`text-sm truncate ${!notification.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                            {notification.title}
                                        </h4>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{notification.date}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">{notification.message}</p>
                                </div>

                                {!notification.read && (
                                    <div className="h-2 w-2 rounded-full bg-red-500 shrink-0"></div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
