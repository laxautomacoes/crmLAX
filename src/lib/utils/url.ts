import { TenantInfo } from './tenant-types';

/**
 * Retorna a URL base do tenant (Domínio Próprio ou Subdomínio).
 */
export function getTenantBaseUrl(tenant: { 
    slug: string; 
    custom_domain?: string | null; 
    custom_domain_verified?: boolean | null 
}): string {
    const isDev = process.env.NODE_ENV === 'development';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
    const protocol = isDev ? 'http' : 'https';

    // Se estiver em dev, usa sempre o localhost com slug se for necessário, 
    // mas para links externos simulamos o domínio
    if (isDev) {
        return `${protocol}://${rootDomain}`;
    }

    // Se tiver domínio customizado verificado, usa ele
    if (tenant.custom_domain && tenant.custom_domain_verified) {
        return `${protocol}://${tenant.custom_domain}`;
    }

    // Fallback para subdomínio
    return `${protocol}://${tenant.slug}.${rootDomain}`;
}

/**
 * Gera o link completo para um property no site vitrine.
 * Prioriza URLs semânticas (com slug) quando disponíveis.
 */
export function getPropertyUrl(tenant: { 
    slug: string; 
    custom_domain?: string | null; 
    custom_domain_verified?: boolean | null 
}, propertyId: string, propertySlug?: string | null, propertyType?: string | null): string {
    const baseUrl = getTenantBaseUrl(tenant);
    const isDev = process.env.NODE_ENV === 'development';

    // Se tiver slug semântico, usar URL SEO-friendly
    if (propertySlug && propertyType) {
        if (!isDev && tenant.custom_domain && tenant.custom_domain_verified) {
            return `${baseUrl}/imovel/${propertyType}/${propertySlug}`;
        }
        return `${baseUrl}/site/${tenant.slug}/imovel/${propertyType}/${propertySlug}`;
    }

    // Fallback para URL com UUID (links antigos)
    if (!isDev && tenant.custom_domain && tenant.custom_domain_verified) {
        return `${baseUrl}/property/${propertyId}`;
    }

    return `${baseUrl}/site/${tenant.slug}/property/${propertyId}`;
}

/**
 * Gera o link para o site vitrine (Home).
 */
export function getSiteUrl(tenant: { 
    slug: string; 
    custom_domain?: string | null; 
    custom_domain_verified?: boolean | null 
}): string {
    const baseUrl = getTenantBaseUrl(tenant);
    const isDev = process.env.NODE_ENV === 'development';

    if (!isDev && tenant.custom_domain && tenant.custom_domain_verified) {
        return baseUrl;
    }

    return `${baseUrl}/site/${tenant.slug}`;
}
