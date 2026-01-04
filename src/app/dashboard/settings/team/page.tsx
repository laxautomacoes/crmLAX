'use client';

import { useState, useEffect } from 'react';
import { listInvitations } from '@/app/_actions/invitations';
import { InviteForm } from '@/components/settings/team/InviteForm';
import { InvitationsTable } from '@/components/settings/team/InvitationsTable';

export default function TeamSettingsPage() {
    const [fetching, setFetching] = useState(true);
    const [invitations, setInvitations] = useState<any[]>([]);

    const loadInvitations = async () => {
        setFetching(true);
        const { invitations, error } = await listInvitations();
        if (!error) setInvitations(invitations || []);
        setFetching(false);
    };

    useEffect(() => {
        loadInvitations();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-[#404F4F]">Gestão da Equipe</h2>
                <p className="text-gray-500">Convide novos membros para colaborar no CRM LAX</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <InviteForm onInviteCreated={loadInvitations} />
                </div>
                <div className="lg:col-span-2">
                    <InvitationsTable invitations={invitations} fetching={fetching} onRefresh={loadInvitations} />
                </div>
            </div>
        </div>
    );
}
