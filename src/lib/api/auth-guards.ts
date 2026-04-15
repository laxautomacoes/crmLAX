/**
 * Utilitários de autenticação para API routes e webhooks.
 * Garante que endpoints externos não sejam invocáveis por atores não-autorizados.
 */
import { NextRequest, NextResponse } from 'next/server'

/**
 * Verifica API key no header `x-api-key` contra WEBHOOK_API_KEY do .env.
 * Retorna null se autorizado, ou NextResponse 401 se não.
 */
export function verifyWebhookApiKey(req: NextRequest): NextResponse | null {
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = process.env.WEBHOOK_API_KEY

    if (!expectedKey) {
        // Se a variável não está configurada, log e permite (dev mode)
        if (process.env.NODE_ENV === 'production') {
            console.error('WEBHOOK_API_KEY não configurada em produção!')
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
        }
        return null
    }

    if (apiKey !== expectedKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return null
}

/**
 * Verifica o header `Authorization: Bearer <CRON_SECRET>` para cron jobs.
 * Obrigatório em produção.
 */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
        if (process.env.NODE_ENV === 'production') {
            console.error('CRON_SECRET não configurada em produção!')
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
        }
        return null
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return null
}

/**
 * Rate limiter simples em memória para proteção contra abuso.
 * Para produção escalável, substituir por Upstash Redis.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
    identifier: string,
    maxRequests: number = 30,
    windowMs: number = 60_000
): NextResponse | null {
    const now = Date.now()
    const entry = rateLimitMap.get(identifier)

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs })
        return null
    }

    entry.count++

    if (entry.count > maxRequests) {
        return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)) } }
        )
    }

    return null
}

/**
 * Extrai IP do request para uso no rate limiting.
 */
export function getRequestIp(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    )
}
