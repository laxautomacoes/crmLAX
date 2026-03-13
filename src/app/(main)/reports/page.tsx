import { getProfile } from '@/app/_actions/profile';
import { getReportMetrics, getBrokers, getProperties } from '@/app/_actions/reports';
import ReportsClient from '@/components/reports/ReportsClient';
import { redirect } from 'next/navigation';
import { checkPlanFeature } from '@/lib/utils/plan-guard';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
    const { profile, error: profileError } = await getProfile();

    if (profileError || !profile || !profile.tenant_id) {
        redirect('/login');
    }

    const [metricsResult, brokers, properties, hasAIAccess] = await Promise.all([
        getReportMetrics(profile.tenant_id, '30_days'),
        getBrokers(profile.tenant_id),
        getProperties(profile.tenant_id),
        checkPlanFeature(profile.tenant_id, 'ai')
    ]);

    const initialMetrics = metricsResult.success && metricsResult.data ? metricsResult.data : {
        kpis: {
            totalLeads: 0,
            activeLeads: 0,
            conversions: 0,
            conversionRate: '0%'
        },
        leadsBySource: [],
        leadsEvolution: [],
        teamPerformance: [],
        topProperties: []
    };

    return (
        <ReportsClient
            initialMetrics={initialMetrics}
            tenantId={profile.tenant_id}
            brokers={brokers}
            properties={properties}
            userProfile={profile}
            hasAIAccess={hasAIAccess}
        />
    );
}
