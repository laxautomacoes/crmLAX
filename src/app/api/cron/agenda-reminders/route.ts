import { NextRequest, NextResponse } from 'next/server';
import { processAgendaReminders } from '@/app/_actions/calendar';
import { verifyCronSecret } from '@/lib/api/auth-guards';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const authError = verifyCronSecret(req);
        if (authError) return authError;

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
