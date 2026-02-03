'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    titleClassName?: string;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', titleClassName }: ModalProps) {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        '2xl': 'max-w-6xl',
        full: 'max-w-[95vw]'
    };
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`bg-card rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative`}>
                {title ? (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 gap-4">
                        <div className={`flex-1 min-w-0 ${titleClassName || ''}`}>
                            {typeof title === 'string' ? (
                                <h3 className="text-lg font-semibold text-foreground truncate">{title}</h3>
                            ) : (
                                title
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-background/50 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-all hover:bg-background/80"
                    >
                        <X size={20} />
                    </button>
                )}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
