import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API Route para registrar page views do site vitrine.
 * Endpoint público (sem autenticação) para tracking.
 * Rate limiting básico via IP para evitar abuso.
 */

// Cache simples de rate limiting em memória (por IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minuto
const RATE_LIMIT_MAX = 30; // máximo 30 requests por minuto por IP

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return false;
    }

    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
}

// Limpar entradas expiradas periodicamente (evitar memory leak)
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
        if (now > entry.resetAt) rateLimitMap.delete(ip);
    }
}, 5 * 60_000); // A cada 5 minutos

function getDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
    if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet';
    return 'desktop';
}

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
            || request.headers.get('x-real-ip') 
            || 'unknown';

        if (isRateLimited(ip)) {
            return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
        }

        const body = await request.json();
        const { tenant_id, property_id, broker_id, page_path, page_title, referrer } = body;

        if (!tenant_id || !page_path) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Extrair UTM parameters do page_path
        const url = new URL(page_path, 'https://placeholder.com');
        const utm_source = url.searchParams.get('utm_source') || null;
        const utm_medium = url.searchParams.get('utm_medium') || null;
        const utm_campaign = url.searchParams.get('utm_campaign') || null;

        // Device detection
        const userAgent = request.headers.get('user-agent') || '';
        const device_type = getDeviceType(userAgent);

        // Gerar visitor ID simples baseado em IP + User Agent (anonimizado)
        const encoder = new TextEncoder();
        const data = encoder.encode(`${ip}${userAgent}`);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const visitor_id = Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .substring(0, 16); // Apenas primeiros 16 chars para anonimização

        const supabase = await createClient();

        const { error } = await supabase
            .from('site_page_views')
            .insert({
                tenant_id,
                property_id: property_id || null,
                broker_id: broker_id || null,
                page_path: url.pathname,
                page_title: page_title || null,
                referrer: referrer || null,
                utm_source,
                utm_medium,
                utm_campaign,
                visitor_id,
                user_agent: userAgent.substring(0, 500), // Limitar tamanho
                device_type,
            });

        if (error) {
            console.error('[Analytics] Error inserting page view:', error);
            return NextResponse.json({ error: 'Failed to track' }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('[Analytics] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
