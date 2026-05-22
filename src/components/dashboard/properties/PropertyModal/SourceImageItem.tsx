'use client'

import { useState } from 'react'
import { Image as ImageIcon, X, Check } from 'lucide-react'

interface SourceImageItemProps {
    url: string
    index: number
    isSelected: boolean
    onToggle: (index: number) => void
    onRemove: (index: number) => void
}

export function SourceImageItem({ url, index, isSelected, onToggle, onRemove }: SourceImageItemProps) {
    const [hasError, setHasError] = useState(false)

    return (
        <div 
            className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer bg-foreground/5 border border-border/40 flex items-center justify-center select-none"
            onClick={() => onToggle(index)}
        >
            {!hasError ? (
                <img 
                    src={url} 
                    alt={`Imagem sugerida ${index + 1}`} 
                    className={`w-full h-full object-cover transition-all duration-200 ${
                        isSelected 
                            ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-[0.98]' 
                            : 'opacity-70 group-hover:opacity-100'
                    }`}
                    onError={() => setHasError(true)}
                />
            ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center p-2 text-center bg-muted/40 transition-all duration-200 ${
                    isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-[0.98]' : ''
                }`}>
                    <ImageIcon className="w-5 h-5 text-muted-foreground/60 mb-1" />
                    <span className="text-[8px] font-bold text-muted-foreground/80 uppercase tracking-wider line-clamp-2 px-1">
                        Erro ao carregar local
                    </span>
                </div>
            )}

            {/* Selection overlay */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
                isSelected ? 'bg-primary/20' : 'bg-black/0 group-hover:bg-black/10'
            }`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    isSelected ? 'bg-primary border-primary scale-110' : 'border-white/70 bg-black/30'
                }`}>
                    {isSelected && <Check size={12} className="text-primary-foreground stroke-[3]" />}
                </div>
            </div>

            {/* Remove button */}
            <button
                type="button"
                onClick={(e) => { 
                    e.stopPropagation()
                    onRemove(index)
                }}
                className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive"
            >
                <X size={10} />
            </button>
        </div>
    )
}
