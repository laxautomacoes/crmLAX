import { getTenantFromHeaders, getTenantBySlug, getTenantWhatsApp } from '@/lib/utils/tenant';
import { createClient } from '@/lib/supabase/server';
import { SiteClient } from '@/components/site/SiteClient';
import { TrackPageView } from '@/components/site/TrackPageView';
import { SiteThemeProvider } from '@/components/site/SiteThemeProvider';
import { SiteJsonLd } from '@/components/site/SiteJsonLd';
import { SiteHeader } from '@/components/site/SiteHeader';
import type { Metadata } from 'next';

// ISR: revalida a cada 5 minutos para manter conteúdo fresco sem penalizar performance
export const revalidate = 300;

/**
 * Metadata dinâmica da Home do Site Vitrine.
 * Gera title, description, og:image e canonical adequados para SEO.
 * Prioriza branding.seo.meta_title/meta_description se preenchidos.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const tenant = await getTenantFromHeaders() || await getTenantBySlug(slug);

    if (!tenant) {
        return { title: 'Site não encontrado' };
    }

    const tenantName = tenant.name?.replace(' - ADM', '') || tenant.name;
    const city = tenant.branding?.address?.city || '';
    const state = tenant.branding?.address?.state || '';
    const locationStr = [city, state].filter(Boolean).join(', ');

    // Priorizar SEO customizado se existir
    const seo = tenant.branding?.seo || {};
    const title = seo.meta_title || `${tenantName} — Imóveis${locationStr ? ` em ${locationStr}` : ''}`;
    const description = seo.meta_description || `Encontre os melhores imóveis com ${tenantName}.${locationStr ? ` Atuando em ${locationStr}.` : ''} Apartamentos, casas, terrenos e mais. Acesse e confira!`;

    // Canonical URL
    const baseUrl = tenant.custom_domain && tenant.custom_domain_verified
        ? `https://${tenant.custom_domain}`
        : `https://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online'}`;

    const ogImage = seo.og_image || tenant.branding?.logo_full;

    return {
        title,
        description,
        ...(seo.meta_keywords && { keywords: seo.meta_keywords }),
        openGraph: {
            title,
            description,
            type: 'website',
            url: baseUrl,
            siteName: tenantName,
            ...(ogImage && {
                images: [{
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: tenantName,
                }],
            }),
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
        alternates: {
            canonical: baseUrl,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
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

        const { data, error: supabaseError } = await supabase
            .from('properties')
            .select('*')
            .eq('tenant_id', tenant.id)
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (supabaseError) {
            console.error('Supabase error fetching properties:', supabaseError);
        } else {
            properties = data?.filter((a: any) => 
                a.status?.toLowerCase() === 'disponível' || 
                a.status?.toLowerCase() === 'disponivel' ||
                a.status?.toLowerCase() === 'available'
            ) || [];

            // Separar imóveis em destaque
            featuredProperties = properties.filter((p: any) => p.is_featured);
        }

        whatsappNumber = await getTenantWhatsApp(tenant.id);
    } catch (err) {
        console.error('Unexpected error in SitePage:', err);
    }

    const tenantName = tenant.name?.replace(' - ADM', '') || tenant.name;

    return (
        <SiteThemeProvider theme={tenant.branding?.site_theme}>
            <div className="min-h-screen bg-background">
                <TrackPageView tenantId={tenant.id} />
                <SiteJsonLd
                    tenantName={tenantName}
                    description={tenant.branding?.site_description}
                    logoUrl={tenant.branding?.logo_full}
                    address={tenant.branding?.address}
                    socialLinks={tenant.branding?.social_links}
                    url={tenant.custom_domain && tenant.custom_domain_verified
                        ? `https://${tenant.custom_domain}`
                        : `https://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online'}`
                    }
                />
                <SiteHeader
                    tenantName={tenantName}
                    logoSrc={tenant.branding?.logo_header || tenant.branding?.logo_full}
                    logoHeight={tenant.branding?.logo_header_height || tenant.branding?.logo_height}
                    sections={tenant.branding?.site_sections}
                    whatsappNumber={whatsappNumber}
                    socialLinks={tenant.branding?.social_links}
                />
                <div className="pt-20 max-w-[1600px] mx-auto px-4 py-8">
                    {/* h1 sempre presente para SEO — oculto visualmente */}
                    <h1 className="sr-only">{tenantName}</h1>

                    <SiteClient
                        properties={properties}
                        featuredProperties={featuredProperties}
                        tenantName={tenantName}
                        tenantSlug={tenant.slug}
                        whatsappNumber={whatsappNumber}
                        branding={tenant.branding}
                    />
                </div>
            </div>
        </SiteThemeProvider>
    );
}
