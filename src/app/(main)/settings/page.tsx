'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { NotificationsTab } from '@/components/notifications/NotificationsContent';
import { BrandingTab } from '@/components/settings/BrandingTab';
import { getProfile } from '@/app/_actions/profile';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab');
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            const { profile } = await getProfile();
            if (profile) {
                setRole(profile.role);
            }
            setLoading(false);
        }
        loadProfile();
    }, []);

    const activeTab = tabParam || 'profile';
    const isAdmin = role === 'admin' || role === 'superadmin';

    const tabs = [
        { id: 'profile', label: 'Perfil' },
        ...(isAdmin ? [{ id: 'branding', label: 'Branding' }] : [])
    ];

    if (loading) return null;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground text-center md:text-left">
                    {activeTab === 'notifications' ? 'Notificações' : 'Meu Perfil'}
                </h1>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-border">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => router.push(`/settings?tab=${tab.id}`)}
                        className={`px-6 py-3 text-sm font-bold transition-all relative ${
                            activeTab === tab.id 
                            ? 'text-secondary border-b-2 border-secondary' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'notifications' && <NotificationsTab />}
                {activeTab === 'branding' && isAdmin && <BrandingTab />}
            </div>
        </div>
    );
}
