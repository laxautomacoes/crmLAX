'use client';

import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { eventTypeColors } from './eventTypeColors';

interface WeekViewProps {
    date: Date;
    events: any[];
    onAddEvent: (date: Date) => void;
    onEditEvent: (event: any) => void;
}

export default function WeekView({ date, events, onAddEvent, onEditEvent }: WeekViewProps) {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    const end = endOfWeek(date, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });

    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(new Date(event.start_time), day));
    };



    return (
        <div className="flex flex-col h-full">
            {/* Modo Desktop: Cabeçalho Fixo dos Dias */}
            <div className="hidden md:grid grid-cols-7 divide-x divide-border border-b border-border bg-muted/5 shrink-0">
                {days.map(day => {
                    const isToday = isSameDay(day, new Date());
                    return (
                        <div key={`header-${day.toString()}`} className={`p-3 text-center flex flex-col items-center gap-1 ${isToday ? 'bg-secondary/5' : ''}`}>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                {format(day, 'EEE', { locale: ptBR })}
                            </span>
                            <span className={`text-base font-bold w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-secondary text-secondary-foreground' : 'text-foreground'}`}>
                                {format(day, 'd')}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Modo Desktop: Bloco de Eventos Rolável Unificado */}
            <div className="hidden md:block overflow-y-auto flex-1 min-h-0 bg-background">
                <div className="grid grid-cols-7 divide-x divide-border min-h-full">
                    {days.map(day => {
                        const dayEvents = getEventsForDay(day);
                        return (
                            <div key={`events-${day.toString()}`} className="p-2 space-y-1.5 relative group min-h-[350px]">
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => onEditEvent(event)}
                                        className={`w-full text-left p-1.5 rounded-lg border text-[10px] md:text-xs font-semibold leading-tight hover:brightness-95 transition-all cursor-pointer tracking-tight ${eventTypeColors[event.event_type as keyof typeof eventTypeColors] || eventTypeColors.other}`}
                                    >
                                        <span className="font-bold opacity-70 block tracking-normal">
                                            {format(new Date(event.start_time), 'HH:mm')}
                                        </span>
                                        <span className="truncate block mt-0.5 text-foreground">{event.title}</span>
                                    </div>
                                ))}

                                <button
                                    onClick={() => onAddEvent(day)}
                                    className="w-full py-2 border border-dashed border-border/60 hover:border-border rounded-lg text-[10px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
                                >
                                    <Plus size={10} /> Novo
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modo Mobile: Lista Linear Vertical */}
            <div className="md:hidden divide-y divide-border/60">
                {days.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={day.toString()} className={`p-4 ${isToday ? 'bg-secondary/5' : ''}`}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${isToday ? 'bg-secondary text-secondary-foreground font-black' : 'bg-muted text-muted-foreground'}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {format(day, 'EEEE', { locale: ptBR })}
                                </span>
                                <button
                                    onClick={() => onAddEvent(day)}
                                    className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            <div className="space-y-1.5 pl-8">
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => onEditEvent(event)}
                                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-semibold hover:brightness-95 transition-all cursor-pointer flex items-center justify-between gap-2 tracking-tight ${eventTypeColors[event.event_type as keyof typeof eventTypeColors] || eventTypeColors.other}`}
                                    >
                                        <span className="truncate text-foreground font-bold flex-1">{event.title}</span>
                                        <span className="shrink-0 font-bold opacity-75 tracking-normal ml-2">
                                            {format(new Date(event.start_time), 'HH:mm')}
                                        </span>
                                    </div>
                                ))}

                                {dayEvents.length === 0 && (
                                    <p className="text-[11px] text-muted-foreground italic">Nenhum compromisso</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
