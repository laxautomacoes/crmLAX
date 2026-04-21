'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { BrandingTab } from '@/components/settings/BrandingTab';
import { DomainTab } from '@/components/settings/DomainTab';
import { EmailSettingsForm } from '@/components/settings/emails/EmailSettingsForm';
import { getProfile } from '@/app/_actions/profile';
import { Save, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

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
        { id: 'profile', label: 'Perfil' }
    ];

    if (hasBrandingAccess) {
        tabs.push({ id: 'identity', label: 'Identidade' });
        tabs.push({ id: 'emails', label: 'E-mails' });
        tabs.push({ id: 'domain', label: 'Domínio' });
    }

    if (loading) return null;

    const getPageTitle = () => {
        switch (activeTab) {
            case 'profile': return 'Meu Perfil';
            case 'identity': return 'Identidade da Empresa';
            case 'emails': return 'Configurações de E-mail';
            case 'domain': return 'Domínio Personalizado';
            default: return 'Configurações';
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <PageHeader title={getPageTitle()} />

            {/* Tab Navigation */}
            {tabs.length > 1 && (
                <div className="flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => router.push(`/settings?tab=${tab.id}`)}
                                className={`px-6 py-3 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-foreground border-b-[3px] active-tab-indicator'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div>
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'identity' && <BrandingTab />}
                {activeTab === 'emails' && <EmailSettingsForm />}
                {activeTab === 'domain' && <DomainTab />}
            </div>
        </div>
    );
}
