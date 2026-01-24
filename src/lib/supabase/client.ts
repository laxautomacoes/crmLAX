import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Se estivermos no servidor e as variáveis não existirem, retornamos um mock simples
    // para evitar erro de prerenderização. No cliente, o Supabase exigirá os valores.
    if (!supabaseUrl || !supabaseAnonKey) {
        if (typeof window === 'undefined') {
            return {} as any
        }
        // Se estiver no cliente e faltar variáveis, o erro será lançado pelo createBrowserClient
    }

    return createBrowserClient(
        supabaseUrl!,
        supabaseAnonKey!
    )
}
