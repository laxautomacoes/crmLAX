import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CalendarWebhookPayload {
    tenant_id: string;
    profile_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    event_type?: 'duty' | 'visit' | 'note' | 'other';
    lead_id?: string;
    asset_id?: string;
}

export async function POST(req: NextRequest) {
    try {
        const payload: CalendarWebhookPayload = await req.json();
        const {
            tenant_id,
            profile_id,
            title,
            description,
            start_time,
            end_time,
            event_type,
            lead_id,
            asset_id
        } = payload;

        if (!tenant_id || !title || !start_time || !end_time) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from('calendar_events')
            .insert({
                tenant_id,
                profile_id,
                title,
                description,
                start_time,
                end_time,
                event_type: event_type || 'note',
                lead_id,
                asset_id
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ message: 'Event scheduled successfully', event_id: data.id });
    } catch (error: any) {
        console.error('Webhook Calendar Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
