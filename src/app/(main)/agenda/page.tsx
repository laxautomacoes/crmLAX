'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import CalendarGrid from '@/components/Agenda/CalendarGrid';
import EventModal from '@/components/Agenda/EventModal';
import { getEvents, createEvent, updateEvent, deleteEvent } from '@/app/_actions/calendar';
import { getProfile } from '@/app/_actions/profile';
import { getClients } from '@/app/_actions/clients';
import { getAssets } from '@/app/_actions/assets';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

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

                const [eventsRes, clientsRes, assetsRes] = await Promise.all([
                    getEvents(profile.tenant_id),
                    getClients(profile.tenant_id),
                    getAssets(profile.tenant_id)
                ]);

                if (eventsRes.success) {
                    // Forçar uma nova referência do array para garantir que o React perceba a mudança
                    setEvents([...(eventsRes.data || [])]);
                }
                if (clientsRes.success) setLeads(clientsRes.data || []);
                if (assetsRes.success) setAssets(assetsRes.data || []);
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

        // Ensure UUID fields are null if empty string
        const sanitizedData = {
            ...formData,
            lead_id: formData.lead_id || null,
            asset_id: formData.asset_id || null,
            tenant_id: tenantId,
            profile_id: profileId,
        };

        let result;
        if (editingEvent) {
            result = await updateEvent(editingEvent.id, sanitizedData);
        } else {
            result = await createEvent(sanitizedData);
        }

        if (result.success) {
            toast.success(editingEvent ? 'Compromisso atualizado!' : 'Compromisso agendado!');
            setIsModalOpen(false);
            setEditingEvent(null);
            
            // Forçar recarregamento completo dos dados
            await fetchData();
        } else {
            toast.error('Erro ao salvar compromisso: ' + result.error);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        const result = await deleteEvent(eventId);
        if (result.success) {
            toast.success('Compromisso excluído!');
            setIsModalOpen(false);
            setEditingEvent(null);
            await fetchData();
        } else {
            toast.error('Erro ao excluir compromisso: ' + result.error);
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
        <div className="max-w-[1600px] mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
                <button
                    onClick={() => handleAddEvent(new Date())}
                    className="bg-secondary hover:opacity-90 text-secondary-foreground font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all transform active:scale-[0.99] shadow-sm w-fit"
                >
                    <Plus size={18} />
                    Agendar
                </button>
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
                onDelete={handleDeleteEvent}
                editingEvent={editingEvent}
                initialDate={selectedDate}
                leads={leads}
                assets={assets}
            />
        </div>
    );
}
