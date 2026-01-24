import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        const errorMessage = "Supabase client used without environment variables. " +
            "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."

        return new Proxy({}, {
            get: (target, prop) => {
                if (prop === 'auth') {
                    return {
                        getUser: async () => ({ data: { user: null }, error: new Error(errorMessage) }),
                        getSession: async () => ({ data: { session: null }, error: new Error(errorMessage) }),
                        signOut: async () => ({ error: new Error(errorMessage) }),
                        signInWithOAuth: async () => ({ data: null, error: new Error(errorMessage) }),
                        signInWithPassword: async () => ({ data: null, error: new Error(errorMessage) }),
                        signUp: async () => ({ data: null, error: new Error(errorMessage) }),
                        resetPasswordForEmail: async () => ({ data: null, error: new Error(errorMessage) }),
                        updateUser: async () => ({ data: null, error: new Error(errorMessage) }),
                    }
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
                    })
                }
                return undefined
            }
        }) as any
    }

    return createBrowserClient(
        supabaseUrl!,
        supabaseAnonKey!
    )
}
