import { getProfile } from '@/app/_actions/profile'
import { getPropertyBySlug } from '@/app/_actions/properties'
import { checkPlanFeatureAction } from '@/app/_actions/plan'
import { PropertyDetailsContent } from '@/components/dashboard/properties/PropertyDetailsContent'
import { Modal } from '@/components/shared/Modal'
import { InterceptedModalClose } from './InterceptedModalClose'

export const dynamic = 'force-dynamic'

interface PropertyModalProps {
    params: Promise<{
        type: string
        slug: string
    }>
}

export default async function PropertyInterceptedModal({ params }: PropertyModalProps) {
    const { type, slug } = await params
    const { profile } = await getProfile()

    if (!profile || !profile.tenant_id) return null

    const [propertyResult, aiAccess, marketingAccess] = await Promise.all([
        getPropertyBySlug(type, slug),
        checkPlanFeatureAction(profile.tenant_id, 'ai'),
        checkPlanFeatureAction(profile.tenant_id, 'marketing'),
    ])

    if (!propertyResult.success || !propertyResult.data) return null

    const prop = propertyResult.data

    return (
        <Modal isOpen={true} onClose={() => {}} title={null} size="xl">
            <div className="relative">
                <InterceptedModalClose />
                <PropertyDetailsContent 
                    prop={prop}
                    userRole={profile.role || 'user'}
                    hasAIAccess={aiAccess}
                    hasMarketingAccess={marketingAccess}
                    tenantId={profile.tenant_id}
                    isModal={true}
                />
            </div>
        </Modal>
    )
}
