import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Durante o build (prerender), as variáveis de ambiente podem não estar disponíveis.
    // Retornamos um objeto que não falha na inicialização, mas informa o erro se usado.
    if (!supabaseUrl || !supabaseAnonKey) {
        return new Proxy({}, {
            get: () => {
                throw new Error(
                    "Supabase client used during prerender without environment variables. " +
                    "Ensure the page is marked with 'force-dynamic' or check your .env files."
                );
            }
        }) as any
    }

    return createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
