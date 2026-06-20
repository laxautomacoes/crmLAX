import { getTenantFromHeaders, getTenantBySlug, getTenantWhatsApp } from '@/lib/utils/tenant';
import { createClient } from '@/lib/supabase/server';
import { SiteSearchClient } from '@/components/site/SiteSearchClient';
import { Logo } from '@/components/shared/Logo';
import { SiteThemeProvider } from '@/components/site/SiteThemeProvider';
import { TrackPageView } from '@/components/site/TrackPageView';
import type { Metadata } from 'next';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const tenant = await getTenantFromHeaders() || await getTenantBySlug(slug);

    if (!tenant) {
        return { title: 'Site não encontrado' };
    }

    const tenantName = tenant.name?.replace(' - ADM', '') || tenant.name;

    return {
        title: `Busca de Imóveis — ${tenantName}`,
        description: `Encontre imóveis no mapa com ${tenantName}. Busca avançada com filtros e localização.`,
        icons: {
            icon: tenant.branding?.site_favicon || tenant.branding?.logo_icon || '/logo-icon.png',
        },
    };
}

export default async function SiteSearchPage({ params }: { params: Promise<{ slug: string }> }) {
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
        }

        whatsappNumber = await getTenantWhatsApp(tenant.id);
    } catch (err) {
        console.error('Unexpected error in SiteSearchPage:', err);
    }

    return (
        <SiteThemeProvider theme={tenant.branding?.site_theme}>
            <div className="min-h-screen bg-background">
                <TrackPageView tenantId={tenant.id} />
                <div className="max-w-[1600px] mx-auto px-4 py-8">
                    <div className="mb-12 flex flex-col items-start">
                        <a href={`/site/${slug}`}>
                            <Logo 
                                size="lg" 
                                src={tenant.branding?.site_logo || tenant.branding?.logo_full} 
                                height={tenant.branding?.site_logo_height || tenant.branding?.logo_height || 50} 
                            />
                        </a>
                        {!(tenant.branding?.site_logo || tenant.branding?.logo_full) && (
                            <a href={`/site/${slug}`}>
                                <h1 className="text-4xl font-bold text-foreground mt-2">{tenant.name}</h1>
                            </a>
                        )}
                    </div>

                    <SiteSearchClient
                        properties={properties}
                        tenantName={tenant.name}
                        tenantSlug={tenant.slug}
                        whatsappNumber={whatsappNumber}
                        branding={tenant.branding}
                    />
                </div>
            </div>
        </SiteThemeProvider>
    );
}
