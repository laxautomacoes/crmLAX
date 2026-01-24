import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Durante o build (prerender), as variáveis de ambiente podem não estar disponíveis.
    // Retornamos um objeto que não falha na inicialização, mas informa o erro se usado.
    if (!supabaseUrl || !supabaseAnonKey) {
        const errorMessage = "Supabase client used without environment variables. " +
            "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.";
        
        return new Proxy({}, {
            get: (target, prop) => {
                if (prop === 'auth') {
                    return {
                        getUser: async () => ({ data: { user: null }, error: new Error(errorMessage) }),
                        getSession: async () => ({ data: { session: null }, error: new Error(errorMessage) }),
                        signOut: async () => ({ error: new Error(errorMessage) }),
                    };
                }
                if (prop === 'from') {
                    return () => ({
                        select: () => ({
                            eq: () => ({
                                single: async () => ({ data: null, error: new Error(errorMessage) }),
                                maybeSingle: async () => ({ data: null, error: new Error(errorMessage) }),
                                order: () => ({
                                    limit: () => ({
                                        single: async () => ({ data: null, error: new Error(errorMessage) }),
                                    })
                                })
                            }),
                            order: () => ({
                                eq: () => ({
                                    select: () => ({})
                                })
                            })
                        }),
                        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error(errorMessage) }) }) }),
                        upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error(errorMessage) }) }) }),
                        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error(errorMessage) }) }) }) }),
                        delete: () => ({ eq: async () => ({ error: new Error(errorMessage) }) }),
                    });
                }
                // Fallback para outras propriedades sem quebrar
                return undefined;
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
