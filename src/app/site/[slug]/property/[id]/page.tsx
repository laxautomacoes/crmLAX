import { getTenantBySlug } from '@/lib/utils/tenant';
import { getAssetById } from '@/app/_actions/assets';
import { getBrokerProfile } from '@/app/_actions/profile';
import { PropertyPublicView } from '@/components/site/PropertyPublicView';
import { notFound } from 'next/navigation';

export default async function PropertyPage({ params, searchParams }: any) {
    const { slug, id } = await params;
    const { b: brokerId } = await searchParams;

    const tenant = await getTenantBySlug(slug);
    if (!tenant) notFound();

    const { data: asset, success } = await getAssetById(id);
    if (!success || !asset) notFound();
    
    let broker = null;
    if (brokerId) {
        const { data } = await getBrokerProfile(brokerId);
        broker = data;
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a href={`/site/${slug}`} className="text-xl font-black text-foreground hover:text-secondary transition-colors">
                        {tenant.name}
                    </a>
                </div>
            </div>
            <PropertyPublicView asset={asset} broker={broker} tenant={tenant} />
        </div>
    );
}
