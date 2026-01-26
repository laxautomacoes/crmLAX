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
        <div className="flex flex-col items-center flex-1 justify-center">
            <div className="relative group">
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
                    <div className="absolute bottom-1 right-1 bg-secondary p-2 rounded-full text-secondary-foreground border-2 border-card shadow-sm">
                        <Camera size={16} />
                    </div>
                </div>

                {profile?.avatar_url && !uploading && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Tem certeza que deseja remover sua foto?')) {
                                onDelete();
                            }
                        }}
                        className="absolute bottom-1 left-1 bg-red-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform z-10 border-2 border-card"
                        title="Remover foto"
                    >
                        <Trash2 size={16} />
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
        </div>
    );
}

