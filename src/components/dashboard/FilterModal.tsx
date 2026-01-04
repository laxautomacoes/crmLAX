'use client';

import { Modal } from '@/components/shared/Modal';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FilterModal({ isOpen, onClose }: FilterModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Filtrar Dashboard">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1">Período</label>
                    <select className="w-full border-border bg-card text-foreground rounded-lg shadow-sm focus:border-primary focus:ring-primary">
                        <option>Hoje</option>
                        <option>Últimos 7 dias</option>
                        <option>Este Mês</option>
                        <option>Personalizado</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-foreground ml-1 mb-1">Origem do Lead</label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded text-primary focus:ring-primary" />
                            <span className="text-sm text-muted-foreground">Facebook Ads</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded text-primary focus:ring-primary" />
                            <span className="text-sm text-muted-foreground">Google Ads</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded text-primary focus:ring-primary" />
                            <span className="text-sm text-muted-foreground">Indicação</span>
                        </label>
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
