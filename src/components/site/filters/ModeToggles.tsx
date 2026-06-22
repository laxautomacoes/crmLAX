'use client';
import { Filter, ChevronUp, Hash, Building2 } from 'lucide-react';

interface ModeTogglesProps {
    searchMode: 'standard' | 'code' | 'project';
    advancedOpen: boolean;
    onToggleAdvanced: () => void;
    onChangeMode: (mode: 'standard' | 'code' | 'project') => void;
}

export function ModeToggles({ searchMode, advancedOpen, onToggleAdvanced, onChangeMode }: ModeTogglesProps) {
    const activeClass = "text-[#404F4F] dark:text-[#FFE600] font-black";
    const inactiveClass = "text-muted-foreground hover:text-[#404F4F] dark:hover:text-[#FFE600]";
    const iconColor = "text-[#404F4F] dark:text-[#FFE600]";

    return (
        <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs md:text-sm font-bold tracking-wider uppercase">
            <button
                type="button"
                onClick={onToggleAdvanced}
                disabled={searchMode !== 'standard'}
                className={`flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${advancedOpen ? activeClass : inactiveClass}`}
            >
                {advancedOpen ? <ChevronUp size={16} strokeWidth={1} className={iconColor} /> : <Filter size={16} strokeWidth={1} className={iconColor} />}
                {advancedOpen ? 'Simples' : 'Avançado'}
            </button>
            <button
                type="button"
                onClick={() => onChangeMode(searchMode === 'code' ? 'standard' : 'code')}
                className={`flex items-center gap-1.5 transition-all cursor-pointer ${searchMode === 'code' ? activeClass : inactiveClass}`}
            >
                <Hash size={16} strokeWidth={1} className={iconColor} />
                Por código
            </button>
            <button
                type="button"
                onClick={() => onChangeMode(searchMode === 'project' ? 'standard' : 'project')}
                className={`flex items-center gap-1.5 transition-all cursor-pointer ${searchMode === 'project' ? activeClass : inactiveClass}`}
            >
                <Building2 size={16} strokeWidth={1} className={iconColor} />
                Empreendimentos
            </button>
        </div>
    );
}
