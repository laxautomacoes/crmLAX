import { getTenantBySlug } from '@/lib/utils/tenant';
import { getAssetById } from '@/app/_actions/assets';
import { getBrokerProfile } from '@/app/_actions/profile';
import { PropertyPublicView } from '@/components/site/PropertyPublicView';
import { notFound } from 'next/navigation';

export default async function PropertyPage({ params, searchParams }: any) {
    const { slug, id } = await params;
    const sParams = await searchParams;
    const { b: brokerId } = sParams;

    const tenant = await getTenantBySlug(slug);
    if (!tenant) notFound();

    const { data: asset, success } = await getAssetById(id);
    if (!success || !asset) notFound();
    
    let broker = null;
    if (brokerId) {
        const { data } = await getBrokerProfile(brokerId);
        broker = data;
    } else if (asset.created_by) {
        // Fallback to the broker who created the asset
        const { data } = await getBrokerProfile(asset.created_by);
        broker = data;
    }

    // Extract configuration from searchParams
    const config = {
        title: sParams.ct !== '0',
        price: sParams.cp !== '0',
        description: (sParams.cd === 'n' ? 'none' : 'full') as 'none' | 'full',
        location: (sParams.cl === 'e' ? 'exact' : (sParams.cl === 'n' ? 'none' : 'approximate')) as 'none' | 'exact' | 'approximate',
        showBedrooms: sParams.cbr !== '0',
        showSuites: sParams.cst !== '0',
        showArea: sParams.car !== '0',
        showType: sParams.cty !== '0',
        imageIndices: sParams.ci ? sParams.ci.split(',').map(Number) : null,
        videoIndices: sParams.cv ? sParams.cv.split(',').map(Number) : null,
        docIndices: sParams.cdoc ? sParams.cdoc.split(',').map(Number) : null,
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a href={`/site/${slug}`} className="text-xl font-black text-foreground hover:text-secondary transition-colors">
                        {tenant.name}
                    </a>
                </div>
            </div>
            <PropertyPublicView asset={asset} broker={broker} tenant={tenant} config={config} />
        </div>
    );
}
