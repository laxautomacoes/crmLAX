'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { BrandingTab } from '@/components/settings/BrandingTab';
import { User, Palette, FileText } from 'lucide-react';


import { TemplatesTab } from '@/components/settings/TemplatesTab';
import { getProfile } from '@/app/_actions/profile';
import { PageHeader } from '@/components/shared/PageHeader';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab');
    const [role, setRole] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            const { profile } = await getProfile();
            if (profile) {
                setRole(profile.role);
                setTenantId(profile.tenant_id);
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
        { id: 'profile', label: 'Perfil', icon: User }
    ];

    if (hasBrandingAccess) {
        tabs.push({ id: 'identity', label: 'Branding', icon: Palette });


        tabs.push({ id: 'templates', label: 'Templates', icon: FileText });
    }

    if (loading) return null;

    const getPageTitle = () => {
        switch (activeTab) {
            case 'profile': return 'Meu Perfil';
            case 'identity': return 'Branding da Empresa';


            case 'templates': return 'Templates de Proposta';
            default: return 'Configurações';
        }
    };

    const getPageSubtitle = () => {
        switch (activeTab) {
            case 'profile': 
                return 'Gerencie suas credenciais de acesso, foto de perfil e informações de contato.';
            case 'identity': 
                return 'Configure os logotipos e ícone/favicon da sua empresa.';
            case 'templates': 
                return 'Gerencie os modelos e templates de proposta comercial do sistema.';
            default: 
                return 'Gerencie as configurações da sua conta.';
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <PageHeader title={getPageTitle()} subtitle={getPageSubtitle()} />

            <hr className="hidden md:block border-border -mt-2" />

            {/* Tab Navigation */}
            {tabs.length > 1 ? (
                <div className="flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                onClick={() => router.push(`/settings?tab=${tab.id}`)}
                                className={`px-6 py-3 text-base font-bold transition-all relative flex items-center gap-2 whitespace-nowrap border-b-[3px] ${activeTab === tab.id
                                    ? 'text-foreground active-tab-indicator'
                                    : 'text-muted-foreground hover:text-foreground border-transparent'
                                    }`}
                            >
                                {tab.icon && <tab.icon size={14} strokeWidth={1} />}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="border-b border-border w-full py-3">
                    <div className="h-5" />
                </div>
            )}

            <div>
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'identity' && <BrandingTab />}


                {activeTab === 'templates' && tenantId && <TemplatesTab tenantId={tenantId} />}
            </div>
        </div>
    );
}
