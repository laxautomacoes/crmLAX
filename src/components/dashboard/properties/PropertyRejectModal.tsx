'use client'

import { useState } from 'react'
import { XCircle, X, MessageSquareWarning } from 'lucide-react'

interface PropertyRejectModalProps {
    isOpen: boolean
    propertyTitle: string
    onConfirm: (note: string) => Promise<void>
    onClose: () => void
}

const QUICK_REASONS = [
    'Fotos insuficientes ou de baixa qualidade',
    'Dados do imóvel incompletos',
    'Preço incorreto ou sem embasamento',
    'Documentação pendente',
    'Descrição inadequada ou faltando',
    'Endereço incorreto ou impreciso',
]

export function PropertyRejectModal({ isOpen, propertyTitle, onConfirm, onClose }: PropertyRejectModalProps) {
    const [note, setNote] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen) return null

    const handleConfirm = async () => {
        if (!note.trim()) return
        setIsSubmitting(true)
        try {
            await onConfirm(note.trim())
            setNote('')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (isSubmitting) return
        setNote('')
        onClose()
    }

    const appendReason = (reason: string) => {
        setNote(prev => prev ? `${prev}\n• ${reason}` : `• ${reason}`)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-500/10 rounded-xl">
                            <XCircle size={22} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Reprovar Imóvel</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]" title={propertyTitle}>
                                {propertyTitle}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                            <MessageSquareWarning size={14} className="text-red-500" />
                            Motivo da Reprovação
                        </label>
                        <p className="text-xs text-muted-foreground">
                            Este motivo será enviado ao responsável pelo imóvel via notificação e WhatsApp (se disponível).
                        </p>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Descreva o motivo da reprovação..."
                            rows={4}
                            className="w-full px-3 py-2.5 bg-foreground/5 border border-border/40 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 outline-none resize-none transition-all"
                        />
                    </div>

                    {/* Sugestões rápidas */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Sugestões rápidas
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_REASONS.map((reason) => (
                                <button
                                    key={reason}
                                    onClick={() => appendReason(reason)}
                                    className="px-2.5 py-1 text-[11px] font-medium bg-foreground/5 hover:bg-foreground/10 border border-border/40 rounded-full text-foreground transition-colors"
                                >
                                    + {reason}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 pt-0">
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground font-bold text-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!note.trim() || isSubmitting}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Reprovando...' : 'Reprovar e Notificar'}
                    </button>
                </div>
            </div>
        </div>
    )
}
