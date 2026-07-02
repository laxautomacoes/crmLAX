'use client';

import { format, isSameMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { eventTypeColors, eventTypeLabels } from './eventTypeColors';

interface MonthViewProps {
    days: Date[];
    monthStart: Date;
    events: any[];
    holidays: any[];
    onAddEvent: (date: Date) => void;
    onEditEvent: (event: any) => void;
}

function DraggableEvent({ event, onEditEvent, toLocalTime }: { event: any; onEditEvent: (event: any) => void; toLocalTime: (dateStr: string) => Date }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: event.id,
        data: { event }
    });

    const style = isDragging ? {
        opacity: 0.3,
    } : undefined;



    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onEditEvent(event)}
            className={`
                w-full text-left px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold border tracking-tight
                transition-all hover:brightness-95 cursor-grab active:cursor-grabbing flex items-center gap-1.5 leading-tight
                ${eventTypeColors[event.event_type as keyof typeof eventTypeColors] || eventTypeColors.other}
            `}
        >
            <span className="font-bold opacity-75 text-[8px] md:text-[9px] w-[30px] shrink-0 text-left tracking-normal">
                {format(toLocalTime(event.start_time), 'HH:mm')}
            </span>
            <span className="text-foreground truncate flex-1 font-semibold">{event.title}</span>
        </div>
    );
}

function DroppableDay({
    day,
    isCurrentMonth,
    isToday,
    idx,
    children,
    onAddEvent,
    holidays
}: {
    day: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    idx: number;
    children: React.ReactNode;
    onAddEvent: (date: Date) => void;
    holidays: any[];
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
                border-r border-b border-border p-1.5 transition-colors relative group min-h-[90px] md:min-h-[140px] cursor-pointer flex flex-col justify-between
                ${!isCurrentMonth ? 'bg-muted/5' : 'bg-background'}
                ${idx % 7 === 6 ? 'border-r-0' : ''}
                ${isOver ? 'bg-secondary/20 ring-2 ring-secondary ring-inset z-10' : ''}
            `}
        >
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5 items-start">
                    <span className={`
                        text-xs md:text-sm font-semibold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-secondary text-secondary-foreground font-black' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                    `}>
                        {format(day, 'd')}
                    </span>
                    {holidays.map((holiday, hIdx) => (
                        <span
                            key={hIdx}
                            className={`text-[8px] font-bold block leading-none truncate max-w-[55px] md:max-w-[85px] mt-0.5 ${holiday.type === 'holiday' ? 'text-red-500' : 'text-blue-500'}`}
                            title={holiday.name}
                        >
                            {holiday.name}
                        </span>
                    ))}
                </div>

                <button
                    onClick={() => onAddEvent(day)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded-md transition-all"
                >
                    <Plus size={12} className="text-muted-foreground" />
                </button>
            </div>

            <div className="flex-1 mt-1.5">
                {children}
            </div>
        </div>
    );
}

export default function MonthView({ days, monthStart, events, holidays, onAddEvent, onEditEvent }: MonthViewProps) {
    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(new Date(event.start_time), day));
    };

    const getHolidaysForDay = (day: Date) => {
        return holidays.filter(holiday => isSameDay(holiday.date, day));
    };

    const toLocalTime = (dateStr: string) => {
        return new Date(dateStr);
    };

    return (
        <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid grid-cols-7 auto-rows-[90px] md:auto-rows-[140px]">
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
                            holidays={dayHolidays}
                        >
                            <div className="space-y-1 overflow-y-auto max-h-[55px] md:max-h-[100px] pr-0.5 relative z-20">
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
    );
}
