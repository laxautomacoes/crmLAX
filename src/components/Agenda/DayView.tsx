'use client';

import { useRef, useEffect, useState } from 'react';
import { format, setHours, setMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { eventTypeColors, eventTypeLabels } from './eventTypeColors';

interface DayViewProps {
    date: Date;
    events: any[];
    onAddEvent: (date: Date) => void;
    onEditEvent: (event: any) => void;
}

export default function DayView({ date, events, onAddEvent, onEditEvent }: DayViewProps) {
    const hours = Array.from({ length: 24 }, (_, i) => i); // 00:00 às 23:00
    const timelineRef = useRef<HTMLDivElement>(null);
    const [slotHeight, setSlotHeight] = useState(48);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 640) {
                setSlotHeight(38); // Altura menor no mobile
            } else {
                setSlotHeight(48); // Altura padrão no desktop
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (timelineRef.current) {
            timelineRef.current.scrollTop = 7 * slotHeight; // Rolar para às 07:00 (7 * slotHeight)
        }
    }, [date, slotHeight]);

    const getEventsForHour = (hour: number) => {
        return events.filter(event => {
            const start = new Date(event.start_time);
            return start.getHours() === hour;
        });
    };



    const handleHourClick = (hour: number) => {
        const targetDate = setMinutes(setHours(new Date(date), hour), 0);
        onAddEvent(targetDate);
    };

    // Organiza eventos em colunas para evitar sobreposição na visualização absoluta
    const getEventsWithPositions = () => {
        const dayEvents = events.filter(event => isSameDay(new Date(event.start_time), date));

        const sorted = [...dayEvents].sort((a, b) => {
            const startA = new Date(a.start_time).getTime();
            const startB = new Date(b.start_time).getTime();
            if (startA !== startB) return startA - startB;
            const endA = new Date(a.end_time).getTime();
            const endB = new Date(b.end_time).getTime();
            return endB - endA;
        });

        const columns: any[][] = [];

        sorted.forEach(event => {
            const start = new Date(event.start_time).getTime();
            const end = new Date(event.end_time).getTime();

            let colIndex = 0;
            while (true) {
                if (!columns[colIndex]) {
                    columns[colIndex] = [event];
                    break;
                }

                const hasOverlap = columns[colIndex].some(other => {
                    const otherStart = new Date(other.start_time).getTime();
                    const otherEnd = new Date(other.end_time).getTime();
                    return (start < otherEnd && end > otherStart);
                });

                if (!hasOverlap) {
                    columns[colIndex].push(event);
                    break;
                }

                colIndex++;
            }
        });

        const totalCols = columns.length || 1;
        const positionedEvents: any[] = [];

        columns.forEach((colEvents, colIndex) => {
            colEvents.forEach(event => {
                const start = new Date(event.start_time);
                const end = new Date(event.end_time);

                const startHour = start.getHours() + start.getMinutes() / 60;
                const endHour = end.getHours() + end.getMinutes() / 60;

                const timelineStart = 0;
                const timelineEnd = 24;

                const topHour = Math.max(timelineStart, Math.min(timelineEnd, startHour));
                const bottomHour = Math.max(timelineStart, Math.min(timelineEnd, endHour));

                const duration = Math.max(0.5, bottomHour - topHour);

                const top = (topHour - timelineStart) * slotHeight;
                const height = duration * slotHeight;

                const widthPercent = 100 / totalCols;
                const leftPercent = colIndex * widthPercent;

                positionedEvents.push({
                    event,
                    style: {
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `${leftPercent}%`,
                        width: `${widthPercent - 1}%`,
                    }
                });
            });
        });

        return positionedEvents;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Cabeçalho do Dia */}
            <div className="p-4 bg-muted/10 border-b border-border flex justify-between items-center shrink-0">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">
                    {format(date, "EEEE", { locale: ptBR })}
                </h3>
                <button
                    onClick={() => onAddEvent(date)}
                    className="h-8 px-3 flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-wider shadow-sm"
                >
                    <Plus size={14} /> Novo
                </button>
            </div>

            {/* Timeline */}
            <div ref={timelineRef} className="relative overflow-y-auto flex-1 min-h-0">
                {/* Linhas de fundo e Marcadores de Hora */}
                <div className="relative select-none pointer-events-none">
                    {hours.map(hour => {
                        const formattedHour = `${String(hour).padStart(2, '0')}:00`;
                        return (
                            <div key={hour} className="flex border-b border-border/50 last:border-b-0" style={{ height: `${slotHeight}px` }}>
                                {/* Marcador de Hora */}
                                <div className="w-12 md:w-20 px-2 py-3 flex items-start justify-end border-r border-border/50 bg-muted/5">
                                    <span className="text-[10px] md:text-xs font-bold text-muted-foreground">
                                        {formattedHour}
                                    </span>
                                </div>
                                {/* Slot Vazio (linha de fundo) */}
                                <div className="flex-1 bg-background" />
                            </div>
                        );
                    })}
                </div>

                {/* Área interativa para cliques e Renderização absoluta de eventos */}
                <div className="absolute inset-0 flex">
                    {/* Espaço correspondente à coluna de horas (não-clicável) */}
                    <div className="w-12 md:w-20 border-r border-transparent pointer-events-none" />

                    {/* Container Relativo de Eventos */}
                    <div className="flex-1 relative" style={{ height: `${24 * slotHeight}px` }}>
                        {/* Grade invisível para capturar clique duplo nas horas */}
                        {hours.map(hour => (
                            <div
                                key={`click-${hour}`}
                                onClick={() => handleHourClick(hour)}
                                className="absolute left-0 right-0 hover:bg-muted/5 transition-colors cursor-pointer"
                                style={{ top: `${hour * slotHeight}px`, height: `${slotHeight}px` }}
                                title={`Clique para agendar às ${String(hour).padStart(2, '0')}:00`}
                            />
                        ))}

                        {/* Cards de Compromissos Posicionados Absolutamente */}
                        {getEventsWithPositions().map(({ event, style }) => (
                            <div
                                key={event.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditEvent(event);
                                }}
                                style={style}
                                className={`
                                    absolute p-2 rounded-lg border text-xs font-medium shadow-xs cursor-pointer tracking-tight
                                    transition-all hover:scale-[1.01] hover:shadow-sm flex flex-col gap-0.5 overflow-hidden
                                    ${eventTypeColors[event.event_type as keyof typeof eventTypeColors] || eventTypeColors.other}
                                `}
                            >
                                <div className="flex flex-col gap-0.5 h-full justify-center">
                                    <div className="flex justify-between items-center gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-bold tracking-normal shrink-0">
                                                {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                                            </span>
                                            <span className="text-muted-foreground shrink-0 opacity-50">|</span>
                                            <span className="font-bold text-foreground text-sm truncate">{event.title}</span>
                                        </div>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 font-bold uppercase tracking-wider shrink-0">
                                            {eventTypeLabels[event.event_type as keyof typeof eventTypeLabels] || eventTypeLabels.other}
                                        </span>
                                    </div>
                                    {event.description && (
                                        <span className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                                            {event.description}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
