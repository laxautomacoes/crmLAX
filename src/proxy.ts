import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicRoute, isSiteRequest } from '@/lib/utils/tenant'
import { getTenantByHostname, getTenantBySlug } from '@/lib/utils/tenant-query'
import { handleSecurityValidation, handleCompulsoryRedirects } from '@/lib/utils/proxy-handlers'

/**
 * Proxy (Antigo Middleware) - Padrão Next.js 16
 * Gerencia roteamento multi-tenant, autenticação e segurança.
 */
export default async function proxy(request: NextRequest) {
    const hostname = request.headers.get('host') || ''
    const pathname = request.nextUrl.pathname
    const isCRMRequest = hostname.startsWith('crm.') || hostname.includes('crm.laxperience.online');
    
    // 1. Identificação do Tenant
    let tenant = await getTenantByHostname(hostname);
    if (!tenant && pathname.startsWith('/site/')) {
        const slug = pathname.split('/')[2];
        if (slug) tenant = await getTenantBySlug(slug);
    }

    // 2. Roteamento Especial (Landing Page do Sistema)
    if (hostname.includes('crm.laxperience.online') && pathname === '/') {
        return NextResponse.rewrite(new URL('/conheca', request.url))
    }

    // 3. Roteamento de Vitrine (Rewrites de Domínios Customizados/Subdomínios)
    if (tenant && !isCRMRequest && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !isPublicRoute(pathname)) {
        if (pathname === '/') return NextResponse.rewrite(new URL(`/site/${tenant.slug}`, request.url));
        if (tenant.custom_domain && hostname.includes(tenant.custom_domain) && !pathname.startsWith('/site/')) {
            return NextResponse.rewrite(new URL(`/site/${tenant.slug}${pathname}`, request.url));
        }
    }

    // 4. Configuração Supabase (Edge-friendly)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    let supabaseResponse = NextResponse.next({ request });
    
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (cookiesToSet) => {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                supabaseResponse = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
            },
        },
    });

    const { data: { user } } = await supabase.auth.getUser();

    // 5. Proteção de Rotas Privadas
    if (!user && !isPublicRoute(pathname) && !isSiteRequest(pathname)) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 6. Lógicas Auxiliares (Handlers Modulares)
    const appRoutes = ['/dashboard', '/leads', '/clients', '/agenda', '/notes', '/notifications', '/properties', '/reports', '/roadmap', '/settings', '/tools', '/site'];
    const isAppRoute = appRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

    const securityRedirect = await handleSecurityValidation(request, supabase, user, tenant, isAppRoute);
    if (securityRedirect) return securityRedirect;

    const compulsoryRedirect = handleCompulsoryRedirects(request, tenant, isCRMRequest, isAppRoute);
    if (compulsoryRedirect) return compulsoryRedirect;

    // 7. Inject Headers de Tenant e Sincronizar Cookies
    if (tenant) {
        if (tenant.status === 'suspended' && !isPublicRoute(pathname) && pathname !== '/suspended') {
            return NextResponse.redirect(new URL('/suspended', request.url));
        }
        
        const response = NextResponse.next({ 
            request: { headers: new Headers(request.headers) } 
        });
        response.headers.set('x-tenant-id', tenant.id);
        response.headers.set('x-tenant-slug', tenant.slug);
        
        // Copiar cookies do Supabase SSR para a resposta final
        supabaseResponse.cookies.getAll().forEach(c => {
            response.cookies.set(c.name, c.value, { ...c });
        });
        return response;
    }

    return supabaseResponse;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
