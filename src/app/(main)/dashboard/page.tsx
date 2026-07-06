import { getDashboardMetrics, getROIMetrics } from '@/app/_actions/dashboard';
import { getProfile } from '@/app/_actions/profile';
import DashboardClient from '@/components/dashboard/DashboardClient';
import type { ROIMetrics } from '@/app/_actions/dashboard';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

    const supabase = await createClient();
    const isAdmin = profile.role === 'admin' || profile.role === 'superadmin';

    const [metricsResult, roiResult, sourcesResult, membersResult] = await Promise.all([
        getDashboardMetrics(profile.tenant_id),
        getROIMetrics(profile.tenant_id),
        supabase
            .from('lead_sources')
            .select('id, name')
            .eq('tenant_id', profile.tenant_id)
            .order('name', { ascending: true }),
        isAdmin
            ? supabase
                .from('profiles')
                .select('id, full_name')
                .eq('tenant_id', profile.tenant_id)
                .eq('is_archived', false)
                .order('full_name', { ascending: true })
            : Promise.resolve({ data: [] })
    ]);

    const metrics = metricsResult.success && metricsResult.data ? metricsResult.data : {
        kpis: {
            leadsAtivos: 0,
            leadsAtivosTrend: '+0%',
            properties: 0,
            propertiesTrend: '+0',
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

    // Dados para popular os filtros dinâmicos
    const filterOptions = {
        stages: (metrics.funnelSteps || []).map((step: any) => ({
            id: step.stageId,
            name: step.label,
            color: step.color
        })),
        sources: (sourcesResult.data || []).map((s: any) => ({ id: s.id, name: s.name })),
        members: (membersResult.data || []).map((m: any) => ({ id: m.id, name: m.full_name })),
    };

    return (
        <DashboardClient 
            metrics={metrics} 
            roiData={roiData}
            profileName={profile.full_name} 
            tenantId={profile.tenant_id} 
            userRole={profile.role}
            isAdmin={isAdmin}
            filterOptions={filterOptions}
        />
    );
}
