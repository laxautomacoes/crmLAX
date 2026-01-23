'use client';

import { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval,
    addMinutes
} from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBrazilianHolidays } from '@/lib/utils/holidays';

interface CalendarGridProps {
    events: any[];
    onAddEvent: (date: Date) => void;
    onEditEvent: (event: any) => void;
}

const eventTypeColors = {
    duty: 'bg-blue-100 text-blue-700 border-blue-200',
    visit: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    note: 'bg-amber-100 text-amber-700 border-amber-200',
    other: 'bg-slate-100 text-slate-700 border-slate-200',
};

const eventTypeLabels = {
    duty: 'Plantão',
    visit: 'Visita',
    note: 'Nota',
    other: 'Outro',
};

export default function CalendarGrid({ events, onAddEvent, onEditEvent }: CalendarGridProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const holidays = getBrazilianHolidays(currentMonth.getFullYear());

    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(new Date(event.start_time), day));
    };

    const getHolidaysForDay = (day: Date) => {
        return holidays.filter(holiday => isSameDay(holiday.date, day));
    };

    // Função para converter data UTC do banco para data local com correção de timezone
    const toLocalTime = (dateStr: string) => {
        const date = new Date(dateStr);
        // O Supabase retorna TIMESTAMPTZ, o JS converte para local automaticamente.
        // Garantimos que a exibição ignore variações de fuso se necessário, 
        // mas aqui formatamos para pt-BR (Brasília).
        return date;
    };

    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Calendar Header */}
            <div className="p-6 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-foreground">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <div className="flex items-center bg-muted/30 rounded-lg p-1">
                        <button
                            onClick={prevMonth}
                            className="p-1.5 hover:bg-background rounded-md transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={nextMonth}
                            className="p-1.5 hover:bg-background rounded-md transition-colors"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/10">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Body */}
            <div className="grid grid-cols-7 auto-rows-[120px] md:auto-rows-[160px]">
                {days.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const dayHolidays = getHolidaysForDay(day);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, monthStart);

                    return (
                        <div
                            key={day.toString()}
                            className={`
                                border-r border-b border-border p-2 transition-colors relative group min-h-[100px] md:min-h-[140px]
                                ${!isCurrentMonth ? 'bg-muted/5' : 'bg-card'}
                                ${idx % 7 === 6 ? 'border-r-0' : ''}
                            `}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex flex-col gap-0.5">
                                    <span className={`
                                        text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                                        ${isToday ? 'bg-secondary text-secondary-foreground' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                                    `}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayHolidays.map((holiday, hIdx) => (
                                        <span 
                                            key={hIdx} 
                                            className={`text-[9px] font-bold leading-tight ${holiday.type === 'holiday' ? 'text-red-500' : 'text-blue-500'}`}
                                            title={holiday.name}
                                        >
                                            {holiday.name}
                                        </span>
                                    ))}
                                </div>

                                <button
                                    onClick={() => onAddEvent(day)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded-md transition-all"
                                >
                                    <Plus size={14} className="text-muted-foreground" />
                                </button>
                            </div>

                            <div className="space-y-1 overflow-y-auto max-h-[60px] md:max-h-[100px] no-scrollbar">
                                {dayEvents.map(event => (
                                    <button
                                        key={event.id}
                                        onClick={() => onEditEvent(event)}
                                        className={`
                                            w-full text-left px-2 py-1 rounded text-[10px] md:text-xs font-medium border
                                            transition-all hover:brightness-95
                                            ${eventTypeColors[event.event_type as keyof typeof eventTypeColors] || eventTypeColors.other}
                                        `}
                                    >
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold opacity-70 shrink-0">
                                                    {format(toLocalTime(event.start_time), 'HH:mm', { locale: ptBR })}
                                                </span>
                                                <span className="truncate">{event.title}</span>
                                            </div>
                                            <div className="text-[8px] md:text-[9px] opacity-60 leading-tight">
                                                {eventTypeLabels[event.event_type as keyof typeof eventTypeLabels] || eventTypeLabels.other}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
