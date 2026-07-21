import { Modal } from './Modal';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    zIndex?: number;
    variant?: 'danger' | 'success' | 'warning';
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
    isLoading = false,
    zIndex,
    variant = 'danger'
}: ConfirmModalProps) {
    const isSuccess = variant === 'success';
    const isWarning = variant === 'warning';

    return (
        <Modal isOpen={isOpen} onClose={onCancel} title={title} size="md" zIndex={zIndex}>
            <div className="flex flex-col items-center text-center p-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center mb-4 ${
                    isSuccess ? 'bg-emerald-100 dark:bg-emerald-900/30' : 
                    isWarning ? 'bg-amber-100 dark:bg-amber-900/30' : 
                    'bg-red-100 dark:bg-red-900/30'
                }`}>
                    {isSuccess ? (
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    ) : isWarning ? (
                        <AlertTriangle className="h-6 w-6 text-amber-500 dark:text-amber-400" />
                    ) : (
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                    {message}
                </p>
                <div className="flex w-full space-x-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 font-medium"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 font-medium ${
                            isSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 
                            isWarning ? 'bg-amber-500 hover:bg-amber-600' : 
                            'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {isLoading ? 'Aguarde...' : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
