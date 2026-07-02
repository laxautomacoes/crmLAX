'use client';

import { useEffect, useRef } from 'react';
import {
    format,
    startOfYear,
    addMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isToday,
    isSameMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface YearViewProps {
    date: Date;
    events: any[];
    onMonthSelect: (monthDate: Date) => void;
    onDaySelect: (dayDate: Date) => void;
}

function MiniMonth({
    monthStart,
    events,
    onMonthSelect,
    onDaySelect
}: {
    monthStart: Date;
    events: any[];
    onMonthSelect: (monthDate: Date) => void;
    onDaySelect: (dayDate: Date) => void;
}) {
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const isCurrentMonthActive = isSameMonth(monthStart, new Date());

    const hasEvents = (day: Date) => {
        return events.some(event => isSameDay(new Date(event.start_time), day));
    };

    return (
        <div className="p-1 sm:p-3 bg-transparent sm:bg-card border-0 sm:border border-border/50 rounded-lg hover:border-border transition-colors">
            {/* Título do Mês */}
            <button
                onClick={() => onMonthSelect(monthStart)}
                className={`w-full text-center font-bold text-xs sm:text-sm uppercase tracking-wider mb-2 transition-colors
                    ${isCurrentMonthActive ? 'text-accent-icon hover:opacity-80' : 'text-foreground hover:text-accent-icon'}
                `}
            >
                {format(monthStart, 'MMMM', { locale: ptBR })}
            </button>

            {/* Dias da Semana */}
            <div className="grid grid-cols-7 gap-0.5 text-center text-[7px] sm:text-[9px] font-bold text-muted-foreground uppercase mb-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
            </div>

            {/* Dias */}
            <div className="grid grid-cols-7 gap-0.5">
                {days.map(day => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const today = isToday(day);
                    const activeEvents = hasEvents(day);

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => onDaySelect(day)}
                            className={`
                                relative w-[13px] h-[13px] min-[375px]:w-4 min-[375px]:h-4 sm:w-6 sm:h-6 text-[7px] min-[375px]:text-[8px] sm:text-[10px] font-bold rounded-full flex items-center justify-center transition-all
                                ${today && isCurrentMonth
                                    ? 'bg-secondary text-secondary-foreground font-black scale-110 shadow-sm z-10' 
                                    : isCurrentMonth 
                                        ? 'text-foreground hover:bg-muted' 
                                        : 'text-muted-foreground/30 hover:bg-muted/10'}
                            `}
                        >
                            {format(day, 'd')}
                            {activeEvents && !today && (
                                <span className="absolute bottom-0.5 w-[2px] h-[2px] sm:w-1 sm:h-1 rounded-full bg-blue-500/50 dark:bg-blue-400/50" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function YearView({ date, events, onMonthSelect, onDaySelect }: YearViewProps) {
    const currentSelectedYear = date.getFullYear();
    
    // Renderiza uma lista de 5 anos (2 anteriores, o atual e 2 posteriores) para rolagem contínua
    const years = [
        currentSelectedYear - 2,
        currentSelectedYear - 1,
        currentSelectedYear,
        currentSelectedYear + 1,
        currentSelectedYear + 2
    ];

    const selectedYearRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedYearRef.current) {
            // Rola o container para o topo do ano selecionado quando o ano muda
            selectedYearRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    }, [currentSelectedYear]);

    const getMonthsForYear = (year: number) => {
        const yearStart = startOfYear(new Date(year, 0, 1));
        return Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
    };

    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-1 sm:p-2 space-y-2">
            {years.map(year => {
                const isSelected = year === currentSelectedYear;
                const months = getMonthsForYear(year);

                return (
                    <div 
                        key={year} 
                        ref={isSelected ? selectedYearRef : undefined}
                        className="flex flex-col scroll-mt-2"
                    >
                        {/* Título do Ano */}
                        <div className="px-2 pt-2 pb-1 text-center border-b border-border/10">
                            <span className="text-xl font-black text-accent-icon tracking-wider leading-none block">
                                {year}
                            </span>
                        </div>

                        {/* Grid de Meses */}
                        <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-3 sm:gap-4 mt-2.5 mb-2">
                            {months.map(month => (
                                <MiniMonth
                                    key={month.toString()}
                                    monthStart={month}
                                    events={events}
                                    onMonthSelect={onMonthSelect}
                                    onDaySelect={onDaySelect}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
