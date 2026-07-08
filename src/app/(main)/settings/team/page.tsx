'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile, listTeamMembers } from '@/app/_actions/profile';
import { listInvitations } from '@/app/_actions/invitations';
import { PageHeader } from '@/components/shared/PageHeader';
import { InvitationsTable } from '@/components/settings/team/InvitationsTable';
import { InviteUserModal } from '@/components/settings/team/InviteUserModal';
import { Search, Plus } from 'lucide-react';
import { FormInput } from '@/components/shared/forms/FormInput';

export const dynamic = 'force-dynamic';

export default function TeamSettingsPage() {
    const router = useRouter();
    const [fetching, setFetching] = useState(true);
    const [teamItems, setTeamItems] = useState<any[]>([]);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const loadTeamData = async () => {
        setFetching(true);
        
        const [invRes, membersRes] = await Promise.all([
            listInvitations(),
            listTeamMembers()
        ]);

        const invitations = (invRes as any).invitations || [];
        const members = (membersRes as any).members || [];

        // Combinar e filtrar
        // Ocultar o admin adm@leoacosta.online conforme pedido do usuário
        const combined = [
            ...members.map((m: any) => ({ ...m, type: 'member', name: m.full_name })),
            ...invitations.map((i: any) => ({ ...i, type: 'invitation' }))
        ].filter(item => 
            item.email !== 'adm@leoacosta.online' && 
            item.role?.toLowerCase() !== 'admin'
        );

        setTeamItems(combined);
        setFetching(false);
    };

    useEffect(() => {
        async function checkAccess() {
            try {
                const { profile, error } = await getProfile();

                if (error || !profile) {
                    router.push('/dashboard');
                    return;
                }

                setIsAuthorized(true);
                await loadTeamData();
            } catch {
                router.push('/dashboard');
            }
        }
        checkAccess();
    }, [router]);


    if (isAuthorized === null) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Gestão da Equipe"
                subtitle="Administre os colaboradores e convites da sua empresa"
            >
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 w-full md:w-auto">
                    <div className="w-full md:w-[320px] md:flex-none order-2 md:order-1">
                        <FormInput
                            placeholder="Buscar colaborador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                            icon={Search}
                            iconSize={14}
                            iconStrokeWidth={1}
                            className="w-full h-[34px]"
                        />
                    </div>
                    <div className="grid grid-cols-1 justify-items-center md:grid-flow-col md:auto-cols-max gap-2 md:gap-3 w-full md:w-max order-1 md:order-2">
                        <button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="w-full md:w-auto md:min-w-[130px] h-[34px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm whitespace-nowrap"
                        >
                            <Plus size={14} strokeWidth={1} />
                            Novo Colaborador
                        </button>
                    </div>
                </div>
            </PageHeader>

            <hr className="hidden md:block border-border -mt-2" />

            <div className="w-full">
                <InvitationsTable
                    invitations={teamItems}
                    fetching={fetching}
                    onRefresh={loadTeamData}
                    searchTerm={searchTerm}
                />
            </div>

            <InviteUserModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={loadTeamData}
            />
        </div>
    );
}
