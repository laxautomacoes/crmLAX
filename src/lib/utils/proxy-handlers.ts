import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getTenantByUserId } from './tenant-query'
import { isPublicRoute } from './tenant'

/**
 * Validação de Segurança: Domínio vs Tenant do Usuário
 * Impede que usuários acessem dashboards de outros tenants ou superadmin indevidamente.
 */
export async function handleSecurityValidation(
    request: NextRequest,
    supabase: SupabaseClient,
    user: any,
    tenant: any,
    isAppRoute: boolean
) {
    const pathname = request.nextUrl.pathname
    const hostname = request.headers.get('host') || ''

    if (!user || !tenant || !isAppRoute || isPublicRoute(pathname)) {
        return null;
    }

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, role')
            .eq('id', user.id)
            .maybeSingle();

        if (profile && profile.tenant_id !== tenant.id) {
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online';
            const redirectUrl = request.nextUrl.clone();
            
            if (profile.role === 'superadmin') {
                if (pathname === '/dashboard') {
                    redirectUrl.pathname = '/superadmin/dashboard';
                    return NextResponse.redirect(redirectUrl);
                }
                redirectUrl.hostname = `crm.${rootDomain}`;
            } else {
                if (pathname.startsWith('/superadmin')) {
                    redirectUrl.pathname = '/dashboard';
                    return NextResponse.redirect(redirectUrl);
                }

                const userTenant = await getTenantByUserId(supabase, user.id);
                if (userTenant) {
                    redirectUrl.hostname = userTenant.custom_domain && userTenant.custom_domain_crm_verified
                        ? `crm.${userTenant.custom_domain}`
                        : `${userTenant.slug}.${rootDomain}`;
                } else {
                    redirectUrl.hostname = `crm.${rootDomain}`;
                }
            }
            
            const currentCleanHost = hostname.split(':')[0];
            if (redirectUrl.hostname !== currentCleanHost) {
                return NextResponse.redirect(redirectUrl);
            }
        }
    } catch (error) {
        console.error('ERRO PROXY (Validação de Domínio):', error);
    }
    return null;
}

/**
 * Redirecionamentos Compulsórios (White-label)
 * Força o uso do domínio customizado quando disponível e verificado.
 */
export function handleCompulsoryRedirects(
    request: NextRequest,
    tenant: any,
    isCRMRequest: boolean,
    isAppRoute: boolean
) {
    const hostname = request.headers.get('host') || ''
    const pathname = request.nextUrl.pathname
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!tenant || isDevelopment) return null;

    const rootGlobalDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online').split(':')[0];
    const cleanHost = hostname.split(':')[0];
    const isMainSystemTenant = (tenant as any).is_system;

    // Redirecionamento de CRM
    if (!isMainSystemTenant && tenant.custom_domain && tenant.custom_domain_crm_verified) {
        const expectedCRMHost = `crm.${tenant.custom_domain}`;
        if (cleanHost !== expectedCRMHost && (isCRMRequest || isAppRoute)) {
            const customCRMUrl = new URL(request.url);
            customCRMUrl.hostname = expectedCRMHost;
            return NextResponse.redirect(customCRMUrl);
        }
    }
    
    // Redirecionamento de Vitrine
    if (!isMainSystemTenant && tenant.custom_domain && tenant.custom_domain_verified && !isCRMRequest && !isAppRoute) {
        const isTargetingRoot = pathname === '/' || (!pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.startsWith('/site/'));
        if (cleanHost.endsWith(rootGlobalDomain) && isTargetingRoot) {
            const customSiteUrl = new URL(request.url);
            customSiteUrl.hostname = tenant.custom_domain;
            return NextResponse.redirect(customSiteUrl);
        }
    }

    return null;
}
