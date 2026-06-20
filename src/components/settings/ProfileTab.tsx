'use client';

import { useState, useEffect } from 'react';
import { getProfile } from '@/app/_actions/profile';
import { initStorageBuckets } from '@/app/_actions/storage';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileInfo } from './ProfileInfo';
import { PasswordForm } from './PasswordForm';

export function ProfileTab() {
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        async function loadProfile() {
            // Tentar inicializar buckets se necessário
            await initStorageBuckets();
            
            const { profile } = await getProfile();
            if (profile) setProfile(profile);
        }
        loadProfile();
    }, []);

    const handleProfileUpdate = (updates: Partial<any>) => {
        if (profile) {
            setProfile({ ...profile, ...updates });
        }
    };

    if (!profile) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-3 flex items-center justify-center min-h-[400px]">
                    <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Foto */}
            <div className="flex flex-col space-y-3">
                <div className="px-1 space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Foto</h3>
                    <p className="text-sm text-muted-foreground">Personalize seu avatar de exibição no sistema.</p>
                </div>
                <div className="flex-1">
                    <ProfileAvatar profile={profile} onProfileUpdate={handleProfileUpdate} />
                </div>
            </div>

            {/* Informações */}
            <div className="flex flex-col space-y-3">
                <div className="px-1 space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Informações</h3>
                    <p className="text-sm text-muted-foreground">Gerencie seu nome, e-mail e telefone de contato.</p>
                </div>
                <div className="flex-1">
                    <ProfileInfo profile={profile} onProfileUpdate={handleProfileUpdate} />
                </div>
            </div>

            {/* Alterar Senha */}
            <div className="flex flex-col space-y-3">
                <div className="px-1 space-y-1">
                    <h3 className="text-lg font-bold text-foreground">Alterar Senha</h3>
                    <p className="text-sm text-muted-foreground">Mantenha sua conta segura atualizando sua senha.</p>
                </div>
                <div className="flex-1">
                    <PasswordForm />
                </div>
            </div>
        </div>
    );
}

