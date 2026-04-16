'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/app/_actions/profile';
import { listInvitations } from '@/app/_actions/invitations';
import { PageHeader } from '@/components/shared/PageHeader';
import { InvitationsTable } from '@/components/settings/team/InvitationsTable';
import { InviteUserModal } from '@/components/settings/team/InviteUserModal';
import { Search, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function TeamSettingsPage() {
    const router = useRouter();
    const [fetching, setFetching] = useState(true);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const loadInvitations = async () => {
        setFetching(true);
        const { invitations: data, error } = await listInvitations();
        if (!error) setInvitations(data || []);
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
                await loadInvitations();
            } catch (err) {
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Gestão da Equipe"
                subtitle="Administre os colaboradores e convites da sua empresa"
            >
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-72 order-2 md:order-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar colaborador..."
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-[#FFE600] text-[#404F4F] px-4 py-3 md:py-2 rounded-lg text-sm font-bold hover:bg-[#F2DB00] transition-all shadow-sm active:scale-[0.99] whitespace-nowrap flex-1 md:flex-none order-1 md:order-2"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Colaborador
                    </button>
                </div>
            </PageHeader>

            <div className="w-full">
                <InvitationsTable
                    invitations={invitations}
                    fetching={fetching}
                    onRefresh={loadInvitations}
                    searchTerm={searchTerm}
                />
            </div>

            <InviteUserModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={loadInvitations}
            />
        </div>
    );
}
