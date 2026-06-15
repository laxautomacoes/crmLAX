'use client';

import { useState } from 'react';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { toast } from 'sonner';

interface PageInfo {
    id: string;
    name: string;
    picture: string | null;
    has_instagram: boolean;
    instagram_id: string | null;
}

interface PageSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    pages: PageInfo[];
    tenantId: string;
    onPageSelected: () => void;
}

export function PageSelectorModal({ isOpen, onClose, pages, tenantId, onPageSelected }: PageSelectorModalProps) {
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!selectedPageId) {
            toast.error('Selecione uma página para continuar.');
            return;
        }

        const selectedPage = pages.find(p => p.id === selectedPageId);
        if (selectedPage && !selectedPage.has_instagram) {
            toast.error('A página selecionada não possui uma conta Instagram Business vinculada.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/auth/instagram/select-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId, pageId: selectedPageId }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Erro ao selecionar página.');
            }

            toast.success(`Página "${data.page.name}" conectada com sucesso!`);
            onPageSelected();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao conectar página.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Selecionar Página" size="md">
            <div className="space-y-6">
                {/* Descrição */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Selecione a <strong className="text-foreground">Página do Facebook</strong> que deseja conectar ao CRM LAX. A página deve ter uma conta Instagram Business vinculada.
                </p>

                {/* Lista de Páginas */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                    {pages.map((page) => {
                        const isSelected = selectedPageId === page.id;
                        return (
                            <button
                                key={page.id}
                                onClick={() => setSelectedPageId(page.id)}
                                disabled={isSubmitting}
                                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                                    isSelected
                                        ? 'border-secondary bg-secondary/5 shadow-sm'
                                        : 'border-border hover:border-border/80 hover:bg-muted/50'
                                } ${!page.has_instagram ? 'opacity-60' : ''}`}
                            >
                                {/* Avatar da Página */}
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                                    {page.picture ? (
                                        <img src={page.picture} alt={page.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
                                            {page.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-foreground text-sm truncate">{page.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                        ID: {page.id}
                                    </p>
                                    {page.has_instagram ? (
                                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold uppercase tracking-wider">
                                            <Check size={10} strokeWidth={3} />
                                            Instagram Business
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                                            <AlertTriangle size={10} />
                                            Sem Instagram
                                        </span>
                                    )}
                                </div>

                                {/* Indicador de seleção */}
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    isSelected
                                        ? 'border-secondary bg-secondary text-secondary-foreground'
                                        : 'border-border'
                                }`}>
                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Aviso */}
                {pages.some(p => !p.has_instagram) && (
                    <div className="p-3 bg-muted rounded-lg border border-border flex items-start gap-3">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Páginas sem <strong className="text-foreground">Instagram Business</strong> vinculado não podem ser usadas para publicar no Instagram. Vincule uma conta pelo <strong className="text-foreground">Meta Business Suite</strong>.
                        </p>
                    </div>
                )}

                {/* Botão de Confirmar */}
                <button
                    onClick={handleConfirm}
                    disabled={!selectedPageId || isSubmitting}
                    className="w-full h-12 bg-secondary text-secondary-foreground rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-secondary/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Conectando...
                        </>
                    ) : (
                        'Confirmar Conexão'
                    )}
                </button>
            </div>
        </Modal>
    );
}
