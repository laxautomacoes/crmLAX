'use client';

import { useRouter } from 'next/navigation';
import { Modal } from '@/components/shared/Modal';
import { PropertyDetailsContent } from './PropertyDetailsContent';
import { Send } from 'lucide-react';

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
    const details = prop.details || {};

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onEdit) {
            onEdit(prop);
            onClose();
        } else {
            // Redireciona para a lista de imóveis com o query param ?edit=id
            router.push(`/properties?edit=${prop.id}`);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Visualização Imóvel" 
            size="xl"
            extraHeaderContent={
                canEdit ? (
                    <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-[#FFE600] hover:bg-[#F2DB00] text-[#404F4F] rounded-lg font-bold text-sm shadow-sm transition-all whitespace-nowrap"
                    >
                        Editar
                    </button>
                ) : null
            }
        >
            <PropertyDetailsContent 
                prop={prop}
                onSend={onSend}
                userRole={userRole}
                hasAIAccess={hasAIAccess}
                hasMarketingAccess={hasMarketingAccess}
                tenantId={tenantId}
                isModal={true}
            />
            
            {onSend && (
                <div className="flex gap-3 pt-8 border-t mt-8">
                    <button
                        onClick={() => onSend(prop)}
                        className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold hover:opacity-90 shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Send size={18} />
                        Enviar para Lead
                    </button>
                </div>
            )}
        </Modal>
    );
}
