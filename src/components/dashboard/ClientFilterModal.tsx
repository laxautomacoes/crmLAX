'use client';

import { Modal } from '@/components/shared/Modal';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { FormInput } from '@/components/shared/forms/FormInput';
import { useRef } from 'react';
import { X, Calendar } from 'lucide-react';

interface ClientFilter {
    startDate: string;
    endDate: string;
    interest: string;
    primaryInterest: string;
    brokerId: string;
    maritalStatus: string;
    status: string;
}

interface ClientFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: ClientFilter;
    setFilters: (filters: ClientFilter) => void;
    brokers: any[];
    isAdmin: boolean;
    onClear: () => void;
}

export function ClientFilterModal({ 
    isOpen, 
    onClose, 
    filters, 
    setFilters, 
    brokers, 
    isAdmin,
    onClear 
}: ClientFilterModalProps) {
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Filtrar Clientes">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                {/* Período */}
                <div className="grid grid-cols-2 gap-3">
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

                <FormSelect
                    label="Tipo"
                    value={filters.primaryInterest}
                    onChange={(e) => setFilters({ ...filters, primaryInterest: e.target.value })}
                    options={[
                        { value: '', label: 'Todos' },
                        { value: 'comprador', label: 'Comprador' },
                        { value: 'vendedor', label: 'Vendedor' },
                        { value: 'construtora', label: 'Construtora' }
                    ]}
                />

                <FormSelect
                    label="Status"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    options={[
                        { value: 'active', label: 'Ativos' },
                        { value: 'archived', label: 'Arquivados' },
                        { value: 'all', label: 'Todos' }
                    ]}
                />

                {isAdmin && brokers.length > 0 && (
                    <FormSelect
                        label="Corretor Responsável"
                        value={filters.brokerId}
                        onChange={(e) => setFilters({ ...filters, brokerId: e.target.value })}
                        options={[
                            { value: '', label: 'Todos' },
                            ...brokers.map(b => ({ value: b.id, label: b.full_name }))
                        ]}
                    />
                )}

                <div className="pt-6 flex gap-3 sticky bottom-0 bg-card pb-2">
                    <button
                        onClick={handleReset}
                        className="flex-1 px-4 py-2.5 rounded-lg font-bold border border-border bg-muted text-foreground hover:bg-muted/80 transition-all text-sm flex items-center justify-center gap-2"
                    >
                        <X size={16} />
                        Limpar
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-secondary text-secondary-foreground font-bold py-2.5 rounded-lg hover:opacity-90 transition-all text-sm shadow-sm"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </Modal>
    );
}
