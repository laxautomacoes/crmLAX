'use client';

import { useState, useEffect } from 'react';
import { getProfile } from '@/app/_actions/profile';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileInfo } from './ProfileInfo';
import { PasswordForm } from './PasswordForm';

export function ProfileTab() {
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        async function loadProfile() {
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
                <div className="col-span-3 flex items-center justify-center min-h-[400px]">
                    <div className="w-8 h-8 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
            <ProfileAvatar profile={profile} onProfileUpdate={handleProfileUpdate} />
            <ProfileInfo profile={profile} onProfileUpdate={handleProfileUpdate} />
            <PasswordForm />
        </div>
    );
}

