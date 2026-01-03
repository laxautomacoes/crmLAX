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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                    <select className="w-full border-gray-300 rounded-lg shadow-sm focus:border-[#404F4F] focus:ring-[#404F4F]">
                        <option>Hoje</option>
                        <option>Últimos 7 dias</option>
                        <option>Este Mês</option>
                        <option>Personalizado</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Origem do Lead</label>
                    <div className="space-y-2">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded text-[#404F4F] focus:ring-[#404F4F]" />
                            <span className="text-sm text-gray-600">Facebook Ads</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded text-[#404F4F] focus:ring-[#404F4F]" />
                            <span className="text-sm text-gray-600">Google Ads</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded text-[#404F4F] focus:ring-[#404F4F]" />
                            <span className="text-sm text-gray-600">Indicação</span>
                        </label>
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#404F4F] hover:bg-[#2d3939] rounded-lg"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </Modal>
    );
}
