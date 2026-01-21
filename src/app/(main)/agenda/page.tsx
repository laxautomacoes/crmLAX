'use client';

import { useState, useEffect } from 'react';
import CalendarGrid from '@/components/Agenda/CalendarGrid';
import EventModal from '@/components/Agenda/EventModal';
import { getEvents, createEvent, updateEvent, deleteEvent } from '@/app/_actions/calendar';
import { getProfile } from '@/app/_actions/profile';
import { getClients } from '@/app/_actions/clients';
import { toast } from 'sonner';

export default function AgendaPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]); // TODO: Fetch assets
    const [isLoading, setIsLoading] = useState(true);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [profileId, setProfileId] = useState<string | null>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    const fetchData = async () => {
        try {
            const { profile } = await getProfile();
            if (profile?.tenant_id) {
                setTenantId(profile.tenant_id);
                setProfileId(profile.id);

                const [eventsRes, clientsRes] = await Promise.all([
                    getEvents(profile.tenant_id),
                    getClients(profile.tenant_id)
                ]);

                if (eventsRes.success) setEvents(eventsRes.data || []);
                if (clientsRes.success) setLeads(clientsRes.data || []);
            }
        } catch (error) {
            console.error('Erro ao carregar dados da agenda:', error);
            toast.error('Erro ao carregar agenda');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddEvent = (date: Date) => {
        setEditingEvent(null);
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const handleEditEvent = (event: any) => {
        setEditingEvent(event);
        setSelectedDate(undefined);
        setIsModalOpen(true);
    };

    const handleSaveEvent = async (formData: any) => {
        if (!tenantId || !profileId) return;

        const eventData = {
            ...formData,
            tenant_id: tenantId,
            profile_id: profileId,
        };

        let result;
        if (editingEvent) {
            result = await updateEvent(editingEvent.id, eventData);
        } else {
            result = await createEvent(eventData);
        }

        if (result.success) {
            toast.success(editingEvent ? 'Compromisso atualizado!' : 'Compromisso agendado!');
            setIsModalOpen(false);
            fetchData();
        } else {
            toast.error('Erro ao salvar compromisso: ' + result.error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#404F4F]">Agenda</h1>
                    <p className="text-sm text-muted-foreground">Gerencie seus plantões, visitas e compromissos.</p>
                </div>
            </div>

            <CalendarGrid
                events={events}
                onAddEvent={handleAddEvent}
                onEditEvent={handleEditEvent}
            />

            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvent}
                editingEvent={editingEvent}
                initialDate={selectedDate}
                leads={leads}
                assets={assets}
            />
        </div>
    );
}
