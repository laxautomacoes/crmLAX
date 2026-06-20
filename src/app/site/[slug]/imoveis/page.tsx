import { getTenantFromHeaders, getTenantBySlug, getTenantWhatsApp } from '@/lib/utils/tenant';
import { createClient } from '@/lib/supabase/server';
import { SiteClient } from '@/components/site/SiteClient';
import { TrackPageView } from '@/components/site/TrackPageView';
import { SiteThemeProvider } from '@/components/site/SiteThemeProvider';
import { SiteJsonLd } from '@/components/site/SiteJsonLd';
import { SiteHeader } from '@/components/site/SiteHeader';
import type { Metadata } from 'next';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const tenant = await getTenantFromHeaders() || await getTenantBySlug(slug);
    if (!tenant) return { title: 'Site não encontrado' };
    const tenantName = tenant.name?.replace(' - ADM', '') || tenant.name;
    return {
        title: `Imóveis — ${tenantName}`,
        description: `Confira nossos imóveis disponíveis. Encontre casas, apartamentos, terrenos e mais com ${tenantName}.`,
        icons: {
            icon: tenant.branding?.site_favicon || tenant.branding?.logo_icon || '/logo-icon.png',
        },
    };
}

export default async function SiteImoveisPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const tenant = await getTenantFromHeaders() || await getTenantBySlug(slug);

    if (!tenant) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-background">
                <h1 className="text-4xl font-bold text-destructive">Loja não encontrada</h1>
                <p className="mt-4 text-xl text-muted-foreground">A loja solicitada não existe ou não está disponível.</p>
            </div>
        );
    }

    let properties: any[] = [];
    let featuredProperties: any[] = [];
    let whatsappNumber: string | null = null;

    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (!error && data) {
            properties = data.filter((a: any) => 
                ['disponível', 'disponivel', 'available'].includes(a.status?.toLowerCase())
            );
            featuredProperties = properties.filter((p: any) => p.is_featured);
        }
        whatsappNumber = await getTenantWhatsApp(tenant.id);
    } catch (err) {
        console.error('Error in SiteImoveisPage:', err);
    }

    const tenantName = tenant.name?.replace(' - ADM', '') || tenant.name;
    const url = tenant.custom_domain && tenant.custom_domain_verified
        ? `https://${tenant.custom_domain}/imoveis`
        : `https://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online'}/site/${tenant.slug}/imoveis`;

    return (
        <SiteThemeProvider theme={tenant.branding?.site_theme}>
            <div className="min-h-screen bg-background">
                <TrackPageView tenantId={tenant.id} />
                <SiteJsonLd
                    tenantName={tenantName}
                    description={tenant.branding?.site_description}
                    logoUrl={tenant.branding?.site_logo || tenant.branding?.logo_full}
                    address={tenant.branding?.address}
                    socialLinks={tenant.branding?.social_links}
                    url={url}
                />
                <SiteHeader
                    tenantName={tenantName}
                    logoSrc={tenant.branding?.site_logo || tenant.branding?.logo_header || tenant.branding?.logo_full}
                    logoHeight={tenant.branding?.site_logo_height || tenant.branding?.logo_header_height || tenant.branding?.logo_height}
                    sections={tenant.branding?.site_sections}
                    whatsappNumber={whatsappNumber}
                    socialLinks={tenant.branding?.social_links}
                />
                <div className="pt-20 max-w-[1600px] mx-auto px-4 py-8">
                    <h1 className="sr-only">Imóveis - {tenantName}</h1>
                    <SiteClient
                        properties={properties}
                        featuredProperties={featuredProperties}
                        tenantName={tenantName}
                        tenantSlug={tenant.slug}
                        whatsappNumber={whatsappNumber}
                        branding={tenant.branding}
                        isHomepage={false}
                    />
                </div>
            </div>
        </SiteThemeProvider>
    );
}
