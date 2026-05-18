'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { X } from 'lucide-react'

export function InterceptedModalClose() {
    const router = useRouter()
    const hasHistory = useRef(typeof window !== 'undefined' && window.history.length > 1)

    const handleClose = () => {
        if (hasHistory.current) {
            router.back()
        } else {
            router.push('/properties')
        }
    }

    return (
        <button
            onClick={handleClose}
            className="absolute top-0 right-0 p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground transition-all border border-border/50 z-50"
            title="Fechar e voltar"
        >
            <X size={20} />
        </button>
    )
}

