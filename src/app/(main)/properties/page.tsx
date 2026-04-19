import { getProfile } from '@/app/_actions/profile'
import { getAssets } from '@/app/_actions/assets'
import { getTenantByUserId } from '@/app/_actions/tenant'
import { checkPlanFeatureAction } from '@/app/_actions/plan'
import { initStorageBuckets } from '@/app/_actions/storage'
import PropertiesClient from '@/components/dashboard/properties/PropertiesClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PropertiesPage() {
    const { profile, error: profileError } = await getProfile()

    if (profileError || !profile || !profile.tenant_id) {
        redirect('/login')
    }

    // Inicializar buckets (best-effort, não bloqueia)
    try { await initStorageBuckets() } catch (_) {}

    const [assetsResult, tenant, aiAccess, marketingAccess] = await Promise.all([
        getAssets(profile.tenant_id, undefined, profile.id, profile.role || 'user'),
        getTenantByUserId(profile.id),
        checkPlanFeatureAction(profile.tenant_id, 'ai'),
        checkPlanFeatureAction(profile.tenant_id, 'marketing'),
    ])

    const initialProperties = assetsResult.success ? (assetsResult.data || []) : []

    return (
        <PropertiesClient
            initialProperties={initialProperties}
            tenantId={profile.tenant_id}
            tenantSlug={tenant?.slug || ''}
            userId={profile.id}
            userRole={profile.role || 'user'}
            hasAIAccess={aiAccess}
            hasMarketingAccess={marketingAccess}
        />
    )
}
