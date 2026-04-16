'use client';

import { Modal } from '@/components/shared/Modal';
import { InviteForm } from './InviteForm';

interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function InviteUserModal({ isOpen, onClose, onSuccess }: InviteUserModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Convidar Novo Colaborador"
            size="md"
        >
            <div className="-mx-6 -mt-6">
                <InviteForm 
                    onInviteCreated={() => {
                        onSuccess();
                        onClose();
                    }} 
                    isModalMode={true}
                />
            </div>
        </Modal>
    );
}
