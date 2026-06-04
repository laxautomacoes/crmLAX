'use client';

interface RealEstateAgentJsonLdProps {
    tenantName: string;
    description?: string;
    logoUrl?: string;
    address?: {
        street?: string;
        number?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        zip_code?: string;
    };
    socialLinks?: {
        instagram?: string;
        facebook?: string;
        linkedin?: string;
        youtube?: string;
        whatsapp?: string;
    };
    url: string;
}

export function SiteJsonLd({ tenantName, description, logoUrl, address, socialLinks, url }: RealEstateAgentJsonLdProps) {
    const sameAs: string[] = [];
    if (socialLinks?.instagram) sameAs.push(socialLinks.instagram.startsWith('http') ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram}`);
    if (socialLinks?.facebook) sameAs.push(socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`);
    if (socialLinks?.linkedin) sameAs.push(socialLinks.linkedin.startsWith('http') ? socialLinks.linkedin : `https://linkedin.com/company/${socialLinks.linkedin}`);
    if (socialLinks?.youtube) sameAs.push(socialLinks.youtube.startsWith('http') ? socialLinks.youtube : `https://youtube.com/${socialLinks.youtube}`);

    const jsonLd: any = {
        '@context': 'https://schema.org',
        '@type': 'RealEstateAgent',
        name: tenantName,
        url,
    };

    if (description) jsonLd.description = description;
    if (logoUrl) {
        jsonLd.logo = logoUrl;
        jsonLd.image = logoUrl;
    }

    if (address && (address.street || address.city)) {
        jsonLd.address = {
            '@type': 'PostalAddress',
            ...(address.street && { streetAddress: `${address.street}${address.number ? `, ${address.number}` : ''}` }),
            ...(address.neighborhood && { addressLocality: address.neighborhood }),
            ...(address.city && { addressRegion: address.city }),
            ...(address.state && { addressCountry: 'BR' }),
            ...(address.zip_code && { postalCode: address.zip_code }),
        };

        if (address.city) {
            jsonLd.areaServed = {
                '@type': 'City',
                name: address.city,
            };
        }
    }

    if (sameAs.length > 0) jsonLd.sameAs = sameAs;

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

interface PropertyJsonLdProps {
    property: any;
    tenantName: string;
    url: string;
}

function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        house: 'Casa', apartment: 'Apartamento', land: 'Terreno',
        commercial: 'Comercial', penthouse: 'Cobertura', studio: 'Studio',
        rural: 'Rural', warehouse: 'Galpão', office: 'Sala/Escritório', store: 'Loja',
    };
    return labels[type] || type;
}

export function PropertyJsonLd({ property, tenantName, url }: PropertyJsonLdProps) {
    const neighborhood = property.details?.endereco?.bairro || '';
    const city = property.details?.endereco?.cidade || '';
    const state = property.details?.endereco?.estado || '';

    const jsonLd: any = {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: property.title,
        url,
        datePosted: property.created_at,
    };

    if (property.description) jsonLd.description = property.description;

    if (property.images?.length > 0) {
        jsonLd.image = property.images;
    }

    if (property.price) {
        jsonLd.offers = {
            '@type': 'Offer',
            price: Number(property.price),
            priceCurrency: 'BRL',
            availability: 'https://schema.org/InStock',
            seller: {
                '@type': 'RealEstateAgent',
                name: tenantName,
            },
        };
    }

    if (neighborhood || city) {
        jsonLd.contentLocation = {
            '@type': 'Place',
            name: [neighborhood, city, state].filter(Boolean).join(', '),
            address: {
                '@type': 'PostalAddress',
                ...(neighborhood && { addressLocality: neighborhood }),
                ...(city && { addressRegion: city }),
                ...(state && { addressCountry: 'BR' }),
            },
        };
    }

    // Property type
    const typeLabel = getTypeLabel(property.type);
    jsonLd.additionalType = typeLabel;

    // Bedrooms, area
    const area = property.details?.area_privativa || property.details?.area_total;
    const bedrooms = property.details?.quartos || property.details?.dormitorios;

    if (area) {
        jsonLd.floorSize = {
            '@type': 'QuantitativeValue',
            value: Number(area),
            unitText: 'SQM',
        };
    }

    if (bedrooms) {
        jsonLd.numberOfRooms = Number(bedrooms);
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

interface BreadcrumbJsonLdProps {
    items: { name: string; url: string }[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}
