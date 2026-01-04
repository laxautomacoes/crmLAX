'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { LeadForm } from './LeadForm';
import { LeadFormSuccess } from './LeadFormSuccess';

interface LeadFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    assetId?: string;
    assetTitle?: string;
}

export function LeadFormModal({ isOpen, onClose, assetId, assetTitle }: LeadFormModalProps) {
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (result: { success?: boolean; error?: string }) => {
        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-[#404F4F]">
                        {success ? 'Enviado!' : 'Tenho Interesse'}
                    </h2>
                    {!success && (
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={24} />
                        </button>
                    )}
                </div>

                {success ? (
                    <LeadFormSuccess />
                ) : (
                    <LeadForm
                        assetId={assetId}
                        assetTitle={assetTitle}
                        onSubmit={handleSubmit}
                    />
                )}
            </div>
        </div>
    );
}

