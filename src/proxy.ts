import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isPublicRoute, isSiteRequest } from '@/lib/utils/tenant'
import { getTenantByHostname } from '@/lib/utils/tenant-query'

export default async function proxy(request: NextRequest) {
    const hostname = request.headers.get('host') || ''
    const pathname = request.nextUrl.pathname

    // 1. Identificar tenant pelo hostname (subdomínio ou custom domain)
    const tenant = await getTenantByHostname(hostname)

    // 2. Se for request de site público e temos tenant, redirecionar para /site/[slug]
    if (tenant && !isSiteRequest(pathname) && !pathname.startsWith('/dashboard') && !pathname.startsWith('/api')) {
        // Se acessando raiz do site do tenant, redirecionar para /site/[slug]
        if (pathname === '/') {
            const url = request.nextUrl.clone()
            url.pathname = `/site/${tenant.slug}`
            return NextResponse.redirect(url)
        }
    }

    // 3. Criar cliente Supabase para autenticação
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
        const response = NextResponse.next({
            request: {
                headers: new Headers(request.headers),
            },
        })
        response.headers.set('x-tenant-id', tenant.id)
        response.headers.set('x-tenant-slug', tenant.slug)
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
