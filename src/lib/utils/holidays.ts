import { addDays, format } from 'date-fns';

export interface Holiday {
    date: Date;
    name: string;
    type: 'holiday' | 'commemorative';
}

/**
 * Calculates Easter Sunday for a given year using the Meeus/Jones/Butcher algorithm
 */
function getEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month - 1, day);
}

export function getBrazilianHolidays(year: number): Holiday[] {
    const holidays: Holiday[] = [
        { date: new Date(year, 0, 1), name: 'Confraternização Universal', type: 'holiday' },
        { date: new Date(year, 3, 21), name: 'Tiradentes', type: 'holiday' },
        { date: new Date(year, 4, 1), name: 'Dia do Trabalho', type: 'holiday' },
        { date: new Date(year, 8, 7), name: 'Independência do Brasil', type: 'holiday' },
        { date: new Date(year, 9, 12), name: 'Nossa Senhora Aparecida', type: 'holiday' },
        { date: new Date(year, 10, 2), name: 'Finados', type: 'holiday' },
        { date: new Date(year, 10, 15), name: 'Proclamação da República', type: 'holiday' },
        { date: new Date(year, 10, 20), name: 'Consciência Negra', type: 'holiday' },
        { date: new Date(year, 11, 25), name: 'Natal', type: 'holiday' },
        
        // Commemorative days
        { date: new Date(year, 5, 12), name: 'Dia dos Namorados', type: 'commemorative' },
        { date: new Date(year, 7, 2 * 7 - (new Date(year, 7, 1).getDay() || 7) + 1), name: 'Dia dos Pais', type: 'commemorative' }, // 2nd Sunday of Aug
        { date: new Date(year, 4, 2 * 7 - (new Date(year, 4, 1).getDay() || 7) + 1), name: 'Dia das Mães', type: 'commemorative' }, // 2nd Sunday of May
    ];

    const easter = getEaster(year);
    
    // Mobile holidays based on Easter
    holidays.push({ date: addDays(easter, -47), name: 'Carnaval', type: 'holiday' });
    holidays.push({ date: addDays(easter, -46), name: 'Quarta-feira de Cinzas', type: 'commemorative' });
    holidays.push({ date: addDays(easter, -2), name: 'Sexta-feira Santa', type: 'holiday' });
    holidays.push({ date: easter, name: 'Páscoa', type: 'commemorative' });
    holidays.push({ date: addDays(easter, 60), name: 'Corpus Christi', type: 'holiday' });

    return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}
