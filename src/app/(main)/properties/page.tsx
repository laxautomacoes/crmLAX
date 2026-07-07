import { getProfile } from '@/app/_actions/profile'
import { getProperties } from '@/app/_actions/properties'
import { checkPlanFeatureAction } from '@/app/_actions/plan'
import PropertiesClient from '@/components/dashboard/properties/PropertiesClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PropertiesPage() {
    const { profile, error: profileError } = await getProfile()

    if (profileError || !profile || !profile.tenant_id) {
        redirect('/login')
    }

    const [propertiesResult, aiAccess, marketingAccess] = await Promise.all([
        getProperties(profile.tenant_id, undefined, profile.id, profile.role || 'user'),
        checkPlanFeatureAction(profile.tenant_id, 'ai'),
        checkPlanFeatureAction(profile.tenant_id, 'marketing'),
    ])

    const initialProperties = propertiesResult.success ? (propertiesResult.data || []) : []

    return (
        <PropertiesClient
            initialProperties={initialProperties}
            tenantId={profile.tenant_id}
            tenantSlug={(profile as any).tenants?.slug || ''}
            userId={profile.id}
            userRole={profile.role || 'user'}
            hasAIAccess={aiAccess}
            hasMarketingAccess={marketingAccess}
        />
    )
}
