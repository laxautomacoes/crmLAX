'use client';

import { Modal } from '@/components/shared/Modal';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { FormInput } from '@/components/shared/forms/FormInput';
import { X } from 'lucide-react';

interface ClientFilter {
    startDate: string;
    endDate: string;
    interest: string;
    primaryInterest: string;
    brokerId: string;
    maritalStatus: string;
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
    const handleReset = () => {
        onClear();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Filtrar Clientes">
            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
                {/* Período */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Período de Cadastro</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <FormInput
                            label="De"
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                        <FormInput
                            label="Até"
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>
                </div>

                {/* Interesse */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Interesses</h4>
                    <FormInput
                        label="Imóvel ou Interesse"
                        placeholder="Ex: Apartamento, Centro..."
                        value={filters.interest}
                        onChange={(e) => setFilters({ ...filters, interest: e.target.value })}
                    />
                    <FormSelect
                        label="Tipo de Interesse"
                        value={filters.primaryInterest}
                        onChange={(e) => setFilters({ ...filters, primaryInterest: e.target.value })}
                        options={[
                            { value: '', label: 'Todos os tipos' },
                            { value: 'compra', label: 'Compra' },
                            { value: 'venda', label: 'Venda' },
                            { value: 'aluguel', label: 'Aluguel' }
                        ]}
                    />
                </div>

                {/* Dados Adicionais */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Outros Dados</h4>
                    {isAdmin && brokers.length > 0 && (
                        <FormSelect
                            label="Corretor Responsável"
                            value={filters.brokerId}
                            onChange={(e) => setFilters({ ...filters, brokerId: e.target.value })}
                            options={[
                                { value: '', label: 'Todos os corretores' },
                                ...brokers.map(b => ({ value: b.id, label: b.full_name }))
                            ]}
                        />
                    )}
                    <FormSelect
                        label="Estado Civil"
                        value={filters.maritalStatus}
                        onChange={(e) => setFilters({ ...filters, maritalStatus: e.target.value })}
                        options={[
                            { value: '', label: 'Todos' },
                            { value: 'Solteiro(a)', label: 'Solteiro(a)' },
                            { value: 'Casado(a)', label: 'Casado(a)' },
                            { value: 'Divorciado(a)', label: 'Divorciado(a)' },
                            { value: 'Viúvo(a)', label: 'Viúvo(a)' },
                            { value: 'União Estável', label: 'União Estável' }
                        ]}
                    />
                </div>

                <div className="pt-6 flex gap-3 sticky bottom-0 bg-background pb-2">
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
