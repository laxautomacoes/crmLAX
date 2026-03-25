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
    addMinutes,
    differenceInMinutes,
    parseISO
} from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBrazilianHolidays } from '@/lib/utils/holidays';
import {
    DndContext,
    useDraggable,
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    TouchSensor,
    KeyboardSensor
} from '@dnd-kit/core';

interface CalendarGridProps {
    events: any[];
    onAddEvent: (date: Date) => void;
    onEditEvent: (event: any) => void;
    onEventMove?: (eventId: string, newDate: Date) => void;
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

function DraggableEvent({ event, onEditEvent, toLocalTime }: { event: any; onEditEvent: (event: any) => void; toLocalTime: (dateStr: string) => Date }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: event.id,
        data: { event }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
    } : undefined;

    return (
        <button
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={(e) => {
                // Previne o clique se estiver arrastando
                if (!transform) onEditEvent(event);
            }}
            className={`
                w-full text-left px-2 py-1 rounded text-[10px] md:text-xs font-medium border
                transition-all hover:brightness-95 cursor-grab active:cursor-grabbing
                ${eventTypeColors[event.event_type as keyof typeof eventTypeColors] || eventTypeColors.other}
                ${isDragging ? 'opacity-50 ring-2 ring-primary border-transparent shadow-lg' : ''}
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
    );
}

function DroppableDay({ 
    day, 
    isCurrentMonth, 
    isToday, 
    idx, 
    children, 
    onAddEvent 
}: { 
    day: Date; 
    isCurrentMonth: boolean; 
    isToday: boolean; 
    idx: number; 
    children: React.ReactNode;
    onAddEvent: (date: Date) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: day.toISOString(),
        data: { day }
    });

    return (
        <div
            ref={setNodeRef}
            onDoubleClick={() => onAddEvent(day)}
            className={`
                border-r border-b border-border p-2 transition-colors relative group min-h-[100px] md:min-h-[140px] cursor-pointer
                ${!isCurrentMonth ? 'bg-muted/5' : 'bg-card'}
                ${idx % 7 === 6 ? 'border-r-0' : ''}
                ${isOver ? 'bg-secondary/20 ring-2 ring-secondary ring-inset z-10' : ''}
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
                </div>

                <button
                    onClick={() => onAddEvent(day)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded-md transition-all"
                >
                    <Plus size={14} className="text-muted-foreground" />
                </button>
            </div>
            {children}
        </div>
    );
}

export default function CalendarGrid({ events, onAddEvent, onEditEvent, onEventMove }: CalendarGridProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Arraste só começa após mover 8px
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

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

    const toLocalTime = (dateStr: string) => {
        return new Date(dateStr);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (over && active.id !== over.id) {
            const eventData = active.data.current?.event;
            const newDay = over.data.current?.day;
            
            if (eventData && newDay && onEventMove) {
                // Se for o mesmo dia, não faz nada
                if (isSameDay(new Date(eventData.start_time), newDay)) return;
                onEventMove(eventData.id, newDay);
            }
        }
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
                            <DroppableDay 
                                key={day.toString()}
                                day={day}
                                isCurrentMonth={isCurrentMonth}
                                isToday={isToday}
                                idx={idx}
                                onAddEvent={onAddEvent}
                            >
                                <div className="absolute top-8 left-2 right-2">
                                    {dayHolidays.map((holiday, hIdx) => (
                                        <span 
                                            key={hIdx} 
                                            className={`text-[9px] font-bold block leading-tight ${holiday.type === 'holiday' ? 'text-red-500' : 'text-blue-500'}`}
                                            title={holiday.name}
                                        >
                                            {holiday.name}
                                        </span>
                                    ))}
                                </div>
                                <div className="mt-6 space-y-1 overflow-y-auto max-h-[60px] md:max-h-[100px] no-scrollbar relative z-20">
                                    {dayEvents.map(event => (
                                        <DraggableEvent 
                                            key={event.id}
                                            event={event}
                                            onEditEvent={onEditEvent}
                                            toLocalTime={toLocalTime}
                                        />
                                    ))}
                                </div>
                            </DroppableDay>
                        );
                    })}
                </div>
            </div>
        </DndContext>
    );
}

