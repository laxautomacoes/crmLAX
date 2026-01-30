'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProfile } from '@/app/_actions/profile';
import { listInvitations } from '@/app/_actions/invitations';
import { InviteForm } from '@/components/settings/team/InviteForm';
import { InvitationsTable } from '@/components/settings/team/InvitationsTable';

export const dynamic = 'force-dynamic';

export default function TeamSettingsPage() {
    const router = useRouter();
    const [fetching, setFetching] = useState(true);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    const loadInvitations = async () => {
        setFetching(true);
        const { invitations, error } = await listInvitations();
        if (!error) setInvitations(invitations || []);
        setFetching(false);
    };

    useEffect(() => {
        async function checkAccess() {
            try {
                const { profile, error } = await getProfile();

                if (error || !profile) {
                    console.error('Error fetching profile:', error);
                    router.push('/dashboard');
                    return;
                }

                // Check for allowed roles (including variations)
                const allowedRoles = ['admin', 'superadmin', 'super_admin', 'super administrador'];

                if (!allowedRoles.includes(profile.role?.toLowerCase())) {
                    console.warn('Unauthorized access attempt to team settings:', profile.role);
                    router.push('/dashboard');
                    return;
                }

                setIsAuthorized(true);
                await loadInvitations();
            } catch (err) {
                console.error('Unexpected error in checkAccess:', err);
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
            <div>
                <h2 className="text-2xl font-bold text-foreground">Gestão da Equipe</h2>
                <p className="text-muted-foreground">Convide novos membros para colaborar no CRM LAX</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <InviteForm onInviteCreated={loadInvitations} />
                </div>
                <div className="lg:col-span-2">
                    <InvitationsTable
                        invitations={invitations}
                        fetching={fetching}
                        onRefresh={loadInvitations}
                    />
                </div>
            </div>
        </div>
    );
}
