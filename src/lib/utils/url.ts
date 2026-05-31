import { checkIsDev, getRootDomain } from './domain';

/**
 * Retorna a URL base do tenant (Domínio Próprio ou Subdomínio).
 */
export function getTenantBaseUrl(tenant: { 
    slug: string; 
    custom_domain?: string | null; 
    custom_domain_verified?: boolean | null 
}): string {
    const isDev = checkIsDev();
    const rootDomain = getRootDomain();
    const isRealDomain = !rootDomain.includes('localhost') && !rootDomain.includes('127.0.0.1') && !rootDomain.includes('.local');
    const protocol = isDev && !isRealDomain ? 'http' : 'https';

    // Em dev local (localhost), retorna localhost diretamente
    if (isDev && !isRealDomain) {
        return `${protocol}://${rootDomain}`;
    }

    // Se tiver domínio customizado verificado, usa ele
    if (tenant.custom_domain && tenant.custom_domain_verified) {
        return `${protocol}://${tenant.custom_domain}`;
    }

    // Fallback para subdomínio (funciona tanto em prod quanto em dev com domínio real)
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
    const isDev = checkIsDev();

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
    const isDev = checkIsDev();

    if (!isDev && tenant.custom_domain && tenant.custom_domain_verified) {
        return baseUrl;
    }

    return `${baseUrl}/site/${tenant.slug}`;
}


