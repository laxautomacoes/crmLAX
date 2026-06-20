'use client';

import { useRef } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface ProfileAvatarUploadProps {
    profile: any;
    uploading: boolean;
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onDelete: () => void;
}

export function ProfileAvatarUpload({ profile, uploading, onUpload, onDelete }: ProfileAvatarUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-col items-center w-full">
            <div className="relative group w-40 h-40">
                <div
                    className="cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <UserAvatar
                        src={profile?.avatar_url}
                        name={profile?.full_name}
                        className="w-40 h-40 text-4xl font-bold border-4 border-card shadow-md"
                    />

                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={28} />
                    </div>
                </div>

                {/* Botões encostados na borda superior do círculo - Versão Recompilada Simétrica (left: 25% / right: 25%) */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{ left: '25%', top: '-6px' }}
                    className="absolute bg-secondary text-secondary-foreground p-1.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center shadow-sm z-10"
                    title="Nova foto"
                >
                    <Camera size={14} />
                </button>

                {profile?.avatar_url && !uploading && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Tem certeza que deseja remover sua foto?')) {
                                onDelete();
                            }
                        }}
                        style={{ right: '25%', top: '-6px', left: 'auto' }}
                        className="absolute bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 transition-colors shadow-sm z-10"
                        title="Remover foto"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            <input
                type="file"
                id="avatar"
                accept="image/*"
                onChange={onUpload}
                ref={fileInputRef}
                disabled={uploading}
                className="hidden"
            />

            <p className="mt-4 text-sm font-medium text-foreground">
                {uploading ? 'Enviando...' : 'JPG, PNG ou WebP'}
            </p>
            <p className="text-xs text-muted-foreground">Máximo 2MB</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Tamanho sugerido: 1:1 (200x200 px)</p>
        </div>
    );
}

