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

    // 3. Se for request de site público (não dashboard/api) e temos tenant
    if (tenant && !pathname.startsWith('/dashboard') && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
        // Se acessando raiz do site do tenant, redirecionar ou reescrever
        if (pathname === '/') {
            // Se for domínio customizado, fazemos um REWRITE interno para manter a URL limpa
            if (tenant.custom_domain && hostname.includes(tenant.custom_domain)) {
                return NextResponse.rewrite(new URL(`/site/${tenant.slug}`, request.url))
            }
            
            // Se for subdomínio padrão, fazemos REDIRECT para a estrutura de slugs (opcional, mas mantendo compatibilidade atual)
            const url = request.nextUrl.clone()
            url.pathname = `/site/${tenant.slug}`
            return NextResponse.redirect(url)
        }

        // Se o domínio for customizado e a URL não começar com /site/
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
