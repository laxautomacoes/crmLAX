'use client';

import { useState } from 'react';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateProfileAvatar, deleteProfileAvatar } from '@/app/_actions/profile';
import { MessageBanner } from '@/components/shared/MessageBanner';
import { ProfileAvatarUpload } from './ProfileAvatarUpload';

interface ProfileAvatarProps {
    profile: any;
    onProfileUpdate: (updates: Partial<any>) => void;
}

export function ProfileAvatar({ profile, onProfileUpdate }: ProfileAvatarProps) {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleAvatarDelete = async () => {
        try {
            setUploading(true);
            setMessage(null);

            const result = await deleteProfileAvatar();
            if (result.error) throw new Error(result.error);

            onProfileUpdate({ avatar_url: null });
            setMessage({ type: 'success', text: 'Foto removida com sucesso!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Erro ao remover foto: ' + error.message });
        } finally {
            setUploading(false);
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
            
            // Validação de tamanho (2MB para avatar)
            if (file.size > 2 * 1024 * 1024) {
                throw new Error('A imagem é muito grande. O limite é 2MB.');
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
            const filePath = `${profile.id}/${fileName}`;

            const supabase = createClient();

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600'
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const result = await updateProfileAvatar(publicUrl);
            if (result.error) throw new Error(result.error);

            onProfileUpdate({ avatar_url: publicUrl });
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
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
                <Camera className="text-muted-foreground" size={20} />
                <h2 className="font-semibold text-foreground">Foto</h2>
            </div>

            <div className="flex flex-col items-center flex-1 justify-center">
                {message && (
                    <div className="mb-4 w-full">
                        <MessageBanner type={message.type} text={message.text} />
                    </div>
                )}
                
                <ProfileAvatarUpload
                    profile={profile}
                    uploading={uploading}
                    onUpload={handleAvatarUpload}
                    onDelete={handleAvatarDelete}
                />
            </div>
        </div>
    );
}

