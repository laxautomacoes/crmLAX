'use client';

import { Modal } from '@/components/shared/Modal';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { FormInput } from '@/components/shared/forms/FormInput';
import { useRef, useMemo } from 'react';
import { X, Calendar } from 'lucide-react';

export interface LeadsFilter {
    period: string;
    startDate: string;
    endDate: string;
    stageId: string;
    source: string;
    campaign: string;
    brokerId: string;
    temperature: string;
    hasProposal: string;
}

interface Broker {
    id: string;
    full_name: string;
    role?: string;
}

interface Stage {
    id: string;
    name: string;
    order_index: number;
}

interface LeadsFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: LeadsFilter;
    setFilters: (filters: LeadsFilter) => void;
    stages: Stage[];
    sources: string[];
    campaigns?: string[];
    brokers: Broker[];
    isAdmin: boolean;
    onClear: () => void;
}

export function LeadsFilterModal({
    isOpen,
    onClose,
    filters,
    setFilters,
    stages,
    sources,
    campaigns = [],
    brokers,
    isAdmin,
    onClear,
}: LeadsFilterModalProps) {
    const startDateRef = useRef<HTMLInputElement>(null);
    const endDateRef = useRef<HTMLInputElement>(null);

    // Converte ISO (yyyy-mm-dd) para display (dd/mm/aaaa)
    const isoToDisplay = (iso: string) => {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    };

    // Converte display (dd/mm/aaaa) para ISO (yyyy-mm-dd)
    const displayToIso = (display: string) => {
        const clean = display.replace(/\D/g, '');
        if (clean.length === 8) {
            const d = clean.slice(0, 2);
            const m = clean.slice(2, 4);
            const y = clean.slice(4, 8);
            return `${y}-${m}-${d}`;
        }
        return '';
    };

    // Máscara dd/mm/aaaa
    const maskDate = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 8);
        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    };

    const handleDateChange = (field: 'startDate' | 'endDate', rawValue: string) => {
        const masked = maskDate(rawValue);
        const iso = displayToIso(masked);
        setFilters({ ...filters, [field]: iso || (masked ? filters[field] : '') });
    };

    const handlePickerChange = (field: 'startDate' | 'endDate', isoValue: string) => {
        setFilters({ ...filters, [field]: isoValue });
    };

    const openPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
        if (ref.current) {
            ref.current.showPicker();
        }
    };

    const handleReset = () => {
        onClear();
        onClose();
    };

    const showCustomDates = filters.period === 'custom';

    // Ordenação alfabética para listas (Regra 18)
    const sortedSources = useMemo(() => {
        return [...sources].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [sources]);

    const sortedCampaigns = useMemo(() => {
        return [...campaigns].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    }, [campaigns]);

    const sortedBrokers = useMemo(() => {
        return [...brokers].sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));
    }, [brokers]);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={
                <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                    Filtrar Leads
                </h3>
            }
        >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                {/* Período */}
                <FormSelect
                    label="Período"
                    value={filters.period}
                    onChange={(e) =>
                        setFilters({
                            ...filters,
                            period: e.target.value,
                            ...(e.target.value !== 'custom' ? { startDate: '', endDate: '' } : {}),
                        })
                    }
                    options={[
                        { value: '', label: 'Todos' },
                        { value: 'today', label: 'Hoje' },
                        { value: '7days', label: 'Últimos 7 dias' },
                        { value: '30days', label: 'Últimos 30 dias' },
                        { value: 'month', label: 'Este Mês' },
                        { value: 'custom', label: 'Personalizado' },
                    ]}
                />

                {/* Datas customizadas */}
                {showCustomDates && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <FormInput
                            label="De"
                            placeholder="dd/mm/aaaa"
                            value={isoToDisplay(filters.startDate)}
                            onChange={(e) => handleDateChange('startDate', e.target.value)}
                            maxLength={10}
                            rightElement={
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => openPicker(startDateRef)}
                                        className="p-1 hover:bg-muted rounded-md transition-colors text-foreground"
                                        title="Abrir calendário"
                                    >
                                        <Calendar size={16} />
                                    </button>
                                    <input
                                        ref={startDateRef}
                                        type="date"
                                        value={filters.startDate}
                                        onChange={(e) => handlePickerChange('startDate', e.target.value)}
                                        className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
                                        tabIndex={-1}
                                    />
                                </div>
                            }
                        />
                        <FormInput
                            label="Até"
                            placeholder="dd/mm/aaaa"
                            value={isoToDisplay(filters.endDate)}
                            onChange={(e) => handleDateChange('endDate', e.target.value)}
                            maxLength={10}
                            rightElement={
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => openPicker(endDateRef)}
                                        className="p-1 hover:bg-muted rounded-md transition-colors text-foreground"
                                        title="Abrir calendário"
                                    >
                                        <Calendar size={16} />
                                    </button>
                                    <input
                                        ref={endDateRef}
                                        type="date"
                                        value={filters.endDate}
                                        onChange={(e) => handlePickerChange('endDate', e.target.value)}
                                        className="absolute inset-0 opacity-0 w-0 h-0 pointer-events-none"
                                        tabIndex={-1}
                                    />
                                </div>
                            }
                        />
                    </div>
                )}

                {/* Estágio do Funil */}
                {stages.length > 0 && (
                    <FormSelect
                        label="Estágio do Funil"
                        value={filters.stageId}
                        onChange={(e) => setFilters({ ...filters, stageId: e.target.value })}
                        options={[
                            { value: '', label: 'Todos os estágios' },
                            ...stages.map((s) => ({ value: s.id, label: s.name })),
                        ]}
                    />
                )}

                {/* Origem do Lead */}
                {sortedSources.length > 0 && (
                    <FormSelect
                        label="Origem do Lead"
                        value={filters.source}
                        onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                        options={[
                            { value: '', label: 'Todas as origens' },
                            ...sortedSources.map((s) => ({ value: s, label: s })),
                        ]}
                    />
                )}

                {/* Campanha */}
                {sortedCampaigns.length > 0 && (
                    <FormSelect
                        label="Campanha"
                        value={filters.campaign}
                        onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
                        options={[
                            { value: '', label: 'Todas as campanhas' },
                            ...sortedCampaigns.map((c) => ({ value: c, label: c })),
                        ]}
                    />
                )}

                {/* Temperatura */}
                <FormSelect
                    label="Temperatura"
                    value={filters.temperature}
                    onChange={(e) => setFilters({ ...filters, temperature: e.target.value })}
                    options={[
                        { value: '', label: 'Todas as temperaturas' },
                        { value: 'hot', label: 'Quente (até 7 dias)' },
                        { value: 'warm', label: 'Morno (até 15 dias)' },
                        { value: 'cold', label: 'Frio (até 30 dias)' },
                        { value: 'inactive', label: 'Inativo (+30 dias ou sem contato)' },
                    ]}
                />

                {/* Corretor Responsável */}
                {(isAdmin || sortedBrokers.length > 0) && (
                    <FormSelect
                        label="Corretor Responsável"
                        value={filters.brokerId}
                        onChange={(e) => setFilters({ ...filters, brokerId: e.target.value })}
                        options={[
                            { value: '', label: 'Todos' },
                            { value: 'unassigned', label: 'Sem responsável' },
                            ...sortedBrokers.map((b) => ({ value: b.id, label: b.full_name })),
                        ]}
                    />
                )}

                {/* Status de Proposta */}
                <FormSelect
                    label="Proposta Comercial"
                    value={filters.hasProposal}
                    onChange={(e) => setFilters({ ...filters, hasProposal: e.target.value })}
                    options={[
                        { value: '', label: 'Todas' },
                        { value: 'yes', label: 'Com proposta enviada' },
                        { value: 'no', label: 'Sem proposta' },
                    ]}
                />

                {/* Botões */}
                <div className="pt-6 flex gap-3 sticky bottom-0 bg-card pb-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 px-4 py-2.5 rounded-lg font-bold border border-border bg-muted text-foreground hover:bg-muted/80 transition-all text-sm flex items-center justify-center gap-2"
                    >
                        <X size={16} />
                        Limpar
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-secondary text-secondary-foreground font-bold py-2.5 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-sm shadow-sm"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </Modal>
    );
}
