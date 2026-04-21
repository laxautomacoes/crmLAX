import { Modal } from '@/components/shared/Modal';
import { PropertyDetailsContent } from './PropertyDetailsContent';
import { Send } from 'lucide-react';

interface PropertyDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    prop: any;
    onSend?: (prop: any) => void;
    userRole?: string;
    hasAIAccess: boolean;
    hasMarketingAccess: boolean;
    tenantId: string;
}

export function PropertyDetailsModal({ isOpen, onClose, prop, onSend, userRole, hasAIAccess, hasMarketingAccess, tenantId }: PropertyDetailsModalProps) {
    if (!prop) return null;

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
