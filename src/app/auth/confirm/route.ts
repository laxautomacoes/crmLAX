import { type EmailOtpType } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'
  const tenantId = searchParams.get('tenant')

  const redirectUrl = new URL(next, request.url)
  if (tenantId) {
      redirectUrl.searchParams.set('tenant', tenantId)
  }

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    
    if (!error) {
      // Se tiver tenantId, redirecionamos para o dashboard mas carry o tenant se necessário?
      // O dashboard geralmente não precisa, mas o login sim.
      // Se o usuário foi confirmado, ele deve estar logado.
      return NextResponse.redirect(redirectUrl.toString())
    }
  }

  // Em caso de erro, redirecionar para o login com erro e o tenantId para manter a logo
  const errorUrl = new URL('/login', request.url)
  errorUrl.searchParams.set('error', 'auth-confirmation-error')
  if (tenantId) {
      errorUrl.searchParams.set('tenant', tenantId)
  }
  
  return NextResponse.redirect(errorUrl.toString())
}
