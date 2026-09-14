import { getProfile } from '@/app/_actions/profile';
import { getProperties } from '@/app/_actions/properties';
import { redirect } from 'next/navigation';
import ViabilityClient from '@/components/properties/viability/ViabilityClient';

export const dynamic = 'force-dynamic';

export default async function ViabilityPage() {
    const { profile, error: profileError } = await getProfile();

    if (profileError || !profile || !profile.tenant_id) {
        redirect('/login');
    }

    // Busca apenas os imóveis publicados e do tenant
    const { success, data: properties } = await getProperties(profile.tenant_id);

    return (
        <ViabilityClient
            tenantId={profile.tenant_id}
            initialProperties={success && properties ? properties : []}
        />
    );
}
