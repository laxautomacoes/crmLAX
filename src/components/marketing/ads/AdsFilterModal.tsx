'use client'

import { Modal } from '@/components/shared/Modal'
import { FormSelect } from '@/components/shared/forms/FormSelect'
import { X, Check } from 'lucide-react'

interface AdsFilterModalProps {
    isOpen: boolean
    onClose: () => void
    platformFilter: string
    setPlatformFilter: (val: string) => void
    statusFilter: string
    setStatusFilter: (val: string) => void
    uniquePlatforms: string[]
    onClear: () => void
}

export function AdsFilterModal({
    isOpen,
    onClose,
    platformFilter,
    setPlatformFilter,
    statusFilter,
    setStatusFilter,
    uniquePlatforms,
    onClear
}: AdsFilterModalProps) {
    const handleReset = () => {
        onClear()
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={<h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">Filtrar Anúncios &amp; Portais</h3>}
            size="md"
        >
            <div className="space-y-5 px-1 pt-2">
                {/* Filtro por Plataforma */}
                <FormSelect
                    label="Plataforma / Canal"
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    options={[
                        { value: 'Todas', label: 'Todas as Plataformas' },
                        ...uniquePlatforms.map(p => ({ value: p, label: p }))
                    ]}
                />

                {/* Filtro por Status */}
                <FormSelect
                    label="Status da Campanha"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    options={[
                        { value: 'Todos', label: 'Todos os Status' },
                        { value: 'Ativa', label: 'Ativa' },
                        { value: 'Pausada', label: 'Pausada' },
                        { value: 'Concluída', label: 'Concluída' }
                    ]}
                />

                {/* Botões do Rodapé */}
                <div className="pt-6 flex gap-3 sticky bottom-0 bg-card pb-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex-1 px-4 py-2.5 rounded-lg font-bold border border-border bg-muted text-foreground hover:bg-muted/80 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                        <X size={16} />
                        Limpar
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-secondary text-secondary-foreground font-bold py-2.5 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs uppercase tracking-widest shadow-sm flex items-center justify-center gap-2"
                    >
                        <Check size={16} />
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </Modal>
    )
}
