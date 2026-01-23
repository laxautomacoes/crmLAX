import { NextRequest, NextResponse } from 'next/server';
import { processAgendaReminders } from '@/app/_actions/calendar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Verificação de segurança simples para evitar chamadas não autorizadas
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await processAgendaReminders();

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ 
            message: 'Agenda reminders processed', 
            processed: result.processed,
            eventIds: result.eventIds 
        });
    } catch (error: any) {
        console.error('Cron Agenda Reminders Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
