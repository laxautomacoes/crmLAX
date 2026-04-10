'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { notificationService } from '@/services/notification-service';
import { evolutionService } from '@/lib/evolution';

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
    reminder_sent?: boolean;
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

    // Define allowed fields
    const allowedFields = [
        'tenant_id', 'profile_id', 'title', 'description', 'start_time', 'end_time',
        'event_type', 'lead_id', 'asset_id', 'metadata', 'reminder_sent'
    ];

    const insertData: Record<string, any> = {};
    allowedFields.forEach((field: string) => {
        if (field in data) {
            insertData[field] = (data as Record<string, any>)[field];
        }
    });

    // Sanitize UUID fields
    if ('lead_id' in insertData) insertData.lead_id = insertData.lead_id || null;
    if ('asset_id' in insertData) insertData.asset_id = insertData.asset_id || null;

    // Inicializa o status do lembrete como falso
    insertData.reminder_sent = false;

    const { data: event, error } = await supabase
        .from('calendar_events')
        .insert(insertData)
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    // Create notification for the user
    if (event.profile_id) {
        await notificationService.create({
            user_id: event.profile_id,
            tenant_id: event.tenant_id,
            title: 'Novo compromisso agendado',
            message: `Você agendou: ${event.title}`,
            type: 'calendar'
        });
    }

    revalidatePath('/agenda');
    return { success: true, data: event };
}

export async function updateEvent(eventId: string, data: Partial<CalendarEvent>) {
    const supabase = await createClient();

    // Define allowed fields to prevent extra data from causing errors
    const allowedFields = [
        'title', 'description', 'start_time', 'end_time',
        'event_type', 'lead_id', 'asset_id', 'metadata', 'reminder_sent'
    ];

    const updateData: Record<string, any> = {};
    allowedFields.forEach((field: string) => {
        if (field in data) {
            updateData[field] = (data as Record<string, any>)[field];
        }
    });

    // Sanitize UUID fields
    if ('lead_id' in updateData) updateData.lead_id = updateData.lead_id || null;
    if ('asset_id' in updateData) updateData.asset_id = updateData.asset_id || null;

    // Se o horário de início for alterado, resetamos o status do lembrete para que o usuário receba a notificação novamente
    if (updateData.start_time) {
        updateData.reminder_sent = false;
    }

    const { data: event, error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    // Create notification for the user
    if (event.profile_id) {
        await notificationService.create({
            user_id: event.profile_id,
            tenant_id: event.tenant_id,
            title: 'Compromisso atualizado',
            message: `O compromisso "${event.title}" foi alterado`,
            type: 'calendar'
        });
    }

    revalidatePath('/agenda', 'page');
    revalidatePath('/(main)/agenda', 'page');

    return { success: true, data: event };
}

export async function deleteEvent(eventId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/agenda', 'page');
    revalidatePath('/(main)/agenda', 'page');

    return { success: true };
}

export async function processAgendaReminders() {
    try {
        const supabase = createAdminClient();

        // Get current time and time 1 hour from now
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        // Busca eventos que começam em até 1 hora e ainda não tiveram lembrete enviado
        // Filtramos para não pegar eventos que já passaram (start_time > now)
        const { data: events, error } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('reminder_sent', false)
            .gt('start_time', now.toISOString())
            .lte('start_time', oneHourFromNow.toISOString());

        if (error) {
            console.error('Erro ao buscar eventos para lembretes:', error);
            return { success: false, error: error.message };
        }

        if (!events || events.length === 0) {
            return { success: true, processed: 0 };
        }

        const processedEvents = [];

        for (const event of events) {
            try {
                // Cria a notificação para o usuário dono do evento
                await notificationService.create({
                    user_id: event.profile_id,
                    tenant_id: event.tenant_id,
                    title: 'Lembrete de Agenda',
                    message: `O evento "${event.title}" começa em 1 hora (${new Date(event.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}).`,
                    type: 'calendar_reminder'
                });

                // Tenta enviar lembrete via WhatsApp se houver um lead vinculado e a opção estiver ativa
                if (event.lead_id && event.metadata?.send_whatsapp_reminder) {
                    const { data: lead } = await supabase
                        .from('leads')
                        .select('*, contacts(*)')
                        .eq('id', event.lead_id)
                        .single();

                    if (lead?.contacts?.phone) {
                        const dateStr = new Date(event.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const message = `Olá ${lead.contacts.name}, confirmando nosso compromisso "${event.title}" hoje às ${dateStr}. Nos vemos lá!`;
                        
                        await notificationService.sendWhatsApp(
                            event.tenant_id,
                            event.profile_id,
                            lead.contacts.phone,
                            message
                        );
                    }
                }

                // Marca como lembrete enviado
                await supabase
                    .from('calendar_events')
                    .update({ reminder_sent: true })
                    .eq('id', event.id);

                processedEvents.push(event.id);
            } catch (err) {
                console.error(`Erro ao processar lembrete para evento ${event.id}:`, err);
            }
        }

        return {
            success: true,
            processed: processedEvents.length,
            eventIds: processedEvents
        };
    } catch (error: any) {
        console.error('Erro no processAgendaReminders:', error);
        return { success: false, error: error.message };
    }
}
