import { getTenantBySlug } from '@/lib/utils/tenant';
import { getPropertyBySlug } from '@/app/_actions/properties';
import { getBrokerProfile } from '@/app/_actions/profile';
import { PropertyPublicView } from '@/components/site/PropertyPublicView';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/shared/Logo';
import { TrackPageView } from '@/components/site/TrackPageView';
import { translatePropertyType } from '@/utils/property-translations';
import type { Metadata } from 'next';

// ISR: revalida a cada 5 minutos
export const revalidate = 300;

/**
 * Metadata dinâmica para a página individual do imóvel.
 * Otimizada para SEO com title, description, og:image, canonical e keywords.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string; type: string; propertySlug: string }> }): Promise<Metadata> {
    const { slug, type, propertySlug } = await params;

    const tenant = await getTenantBySlug(slug);
    if (!tenant) return { title: 'Imóvel não encontrado' };

    const { data: property } = await getPropertyBySlug(type, propertySlug);
    if (!property || property.tenant_id !== tenant.id) return { title: 'Imóvel não encontrado' };

    const tenantName = tenant.name?.replace(' - ADM', '') || tenant.name;
    const tipoTraduzido = translatePropertyType(property.type || type);
    const details = property.details || {};
    const bairro = details.endereco?.bairro || '';
    const cidade = details.endereco?.cidade || '';
    const dormitorios = details.dormitorios || details.quartos || 0;
    const area = details.area_util || details.area_privativa || details.area_total || 0;

    // Construir título SEO-friendly
    const titleParts = [property.title];
    if (dormitorios > 0) titleParts.push(`${dormitorios} quartos`);
    if (property.price && Number(property.price) > 0) {
        titleParts.push(`R$ ${Number(property.price).toLocaleString('pt-BR')}`);
    }
    const title = `${titleParts.join(' | ')} | ${tenantName}`;

    // Construir description SEO-friendly
    const descParts = [`${tipoTraduzido}`];
    if (dormitorios > 0) descParts.push(`com ${dormitorios} quartos`);
    if (area > 0) descParts.push(`${area}m²`);
    if (details.vagas > 0) descParts.push(`${details.vagas} vagas`);
    if (bairro) descParts.push(`no ${bairro}`);
    if (cidade) descParts.push(cidade);
    const description = `${descParts.join(', ')}. ${property.description?.substring(0, 120)?.replace(/\n/g, ' ') || `Confira este ${tipoTraduzido.toLowerCase()} disponível com ${tenantName}.`}`;

    // Canonical URL
    const baseUrl = tenant.custom_domain && tenant.custom_domain_verified
        ? `https://${tenant.custom_domain}`
        : `https://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online'}`;

    const canonicalUrl = tenant.custom_domain && tenant.custom_domain_verified
        ? `${baseUrl}/imovel/${type}/${propertySlug}`
        : `${baseUrl}/site/${slug}/imovel/${type}/${propertySlug}`;

    // Imagem de capa
    const ogImage = property.images?.[0] || tenant.branding?.logo_full;

    // Keywords
    const keywords = [
        tipoTraduzido.toLowerCase(),
        bairro,
        cidade,
        tenantName,
        'imóvel',
        'comprar',
        'alugar',
        dormitorios > 0 ? `${dormitorios} quartos` : '',
    ].filter(Boolean);

    return {
        title,
        description,
        keywords: keywords.join(', '),
        openGraph: {
            title,
            description,
            type: 'website',
            url: canonicalUrl,
            siteName: tenantName,
            ...(ogImage && {
                images: [{
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: property.title,
                }],
            }),
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            ...(ogImage && { images: [ogImage] }),
        },
        alternates: {
            canonical: canonicalUrl,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function PublicPropertyPage({ params, searchParams }: any) {
    const { slug, type, propertySlug } = await params;
    const sParams = await searchParams;
    const { b: brokerId } = sParams;

    const tenant = await getTenantBySlug(slug);
    if (!tenant) notFound();

    const { data: property, success } = await getPropertyBySlug(type, propertySlug);
    if (!success || !property) notFound();

    // Validar se o property pertence ao tenant
    if (property.tenant_id !== tenant.id) notFound();

    let broker = null;
    if (brokerId) {
        const { data } = await getBrokerProfile(brokerId);
        broker = data;
    } else if (property.created_by) {
        const { data } = await getBrokerProfile(property.created_by);
        broker = data;
    }

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

    // JSON-LD Structured Data — Schema.org RealEstateListing
    const details = property.details || {};
    const tipoTraduzido = translatePropertyType(property.type || type);
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: property.title,
        description: property.description?.substring(0, 500) || `${tipoTraduzido} disponível.`,
        url: tenant.custom_domain && tenant.custom_domain_verified
            ? `https://${tenant.custom_domain}/imovel/${type}/${propertySlug}`
            : `https://${tenant.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online'}/site/${slug}/imovel/${type}/${propertySlug}`,
        ...(property.price && Number(property.price) > 0 && {
            price: String(property.price),
            priceCurrency: 'BRL',
        }),
        ...(property.images?.length > 0 && {
            image: property.images,
        }),
        ...(details.endereco && {
            address: {
                '@type': 'PostalAddress',
                ...(details.endereco.rua && { streetAddress: `${details.endereco.rua}${details.endereco.numero ? `, ${details.endereco.numero}` : ''}` }),
                ...(details.endereco.bairro && { addressLocality: details.endereco.bairro }),
                ...(details.endereco.cidade && { addressRegion: details.endereco.cidade }),
                ...(details.endereco.estado && { addressCountry: 'BR' }),
            },
        }),
        ...((details.dormitorios || details.quartos) && {
            numberOfRooms: details.dormitorios || details.quartos,
        }),
        ...((details.area_util || details.area_privativa || details.area_total) && {
            floorSize: {
                '@type': 'QuantitativeValue',
                value: details.area_util || details.area_privativa || details.area_total,
                unitCode: 'MTK',
            },
        }),
        ...(details.vagas && {
            numberOfParkingSpaces: details.vagas,
        }),
        ...(broker && {
            agent: {
                '@type': 'RealEstateAgent',
                name: broker.full_name,
            },
        }),
        seller: {
            '@type': 'RealEstateAgent',
            name: tenant.name?.replace(' - ADM', '') || tenant.name,
            ...(tenant.branding?.logo_full && { image: tenant.branding.logo_full }),
        },
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* JSON-LD Structured Data para Rich Snippets */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            {/* Tracking de Page View */}
            <TrackPageView
                tenantId={tenant.id}
                propertyId={property.id}
                brokerId={brokerId || broker?.id}
                propertyTitle={property.title}
            />

            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a href={`/site/${slug}`} className="flex items-center transition-opacity hover:opacity-80">
                        {tenant.branding?.logo_full ? (
                            <Logo 
                                size="md" 
                                src={tenant.branding.logo_full} 
                                height={32}
                            />
                        ) : (
                            <span className="text-xl font-black text-foreground">{tenant.name}</span>
                        )}
                    </a>
                </div>
            </div>
            <PropertyPublicView property={property} broker={broker} tenant={tenant} config={config} />
        </div>
    );
}
