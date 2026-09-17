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
    property_id?: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    event_type: 'duty' | 'visit' | 'note' | 'other' | 'meeting' | 'call';
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
            properties:property_id (
                title
            )
        `)
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: true });

    if (error) return { success: false, error: error.message };

    return { success: true, data };
}

export async function getEventsByLeadId(leadId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('calendar_events')
        .select(`
            *,
            profiles:profile_id (
                full_name
            )
        `)
        .eq('lead_id', leadId)
        .order('start_time', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function createEvent(data: Partial<CalendarEvent>) {
    const supabase = await createClient();

    // Define allowed fields
    const allowedFields = [
        'tenant_id', 'profile_id', 'title', 'description', 'start_time', 'end_time',
        'event_type', 'lead_id', 'property_id', 'metadata', 'reminder_sent'
    ];

    const insertData: Record<string, any> = {};
    allowedFields.forEach((field: string) => {
        if (field in data) {
            insertData[field] = (data as Record<string, any>)[field];
        }
    });

    // Sanitize UUID fields
    if ('lead_id' in insertData) insertData.lead_id = insertData.lead_id || null;
    if ('property_id' in insertData) {
        insertData.property_id = insertData.property_id || null;
    }

    // Inicializa o status do lembrete como falso
    insertData.reminder_sent = false;

    // Força o envio de lembrete em 5 min para o usuário, independentemente do que o frontend enviar
    if (!insertData.metadata) insertData.metadata = {};
    (insertData.metadata as any).user_reminder_time = 5;

    const { data: event, error } = await supabase
        .from('calendar_events')
        .insert(insertData)
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    // Create notification for the user
    if (event.profile_id) {
        // Busca o número de WhatsApp do corretor para notificação
        const { data: profile } = await supabase
            .from('profiles')
            .select('whatsapp_number')
            .eq('id', event.profile_id)
            .single();

        let leadNameForMsg = 'Não informado';
        if (event.lead_id) {
            const { data: leadData } = await supabase
                .from('leads')
                .select('contacts(name)')
                .eq('id', event.lead_id)
                .single();
            if ((leadData as any)?.contacts?.name) {
                leadNameForMsg = (leadData as any).contacts.name;
            }
        }

        const dateStr = new Date(event.start_time).toLocaleDateString('pt-BR');
        const timeStr = new Date(event.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        await notificationService.create({
            user_id: event.profile_id,
            tenant_id: event.tenant_id,
            title: 'Novo compromisso agendado',
            message: `• Lead: ${leadNameForMsg}\n• Assunto: ${event.title}\n• Data: ${dateStr}\n• Hora: ${timeStr}`,
            type: 'calendar',
            send_whatsapp: true,
            whatsapp_number: profile?.whatsapp_number || undefined
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
        'event_type', 'lead_id', 'property_id', 'metadata', 'reminder_sent'
    ];

    const updateData: Record<string, any> = {};
    allowedFields.forEach((field: string) => {
        if (field in data) {
            updateData[field] = (data as Record<string, any>)[field];
        }
    });

    // Sanitize UUID fields
    if ('lead_id' in updateData) updateData.lead_id = updateData.lead_id || null;
    if ('property_id' in updateData) {
        updateData.property_id = updateData.property_id || null;
    }

    // Se o horário de início for alterado, resetamos o status do lembrete para que o usuário receba a notificação novamente
    if (updateData.start_time) {
        updateData.reminder_sent = false;
    }

    if (!updateData.metadata) updateData.metadata = {};
    (updateData.metadata as any).user_reminder_time = 5;

    const { data: event, error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    // Create notification for the user
    if (event.profile_id) {
        // Busca o número de WhatsApp do corretor para notificação
        const { data: profile } = await supabase
            .from('profiles')
            .select('whatsapp_number')
            .eq('id', event.profile_id)
            .single();

        let leadNameForMsg = 'Não informado';
        if (event.lead_id) {
            const { data: leadData } = await supabase
                .from('leads')
                .select('contacts(name)')
                .eq('id', event.lead_id)
                .single();
            if ((leadData as any)?.contacts?.name) {
                leadNameForMsg = (leadData as any).contacts.name;
            }
        }

        const dateStr = new Date(event.start_time).toLocaleDateString('pt-BR');
        const timeStr = new Date(event.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        await notificationService.create({
            user_id: event.profile_id,
            tenant_id: event.tenant_id,
            title: 'Compromisso atualizado',
            message: `• Lead: ${leadNameForMsg}\n• Assunto: ${event.title}\n• Data: ${dateStr}\n• Hora: ${timeStr}`,
            type: 'calendar',
            send_whatsapp: true,
            whatsapp_number: profile?.whatsapp_number || undefined
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

        const now = new Date();
        const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Busca eventos que começam em até 24 horas e ainda não tiveram lembrete concluído
        const { data: events, error } = await supabase
            .from('calendar_events')
            .select('*, profiles(full_name, whatsapp_number)')
            .eq('reminder_sent', false)
            .gt('start_time', now.toISOString())
            .lte('start_time', twentyFourHoursFromNow.toISOString());

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
                const metadata = event.metadata || {};
                const userReminderTime = metadata.user_reminder_time || 0; // minutos
                let leadReminderTime = metadata.lead_reminder_time || 0; // minutos
                
                // Compatibilidade com eventos antigos que usavam o booleano send_whatsapp_reminder
                if (!metadata.lead_reminder_time && metadata.send_whatsapp_reminder) {
                    leadReminderTime = 60;
                }

                const userReminderSent = metadata.user_reminder_sent || false;
                const leadReminderSent = metadata.lead_reminder_sent || false;
                
                const timeUntilEvent = (new Date(event.start_time).getTime() - now.getTime()) / (60 * 1000); // minutos
                let metadataChanged = false;

                // 1. Lembrete do Corretor (Usuário)
                if (userReminderTime > 0 && !userReminderSent && timeUntilEvent <= userReminderTime) {
                    await notificationService.create({
                        user_id: event.profile_id,
                        tenant_id: event.tenant_id,
                        title: 'Lembrete de Agenda',
                        message: `O compromisso "${event.title}" começa em ${userReminderTime} minuto(s) (${new Date(event.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}).`,
                        type: 'calendar_reminder',
                        send_whatsapp: true,
                        whatsapp_number: (event as any).profiles?.whatsapp_number || undefined
                    });
                    metadata.user_reminder_sent = true;
                    metadataChanged = true;
                }

                // 2. Lembrete do Lead
                if (leadReminderTime > 0 && !leadReminderSent && timeUntilEvent <= leadReminderTime && event.lead_id) {
                    const { data: lead } = await supabase
                        .from('leads')
                        .select('*, contacts(*)')
                        .eq('id', event.lead_id)
                        .single();

                    if (lead?.contacts?.phone) {
                        const dateStr = new Date(event.start_time).toLocaleDateString('pt-BR');
                        const timeStr = new Date(event.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const brokerName = (event as any).profiles?.full_name || 'Corretor';
                        
                        const message = `🔔 *Lembrete de Compromisso*\n\n• Corretor: ${brokerName}\n• Assunto: ${event.title}\n• Data: ${dateStr}\n• Hora: ${timeStr}`;
                        
                        await notificationService.sendWhatsApp(
                            event.tenant_id,
                            event.profile_id,
                            lead.contacts.phone,
                            message
                        );
                    }
                    metadata.lead_reminder_sent = true;
                    metadataChanged = true;
                }

                // Se alguma notificação foi enviada, atualiza o metadata e a flag principal
                if (metadataChanged) {
                    const userDone = (userReminderTime === 0 || metadata.user_reminder_sent);
                    const leadDone = (leadReminderTime === 0 || metadata.lead_reminder_sent);
                    const allDone = userDone && leadDone;
                    
                    await supabase
                        .from('calendar_events')
                        .update({ 
                            metadata,
                            reminder_sent: allDone 
                        })
                        .eq('id', event.id);
                        
                    processedEvents.push(event.id);
                }
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
