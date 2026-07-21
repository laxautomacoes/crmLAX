import { getProfile } from '@/app/_actions/profile'
import { getMarketingCampaigns } from '@/app/_actions/marketing-ads'
import { MarketingAdsClient } from '@/components/marketing/ads/MarketingAdsClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function MarketingAdsPage() {
    const { profile, error: profileError } = await getProfile()

    if (profileError || !profile || !profile.tenant_id) {
        return (
            <div className="p-8 text-center text-red-500 font-bold">
                Erro ao carregar perfil. Por favor, faça login novamente.
            </div>
        )
    }

    const res = await getMarketingCampaigns(profile.tenant_id)

    const initialCampaigns = res.data || []
    const initialMetrics = res.metrics || {
        totalInvestimento: 0,
        totalLeads: 0,
        cplMedio: 0,
        canaisAtivos: 0
    }

    return (
        <MarketingAdsClient
            tenantId={profile.tenant_id}
            initialCampaigns={initialCampaigns}
            initialMetrics={initialMetrics}
        />
    )
}
