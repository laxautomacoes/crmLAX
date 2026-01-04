'use client';

import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface ProfileAvatarUploadProps {
    profile: any;
    uploading: boolean;
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileAvatarUpload({ profile, uploading, onUpload }: ProfileAvatarUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
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

