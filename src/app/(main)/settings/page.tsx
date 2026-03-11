'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { BrandingTab } from '@/components/settings/BrandingTab';
import { getProfile } from '@/app/_actions/profile';
import { Save, Loader2 } from 'lucide-react';

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
    // Admin e Superadmin têm acesso ao Branding da empresa.
    // Colaboradores têm acesso individual apenas ao Perfil.
    const userRole = role?.toLowerCase() || '';
    const hasBrandingAccess = ['admin', 'superadmin', 'super_admin', 'super administrador', 'super admin', 'super_administrador'].includes(userRole);

    const tabs = [
        { id: 'profile', label: 'Perfil' },
        ...(hasBrandingAccess ? [{ id: 'branding', label: 'Branding' }] : [])
    ];

    if (loading) return null;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground text-center md:text-left">
                    {activeTab === 'profile' ? 'Meu Perfil' : 'Branding da Empresa'}
                </h1>
                <div className="h-px bg-foreground/25 w-full md:hidden mt-2 mb-6" />
            </div>

            {/* Tab Navigation */}
            {tabs.length > 1 && (
                <div className="flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => router.push(`/settings?tab=${tab.id}`)}
                                className={`px-6 py-3 text-sm font-bold transition-all relative ${activeTab === tab.id
                                    ? 'text-foreground border-b-[3px] active-tab-indicator'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Botão Salvar para Branding no Desktop */}
                    {activeTab === 'branding' && (
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('trigger-save-settings'))}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold hover:opacity-90 transition-opacity text-sm"
                        >
                            Salvar Alterações
                        </button>
                    )}
                </div>
            )}

            <div>
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'branding' && hasBrandingAccess && <BrandingTab />}
            </div>
        </div>
    );
}
