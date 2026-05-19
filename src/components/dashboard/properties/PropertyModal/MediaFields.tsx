'use client'

import { useState } from 'react'
import { Image as ImageIcon, Film, FileText, X, Upload, Loader2, Download, Check, Globe } from 'lucide-react'

interface MediaFieldsProps {
    formData: any
    isUploading: string | null
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos' | 'documents') => Promise<void>
    removeFile: (index: number, type: 'images' | 'videos' | 'documents') => void
    sourceImages?: string[]
    isImportingImages?: boolean
    onImportImages?: (urls: string[]) => Promise<void>
    onRemoveSourceImage?: (index: number) => void
}

export function MediaFields({ 
    formData, isUploading, handleFileUpload, removeFile,
    sourceImages = [], isImportingImages = false, onImportImages, onRemoveSourceImage
}: MediaFieldsProps) {
    const [selectedSourceImages, setSelectedSourceImages] = useState<Set<number>>(new Set())

    const toggleSourceImage = (index: number) => {
        setSelectedSourceImages(prev => {
            const next = new Set(prev)
            if (next.has(index)) next.delete(index)
            else next.add(index)
            return next
        })
    }

    const selectAllSourceImages = () => {
        if (selectedSourceImages.size === sourceImages.length) {
            setSelectedSourceImages(new Set())
        } else {
            setSelectedSourceImages(new Set(sourceImages.map((_, i) => i)))
        }
    }

    const handleImport = async () => {
        if (!onImportImages || selectedSourceImages.size === 0) return
        const urls = Array.from(selectedSourceImages).map(i => sourceImages[i])
        await onImportImages(urls)
        setSelectedSourceImages(new Set())
    }

    return (
        <div className="col-span-2 space-y-6">
            <h4 className="text-sm font-black text-foreground uppercase tracking-widest mb-4">
                Mídia e Documentos
            </h4>

            <div className="space-y-8">

                {/* ── Imagens encontradas via Scraping ── */}
                {sourceImages.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Globe size={14} className="text-primary" />
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                                    Imagens encontradas na página ({sourceImages.length})
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllSourceImages}
                                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                                >
                                    {selectedSourceImages.size === sourceImages.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                            {sourceImages.map((url, index) => {
                                const isSelected = selectedSourceImages.has(index)
                                return (
                                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer" onClick={() => toggleSourceImage(index)}>
                                        <img 
                                            src={url} 
                                            alt={`Imagem ${index + 1}`} 
                                            className={`w-full h-full object-cover transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'opacity-70 group-hover:opacity-100'}`}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none'
                                                if (onRemoveSourceImage) onRemoveSourceImage(index)
                                            }}
                                        />
                                        {/* Selection overlay */}
                                        <div className={`absolute inset-0 flex items-center justify-center transition-all ${isSelected ? 'bg-primary/20' : 'bg-black/0 group-hover:bg-black/10'}`}>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary' : 'border-white/70 bg-black/30'}`}>
                                                {isSelected && <Check size={12} className="text-primary-foreground" />}
                                            </div>
                                        </div>
                                        {/* Remove btn */}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onRemoveSourceImage?.(index) }}
                                            className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Import button */}
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={isImportingImages || selectedSourceImages.size === 0}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-lg font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm"
                        >
                            {isImportingImages ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Importando imagens...
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Importar {selectedSourceImages.size > 0 ? `${selectedSourceImages.size} imagem(ns)` : 'Imagens Selecionadas'}
                                </>
                            )}
                        </button>

                        <div className="h-px bg-border/40" />
                    </div>
                )}

                {/* ── Imagens (já salvas no Storage) ── */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Imagens</span>
                    </div>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-3">
                        {formData.images.map((url: string, index: number) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                                <img src={url} alt={`Imóvel ${index}`} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeFile(index, 'images')}
                                    className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        <label className="aspect-square rounded-lg bg-foreground/5 hover:bg-foreground/10 flex flex-col items-center justify-center cursor-pointer transition-all">
                            {isUploading === 'images' ? (
                                <Loader2 className="w-6 h-6 text-foreground animate-spin" />
                            ) : (
                                <>
                                    <Upload size={20} className="text-foreground mb-1" />
                                    <span className="text-[10px] font-bold text-foreground">Carregar Imagem</span>
                                </>
                            )}
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, 'images')}
                                disabled={!!isUploading}
                            />
                        </label>
                    </div>
                </div>

                {/* Vídeos */}
                <div className="border-t border-border/40 pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Vídeos</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                        {formData.videos.map((url: string, index: number) => (
                            <div key={index} className="relative aspect-video rounded-lg overflow-hidden group bg-black/5 flex items-center justify-center">
                                <Film size={24} className="text-foreground" />
                                <button
                                    type="button"
                                    onClick={() => removeFile(index, 'videos')}
                                    className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        <label className="aspect-video rounded-lg bg-foreground/5 hover:bg-foreground/10 flex flex-col items-center justify-center cursor-pointer transition-all">
                            {isUploading === 'videos' ? (
                                <Loader2 className="w-6 h-6 text-foreground animate-spin" />
                            ) : (
                                <>
                                    <Upload size={20} className="text-foreground mb-1" />
                                    <span className="text-[10px] font-bold text-foreground">Carregar Vídeo</span>
                                </>
                            )}
                            <input
                                type="file"
                                multiple
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, 'videos')}
                                disabled={!!isUploading}
                            />
                        </label>
                    </div>
                </div>

                {/* Documentos */}
                <div className="border-t border-border/40 pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Documentos</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {formData.documents.map((doc: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-foreground/5 border border-border/40 group">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText size={14} className="text-foreground shrink-0" />
                                    <span className="text-xs font-medium truncate">{doc.name}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeFile(index, 'documents')}
                                    className="p-1 text-foreground hover:text-destructive transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        <label className="flex items-center justify-center gap-2 p-3 rounded-lg bg-foreground/5 border border-border/40 hover:bg-foreground/10 cursor-pointer transition-all">
                            {isUploading === 'documents' ? (
                                <Loader2 className="w-5 h-5 text-foreground animate-spin" />
                            ) : (
                                <>
                                    <Upload size={16} className="text-foreground" />
                                    <span className="text-sm font-medium text-foreground">Carregar Doc</span>
                                </>
                            )}
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, 'documents')}
                                disabled={!!isUploading}
                            />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    )
}
