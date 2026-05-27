import { NextResponse } from 'next/server'
import { checkLeadTemperatureTransitions } from '@/app/_actions/lead-temperature-check'

/**
 * API Route para cron job de verificação de temperatura de leads.
 * Protegida por CRON_SECRET.
 * 
 * Configurar no vercel.json:
 * { "crons": [{ "path": "/api/cron/lead-temperature", "schedule": "0 11 * * *" }] }
 * (11:00 UTC = 08:00 BRT)
 */
export async function GET(request: Request) {
    // Verificar autorização
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await checkLeadTemperatureTransitions()
        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[Cron LeadTemperature] Erro:', error)
        return NextResponse.json(
            { error: error.message || 'Internal error' },
            { status: 500 }
        )
    }
}
