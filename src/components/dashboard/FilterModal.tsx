'use client';

import { Modal } from '@/components/shared/Modal';
import { FormSelect } from '@/components/shared/forms/FormSelect';
import { FormCheckbox } from '@/components/shared/forms/FormCheckbox';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FilterModal({ isOpen, onClose }: FilterModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Filtrar Dashboard">
            <div className="space-y-4">
                <FormSelect
                    label="Período"
                    options={[
                        { value: 'today', label: 'Hoje' },
                        { value: '7days', label: 'Últimos 7 dias' },
                        { value: 'month', label: 'Este Mês' },
                        { value: 'custom', label: 'Personalizado' }
                    ]}
                />

                <div>
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1">Origem do Lead</label>
                    <div className="space-y-2">
                        <FormCheckbox label="Facebook Ads" />
                        <FormCheckbox label="Google Ads" />
                        <FormCheckbox label="Indicação" />
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 rounded-lg transition-opacity"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </Modal>
    );
}
