'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type CalendarEvent = {
    id: string;
    tenant_id: string;
    profile_id: string;
    lead_id?: string;
    asset_id?: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    event_type: 'duty' | 'visit' | 'note' | 'other';
    metadata: any;
};

export async function getEvents(tenantId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('calendar_events')
        .select(`
            *,
            leads (
                contacts (
                    name
                )
            ),
            assets (
                title
            )
        `)
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: true });

    if (error) return { success: false, error: error.message };

    return { success: true, data };
}

export async function createEvent(data: Partial<CalendarEvent>) {
    const supabase = await createClient();

    const { data: event, error } = await supabase
        .from('calendar_events')
        .insert(data)
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/agenda');
    return { success: true, data: event };
}

export async function updateEvent(eventId: string, data: Partial<CalendarEvent>) {
    const supabase = await createClient();

    const { data: event, error } = await supabase
        .from('calendar_events')
        .update(data)
        .eq('id', eventId)
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/agenda');
    return { success: true, data: event };
}

export async function deleteEvent(eventId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/agenda');
    return { success: true };
}
