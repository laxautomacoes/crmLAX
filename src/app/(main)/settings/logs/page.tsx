
import { getProfile } from '@/app/_actions/profile';
import { LogsTable } from '@/components/settings/logs/LogsTable';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
    const { profile, error } = await getProfile();

    if (error || !profile) {
        redirect('/login');
    }

    const userRole = profile.role?.toLowerCase() || '';
    const isAdmin = ['admin', 'superadmin', 'super_admin', 'super administrador', 'super admin', 'super_administrador'].includes(userRole);

    if (!isAdmin) {
        redirect('/dashboard');
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader 
                title="Logs do Sistema" 
                subtitle="Registro completo de atividades e eventos da plataforma." 
            />

            <hr className="hidden md:block border-border" />

            <LogsTable tenantId={profile.tenant_id} />
        </div>
    );
}
