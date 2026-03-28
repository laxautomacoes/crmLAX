import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicRoute, isSiteRequest } from '@/lib/utils/tenant'
import { getTenantByHostname, getTenantBySlug } from '@/lib/utils/tenant-query'

export default async function proxy(request: NextRequest) {
    const hostname = request.headers.get('host') || ''
    const pathname = request.nextUrl.pathname

    // 1. Identificar tenant pelo hostname (subdomínio ou custom domain)
    let tenant = await getTenantByHostname(hostname)

    // 2. Se não encontrou por hostname, tentar pelo path /site/[slug]
    if (!tenant && pathname.startsWith('/site/')) {
        const slug = pathname.split('/')[2]
        if (slug) {
            tenant = await getTenantBySlug(slug)
        }
    }

    // --- LÓGICA DE ROTEAMENTO ESPECIAL ---
    const isCRMRequest = hostname.startsWith('crm.') || hostname.includes('crm.laxperience.online');

    // Lista de rotas que pertencem ao APLICATIVO (Dashboard) e não devem ser redirecionadas para a vitrine
    const appRoutes = [
        '/dashboard',
        '/leads',
        '/clients',
        '/agenda',
        '/notes',
        '/notifications',
        '/properties',
        '/reports',
        '/roadmap',
        '/settings',
        '/tools',
        '/site', // Admin de configurações do site
        '/login',
        '/register',
        '/auth',
    ];

    const isAppRoute = appRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

    // 3. ESPECIAL: Se for o domínio principal do sistema (crm.laxperience.online)
    if (hostname.includes('crm.laxperience.online')) {
        // Se acessando raiz, mostrar landing page
        if (pathname === '/') {
            return NextResponse.rewrite(new URL('/conheca', request.url))
        }
        // Outras rotas (como /conheca, /login, ou rotas do app) seguem fluxo normal abaixo
    }

    // 4. Se temos um tenant identificado e NÃO é uma requisição de CRM (ou seja, é uma requisição de VITRINE)
    if (tenant && !isCRMRequest && !isAppRoute && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !isPublicRoute(pathname)) {
        
        // Se acessando raiz do tenant (subdomínio ou custom domain), reescrever para a vitrine
        if (pathname === '/') {
            // Se for domínio customizado, mantemos a URL limpa com rewrite
            if (tenant.custom_domain && hostname.includes(tenant.custom_domain)) {
                return NextResponse.rewrite(new URL(`/site/${tenant.slug}`, request.url))
            }
            
            // Se for subdomínio (não caiu no redirect acima), redirecionamos para manter compatibilidade
            const url = request.nextUrl.clone()
            url.pathname = `/site/${tenant.slug}`
            return NextResponse.redirect(url)
        }

        // Se o domínio for customizado e a URL não começar com /site/ nem for rota de sistema
        // fazemos o rewrite interno para /site/[slug]/...
        if (tenant.custom_domain && hostname.includes(tenant.custom_domain) && !pathname.startsWith('/site/')) {
            return NextResponse.rewrite(new URL(`/site/${tenant.slug}${pathname}`, request.url))
        }
    }

    // 3. Criar cliente Supabase para autenticação
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 4. Autenticação apenas para rotas que não são públicas
    if (!user && !isPublicRoute(pathname) && !isSiteRequest(pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // --- VALIDAÇÃO DE SEGURANÇA: DOMÍNIO VS TENANT DO USUÁRIO ---
    // Impede que um usuário (ou Super Admin) acesse o dashboard via domínio de outro cliente
    if (user && tenant && isAppRoute) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id, role')
            .eq('id', user.id)
            .maybeSingle();

        if (profile && profile.tenant_id !== tenant.id) {
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online';
            const redirectUrl = request.nextUrl.clone();
            
            // Caso especial: Super Admin sempre para o domínio de sistema
            if (profile.role === 'superadmin') {
                redirectUrl.hostname = `crm.${rootDomain}`;
            } else {
                // Usuário comum para seu próprio domínio verificado ou subdomínio
                const { getTenantByUserId } = await import('@/lib/utils/tenant-query');
                const userTenant = await getTenantByUserId(supabase, user.id);
                
                if (userTenant) {
                    redirectUrl.hostname = userTenant.custom_domain && userTenant.custom_domain_crm_verified
                        ? `crm.${userTenant.custom_domain}`
                        : `${userTenant.slug}.${rootDomain}`;
                } else {
                    redirectUrl.hostname = `crm.${rootDomain}`;
                }
            }
            
            // Não redirecionar se o hostname destino for o mesmo que o atual (evitar loop)
            if (redirectUrl.hostname === hostname.split(':')[0]) {
               // Prosseguir se as IDs baterem, senão algo está errado
            } else {
                return NextResponse.redirect(redirectUrl);
            }
        }
    }

    // 5. Se o tenant não foi identificado pelo hostname mas temos um usuário logado
    // tentamos identificar o tenant pelo perfil do usuário
    if (!tenant && user) {
        const { getTenantByUserId } = await import('@/lib/utils/tenant-query')
        tenant = await getTenantByUserId(supabase, user.id)
    }

    // --- LÓGICA DE REDIRECIONAMENTO COMPULSÓRIO (White-label Totalitário) ---
    if (tenant) {
        const rootGlobalDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'laxperience.online';
        const cleanHost = hostname.split(':')[0];
        const isMainSystemTenant = tenant.slug === 'lax'; // Slug do SuperAdmin

        // Se NÃO for o SuperAdmin e tiver domínio próprio verificado
        if (!isMainSystemTenant && tenant.custom_domain && tenant.custom_domain_crm_verified) {
            const expectedCRMHost = `crm.${tenant.custom_domain}`;
            
            // Se o host atual NÃO for o domínio profissional, forçar o redirecionamento
            if (cleanHost !== expectedCRMHost && (isCRMRequest || isAppRoute)) {
                const customCRMUrl = new URL(request.url);
                customCRMUrl.hostname = expectedCRMHost;
                return NextResponse.redirect(customCRMUrl);
            }
        }
        
        // Redirecionamento de Vitrine (opcional mas recomendado)
        if (!isMainSystemTenant && tenant.custom_domain && tenant.custom_domain_verified && !isCRMRequest && !isAppRoute) {
            if (cleanHost.endsWith(rootGlobalDomain) && (pathname === '/' || (!pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.startsWith('/site/')))) {
                const customSiteUrl = new URL(request.url);
                customSiteUrl.hostname = tenant.custom_domain;
                return NextResponse.redirect(customSiteUrl);
            }
        }
    }

    // 5. Adicionar header com tenant_id se identificado
    if (tenant) {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-tenant-id', tenant.id)
        requestHeaders.set('x-tenant-slug', tenant.slug)

        // Criar resposta com headers para o servidor
        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })

        // Copiar cookies da resposta do Supabase (importante para manter a sessão)
        supabaseResponse.cookies.getAll().forEach((cookie) => {
            response.cookies.set(cookie.name, cookie.value, {
                ...cookie,
                path: cookie.path,
                domain: cookie.domain,
                expires: cookie.expires,
                maxAge: cookie.maxAge,
                sameSite: cookie.sameSite,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
            })
        })

        return response
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
