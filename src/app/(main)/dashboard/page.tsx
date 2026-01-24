import { getDashboardMetrics } from '@/app/_actions/dashboard';
import { getProfile } from '@/app/_actions/profile';
import DashboardClient from '@/components/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const { profile, error: profileError } = await getProfile();

    if (profileError || !profile || !profile.tenant_id) {
        return (
            <div className="p-8 text-center text-red-500">
                Erro ao carregar perfil. Por favor, faça login novamente.
            </div>
        );
    }

    const result = await getDashboardMetrics(profile.tenant_id);

    const metrics = result.success && result.data ? result.data : {
        kpis: {
            leadsAtivos: 0,
            leadsAtivosTrend: '+0%',
            imoveis: 0,
            imoveisTrend: '+0',
            conversoes: 0,
            conversoesTrend: '+0'
        },
        funnelSteps: [],
        recentLeads: []
    };

    return <DashboardClient metrics={metrics} profileName={profile.full_name} tenantId={profile.tenant_id} />;
}
