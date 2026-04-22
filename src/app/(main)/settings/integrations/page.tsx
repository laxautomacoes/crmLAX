import { PageHeader } from '@/components/shared/PageHeader';
import { IntegrationsContent } from '@/components/settings/integrations/IntegrationsContent';
import { getProfile } from '@/app/_actions/profile';

export const metadata = {
    title: 'Integrações | CRM LAX',
    description: 'Conecte suas ferramentas favoritas para automatizar a captação e gestão de leads.',
};

export const dynamic = 'force-dynamic';

export default async function IntegrationsSettingsPage() {
    const { profile } = await getProfile();
    const tenant = profile?.tenants as { id?: string; slug?: string; custom_domain?: string } | undefined;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            <PageHeader 
                title="Integrações" 
                subtitle="Conecte suas ferramentas favoritas para automatizar a captação e gestão de leads."
            />

            <IntegrationsContent
                tenantId={tenant?.id || ''}
                slug={tenant?.slug}
                customDomain={tenant?.custom_domain}
            />
        </div>
    );
}
