'use client';

import { useState, useEffect } from 'react';
import { Plus, Filter } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
    setHours, 
    setMinutes, 
    setSeconds, 
    differenceInMinutes, 
    addMinutes
} from 'date-fns';
import CalendarGrid from '@/components/Agenda/CalendarGrid';
import EventModal from '@/components/Agenda/EventModal';
import { getEvents, createEvent, updateEvent, deleteEvent } from '@/app/_actions/calendar';
import { getProfile } from '@/app/_actions/profile';
import { getClients } from '@/app/_actions/clients';
import { getProperties } from '@/app/_actions/properties';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';

export const dynamic = 'force-dynamic';

export default function AgendaPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [properties, setProperties] = useState<any[]>([]); // TODO: Fetch properties
    const [isLoading, setIsLoading] = useState(true);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [profileId, setProfileId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('all');

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

                const [eventsRes, clientsRes, propertiesRes] = await Promise.all([
                    getEvents(profile.tenant_id),
                    getClients(profile.tenant_id),
                    getProperties(profile.tenant_id)
                ]);

                if (eventsRes.success) {
                    // Forçar uma nova referência do array para garantir que o React perceba a mudança
                    setEvents([...(eventsRes.data || [])]);
                }
                if (clientsRes.success) setLeads(clientsRes.data || []);
                if (propertiesRes.success) setProperties(propertiesRes.data || []);
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

    const handleEventMove = async (eventId: string, newDate: Date) => {
        const eventToMove = events.find(e => e.id === eventId);
        if (!eventToMove) return;

        try {
            const oldStart = new Date(eventToMove.start_time);
            const oldEnd = new Date(eventToMove.end_time);
            
            // Mantém o horário original, mas altera a data
            const newStart = setSeconds(setMinutes(setHours(newDate, oldStart.getHours()), oldStart.getMinutes()), 0);
            
            // Calcula a duração original para manter no novo horário de término
            const durationMinutes = differenceInMinutes(oldEnd, oldStart);
            const newEnd = addMinutes(newStart, durationMinutes);

            const result = await updateEvent(eventId, {
                start_time: newStart.toISOString(),
                end_time: newEnd.toISOString()
            });

            if (result.success) {
                toast.success('Compromisso movido!');
                await fetchData();
            } else {
                toast.error('Erro ao mover compromisso');
            }
        } catch (error) {
            console.error('Erro ao mover evento:', error);
            toast.error('Erro ao processar movimentação');
        }
    };

    const handleSaveEvent = async (formData: any) => {
        if (!tenantId || !profileId) return;

        // Ensure UUID fields are null if empty string
        const sanitizedData = {
            ...formData,
            lead_id: formData.lead_id || null,
            property_id: formData.property_id || null,
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
        <div className="max-w-[1600px] mx-auto h-auto md:h-[calc(100vh-80px)] pb-2 md:overflow-hidden flex flex-col space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeader 
                title="Agenda"
                subtitle="Gerencie seus compromissos, visitas e plantões de venda."
            >
                <div className="grid grid-flow-col auto-cols-fr gap-2 md:gap-3 w-full md:w-max">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button 
                                className={`h-[34px] min-w-[130px] flex items-center justify-center gap-2 px-4 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap outline-none focus:ring-2 shadow-sm transition-all ${
                                    filterType !== 'all'
                                        ? 'bg-secondary/10 border border-secondary text-secondary-foreground hover:bg-secondary/20 focus:ring-secondary/50'
                                        : 'bg-card border border-muted-foreground/30 text-foreground hover:bg-muted/50 focus:ring-ring/50 data-[state=open]:bg-muted/50'
                                }`}
                            >
                                <Filter size={14} strokeWidth={1} />
                                Filtrar
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-1">
                            {[
                                { value: 'all', label: 'Todos os tipos' },
                                { value: 'duty', label: 'Plantão de Venda' },
                                { value: 'visit', label: 'Visita de Cliente' },
                                { value: 'note', label: 'Anotação/Lembrete' },
                                { value: 'other', label: 'Outro' }
                            ].map((option) => (
                                <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => setFilterType(option.value)}
                                    className={`cursor-pointer py-2 ${filterType === option.value ? 'bg-accent text-accent-foreground font-bold' : 'text-muted-foreground'}`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${filterType === option.value ? 'bg-secondary' : 'bg-transparent'}`} />
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                        onClick={() => handleAddEvent(new Date())}
                        className="h-[34px] min-w-[130px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm whitespace-nowrap"
                    >
                        <Plus size={14} strokeWidth={1} />
                        Agendar
                    </button>
                </div>
            </PageHeader>

            <hr className="hidden md:block border-border" />

            <CalendarGrid
                events={filterType === 'all' ? events : events.filter(e => e.event_type === filterType)}
                onAddEvent={handleAddEvent}
                onEditEvent={handleEditEvent}
                onEventMove={handleEventMove}
            />

            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
                editingEvent={editingEvent}
                initialDate={selectedDate}
                leads={leads}
                properties={properties}
            />
        </div>
    );
}
