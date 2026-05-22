'use client';

import { useRouter } from 'next/navigation';
import { Modal } from '@/components/shared/Modal';
import { PropertyDetailsContent } from './PropertyDetailsContent';
import { Send, Pencil } from 'lucide-react';

interface PropertyDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prop: any;
    onSend?: (prop: any) => void;
    onEdit?: (prop: any) => void;
    userRole?: string;
    userId?: string;
    hasAIAccess: boolean;
    hasMarketingAccess: boolean;
    tenantId: string;
}

export function PropertyDetailsModal({ isOpen, onClose, prop, onSend, onEdit, userRole, userId, hasAIAccess, hasMarketingAccess, tenantId }: PropertyDetailsModalProps) {
    const router = useRouter();
    if (!prop) return null;

    const isAdmin = userRole === 'admin' || userRole === 'superadmin';
    const isOwner = userId && prop.created_by === userId;
    const canEdit = isAdmin || isOwner;

    const handleEdit = () => {
        if (onEdit) {
            onEdit(prop);
        } else {
            // Redireciona para a lista de imóveis com o query param ?edit=id
            router.push(`/properties?edit=${prop.id}`);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={null} size="xl">
            <PropertyDetailsContent 
                prop={prop}
                onSend={onSend}
                userRole={userRole}
                hasAIAccess={hasAIAccess}
                hasMarketingAccess={hasMarketingAccess}
                tenantId={tenantId}
                isModal={true}
            />
            
            <div className="flex gap-3 pt-6 border-t mt-6">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-muted text-foreground border border-border rounded-xl font-bold hover:bg-muted/80 transition-all active:scale-[0.98]"
                >
                    Fechar
                </button>
                {canEdit && (
                    <button
                        onClick={handleEdit}
                        className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Pencil size={18} />
                        Editar Imóvel
                    </button>
                )}
                {onSend && (
                    <button
                        onClick={() => onSend(prop)}
                        className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:opacity-90 shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Send size={18} />
                        Enviar para Lead
                    </button>
                )}
            </div>
        </Modal>
    );
}
