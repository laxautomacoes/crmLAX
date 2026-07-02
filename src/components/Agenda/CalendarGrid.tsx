'use client';

import { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
    addYears,
    subYears,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor,
    DragOverlay,
    DragStartEvent
} from '@dnd-kit/core';
import { eventTypeColors } from './eventTypeColors';
import { getBrazilianHolidays } from '@/lib/utils/holidays';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import YearView from './YearView';

interface CalendarGridProps {
    events: any[];
    onAddEvent: (date: Date) => void;
    onEditEvent: (event: any) => void;
    onEventMove?: (eventId: string, newDate: Date) => void;
}

export default function CalendarGrid({ events, onAddEvent, onEditEvent, onEventMove }: CalendarGridProps) {
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year'>('month');
    const [referenceDate, setReferenceDate] = useState(new Date());
    const [activeDragEvent, setActiveDragEvent] = useState<any>(null);

    const handleViewModeChange = (mode: 'day' | 'week' | 'month' | 'year') => {
        setViewMode(mode);
        if (mode === 'day') {
            setReferenceDate(new Date());
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const prevPeriod = () => {
        if (viewMode === 'day') setReferenceDate(subDays(referenceDate, 1));
        else if (viewMode === 'week') setReferenceDate(subWeeks(referenceDate, 1));
        else if (viewMode === 'month') setReferenceDate(subMonths(referenceDate, 1));
        else if (viewMode === 'year') setReferenceDate(subYears(referenceDate, 1));
    };

    const nextPeriod = () => {
        if (viewMode === 'day') setReferenceDate(addDays(referenceDate, 1));
        else if (viewMode === 'week') setReferenceDate(addWeeks(referenceDate, 1));
        else if (viewMode === 'month') setReferenceDate(addMonths(referenceDate, 1));
        else if (viewMode === 'year') setReferenceDate(addYears(referenceDate, 1));
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const dragEvent = events.find(e => e.id === active.id);
        if (dragEvent) {
            setActiveDragEvent(dragEvent);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragEvent(null);
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const eventData = active.data.current?.event;
            const newDay = over.data.current?.day;
            if (eventData && newDay && onEventMove) {
                if (isSameDay(new Date(eventData.start_time), newDay)) return;
                onEventMove(eventData.id, newDay);
            }
        }
    };

    const getPeriodTitle = () => {
        if (viewMode === 'day') {
            const dayStr = format(referenceDate, 'dd', { locale: ptBR });
            const monthStr = format(referenceDate, 'MMMM', { locale: ptBR });
            const capitalMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
            const yearStr = format(referenceDate, 'yyyy', { locale: ptBR });
            return `${dayStr} de ${capitalMonth} de ${yearStr}`;
        }
        if (viewMode === 'week') {
            const start = startOfWeek(referenceDate, { weekStartsOn: 0 });
            const end = endOfWeek(referenceDate, { weekStartsOn: 0 });
            const startDay = format(start, 'dd', { locale: ptBR });
            const startMonth = format(start, 'MMMM', { locale: ptBR });
            const capitalStartMonth = startMonth.charAt(0).toUpperCase() + startMonth.slice(1);
            
            const endDay = format(end, 'dd', { locale: ptBR });
            const endMonth = format(end, 'MMMM', { locale: ptBR });
            const capitalEndMonth = endMonth.charAt(0).toUpperCase() + endMonth.slice(1);
            const endYear = format(end, 'yyyy', { locale: ptBR });

            return `${startDay} de ${capitalStartMonth} - ${endDay} de ${capitalEndMonth} de ${endYear}`;
        }
        if (viewMode === 'month') {
            const monthStr = format(referenceDate, 'MMMM', { locale: ptBR });
            const capitalMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
            const yearStr = format(referenceDate, 'yyyy', { locale: ptBR });
            return `${capitalMonth} ${yearStr}`;
        }
        return format(referenceDate, 'yyyy', { locale: ptBR });
    };

    const monthStart = startOfMonth(referenceDate);
    const days = eachDayOfInterval({
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 })
    });
    const holidays = getBrazilianHolidays(referenceDate.getFullYear());

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1 min-h-0 flex flex-col bg-card rounded-lg border border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Header do Calendário */}
                <div className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border shrink-0">
                    {/* Versão Desktop (sm:flex, oculta no mobile) */}
                    <div className="hidden sm:flex items-center gap-4">
                        <h2 className="text-lg md:text-xl font-bold text-foreground">
                            {getPeriodTitle()}
                        </h2>
                        <div className="flex items-center bg-muted/30 rounded-lg p-1">
                            <button onClick={prevPeriod} className="p-1.5 hover:bg-background rounded-md transition-colors text-foreground">
                                <ChevronLeft size={18} strokeWidth={1} />
                            </button>
                            <button onClick={nextPeriod} className="p-1.5 hover:bg-background rounded-md transition-colors text-foreground">
                                <ChevronRight size={18} strokeWidth={1} />
                            </button>
                        </div>
                    </div>

                    {/* Versão Mobile (flex, oculta no desktop) */}
                    <div className="flex sm:hidden items-center justify-between w-full px-2">
                        <button onClick={prevPeriod} className="p-2 hover:bg-muted rounded-lg transition-colors text-foreground border border-border/30 bg-muted/10 shrink-0">
                            <ChevronLeft size={20} strokeWidth={1.5} />
                        </button>
                        
                        <h2 className="text-xs min-[375px]:text-sm font-black text-foreground text-center flex-1 px-1 leading-snug whitespace-nowrap">
                            {getPeriodTitle()}
                        </h2>
                        
                        <button onClick={nextPeriod} className="p-2 hover:bg-muted rounded-lg transition-colors text-foreground border border-border/30 bg-muted/10 shrink-0">
                            <ChevronRight size={20} strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* View Selector (View Toggle padrão design system) */}
                    <div className="h-[34px] flex w-[calc(100%-1rem)] sm:w-auto bg-card border border-muted-foreground/30 rounded-lg shadow-sm shrink-0 overflow-hidden self-center sm:self-auto" role="tablist">
                        {[
                            { mode: 'day', label: 'Dia' },
                            { mode: 'week', label: 'Semana' },
                            { mode: 'month', label: 'Mês' },
                            { mode: 'year', label: 'Ano' }
                        ].map(item => (
                            <button
                                key={item.mode}
                                onClick={() => handleViewModeChange(item.mode as any)}
                                role="tab"
                                aria-selected={viewMode === item.mode}
                                className={`
                                    h-full flex-1 sm:flex-initial px-1 sm:px-4 flex items-center justify-center text-xs font-bold uppercase tracking-wider rounded-none
                                    ${viewMode === item.mode 
                                        ? 'bg-secondary text-secondary-foreground' 
                                        : 'text-foreground hover:bg-muted'}
                                `}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body do Calendário */}
                <div className={`flex-1 min-h-0 flex flex-col ${viewMode === 'year' ? 'bg-background' : ''}`}>
                    {viewMode === 'day' && (
                        <DayView date={referenceDate} events={events} onAddEvent={onAddEvent} onEditEvent={onEditEvent} />
                    )}
                    {viewMode === 'week' && (
                        <WeekView date={referenceDate} events={events} onAddEvent={onAddEvent} onEditEvent={onEditEvent} />
                    )}
                    {viewMode === 'month' && (
                        <>
                            {/* Days Header */}
                            <div className="grid grid-cols-7 border-b border-border bg-muted/10 shrink-0">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <div key={day} className="py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <MonthView
                                days={days}
                                monthStart={monthStart}
                                events={events}
                                holidays={holidays}
                                onAddEvent={onAddEvent}
                                onEditEvent={onEditEvent}
                            />
                        </>
                    )}
                    {viewMode === 'year' && (
                        <YearView
                            date={referenceDate}
                            events={events}
                            onMonthSelect={(monthDate) => {
                                setReferenceDate(monthDate);
                                setViewMode('month');
                            }}
                            onDaySelect={(dayDate) => {
                                setReferenceDate(dayDate);
                                setViewMode('day');
                            }}
                        />
                    )}
                </div>
            </div>
            {activeDragEvent && (
                <DragOverlay>
                    <div
                        className={`
                            text-left px-2 py-1 rounded text-[9px] md:text-[10px] font-bold border tracking-tight shadow-xl opacity-90 z-50 pointer-events-none w-[110px] md:w-[130px]
                            ${eventTypeColors[activeDragEvent.event_type as keyof typeof eventTypeColors] || eventTypeColors.other}
                        `}
                    >
                        <span className="font-bold opacity-75 text-[8px] md:text-[9px] block">
                            {format(new Date(activeDragEvent.start_time), 'HH:mm')}
                        </span>
                        <span className="text-foreground truncate block mt-0.5 font-semibold">
                            {activeDragEvent.title}
                        </span>
                    </div>
                </DragOverlay>
            )}
        </DndContext>
    );
}
