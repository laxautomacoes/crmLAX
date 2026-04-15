import { getProfile } from '@/app/_actions/profile';
import { LogsTable } from '@/components/settings/logs/LogsTable';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';

export const dynamic = 'force-dynamic';

export default async function SuperadminLogsPage() {
    const { profile, error } = await getProfile();

    if (error || !profile) {
        redirect('/login');
    }

    const isSuperadmin = ['superadmin', 'super_admin', 'super administrador'].includes(profile.role?.toLowerCase() || '');

    if (!isSuperadmin) {
        redirect('/dashboard');
    }

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <LogsTable tenantId={profile.tenant_id} />
        </div>
    );
}
