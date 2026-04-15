import { getDashboardMetrics, getROIMetrics } from '@/app/_actions/dashboard';
import { getProfile } from '@/app/_actions/profile';
import DashboardClient from '@/components/dashboard/DashboardClient';
import type { ROIMetrics } from '@/app/_actions/dashboard';
import { redirect } from 'next/navigation';

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

    // Redirecionar superadmin para o dashboard específico
    const isSuperAdmin = ['superadmin', 'super_admin', 'super administrador'].includes(profile.role?.toLowerCase() || '');
    if (isSuperAdmin) {
        redirect('/superadmin/dashboard');
    }

    const [metricsResult, roiResult] = await Promise.all([
        getDashboardMetrics(profile.tenant_id),
        getROIMetrics(profile.tenant_id)
    ]);

    const metrics = metricsResult.success && metricsResult.data ? metricsResult.data : {
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

    const roiData: ROIMetrics = roiResult.success && roiResult.data ? roiResult.data : {
        totalCustos: 0,
        totalReceita: 0,
        roi: 0,
        cpl: 0,
        leadsCount: 0
    };

    return (
        <DashboardClient 
            metrics={metrics} 
            roiData={roiData}
            profileName={profile.full_name} 
            tenantId={profile.tenant_id} 
            userRole={profile.role}
        />
    );
}
