'use client'

import { useState } from 'react'
import { Image as ImageIcon, Film, FileText, X, Upload, Loader2, Download, Check, Globe } from 'lucide-react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SourceImageItem } from './SourceImageItem'

interface SortableImageProps {
    url: string;
    index: number;
    onRemove: (index: number) => void;
}

function SortableImage({ url, index, onRemove }: SortableImageProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: url });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="relative aspect-square rounded-lg overflow-hidden group bg-foreground/5"
        >
            <div {...attributes} {...listeners} className="w-full h-full cursor-grab active:cursor-grabbing">
                <img src={url} alt={`Imóvel ${index}`} className="w-full h-full object-cover pointer-events-none" />
            </div>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
                <X size={12} />
            </button>
        </div>
    );
}

interface MediaFieldsProps {
    formData: any
    isUploading: string | null
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos' | 'documents') => Promise<void>
    removeFile: (index: number, type: 'images' | 'videos' | 'documents') => void
    sourceImages?: string[]
    isImportingImages?: boolean
    onImportImages?: (urls: string[]) => Promise<void>
    onRemoveSourceImage?: (index: number) => void
    onReorderImages?: (newImages: string[]) => void
}

export function MediaFields({ 
    formData, isUploading, handleFileUpload, removeFile,
    sourceImages = [], isImportingImages = false, onImportImages, onRemoveSourceImage, onReorderImages
}: MediaFieldsProps) {
    const [selectedSourceImages, setSelectedSourceImages] = useState<Set<number>>(new Set())
    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id)
    }

    const handleDragEnd = (event: any) => {
        const { active, over } = event
        
        if (over && active.id !== over.id) {
            const oldIndex = formData.images.findIndex((img: string) => img === active.id)
            const newIndex = formData.images.findIndex((img: string) => img === over.id)
            
            if (oldIndex !== -1 && newIndex !== -1 && onReorderImages) {
                const newImages = arrayMove(formData.images, oldIndex, newIndex) as string[]
                onReorderImages(newImages)
            }
        }
        
        setActiveId(null)
    }

    // Usaremos as URLs como IDs, então vamos criar um array de IDs para o SortableContext
    const imageIds = formData.images || []

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
            <h4 className="text-base font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <ImageIcon size={14} className="text-foreground" />
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
                            {sourceImages.map((url, index) => (
                                <SourceImageItem
                                    key={index}
                                    url={url}
                                    index={index}
                                    isSelected={selectedSourceImages.has(index)}
                                    onToggle={toggleSourceImage}
                                    onRemove={(idx) => onRemoveSourceImage?.(idx)}
                                />
                            ))}
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
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-3">
                            <SortableContext 
                                items={imageIds}
                                strategy={rectSortingStrategy}
                            >
                                {formData.images.map((url: string, index: number) => (
                                    <SortableImage 
                                        key={url} 
                                        url={url} 
                                        index={index} 
                                        onRemove={(i) => removeFile(i, 'images')} 
                                    />
                                ))}
                            </SortableContext>
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
                    <DragOverlay>
                        {activeId ? (
                            <div className="relative aspect-square rounded-lg overflow-hidden group bg-foreground/5 cursor-grabbing opacity-80 shadow-2xl scale-105">
                                <img src={activeId} alt="Arrastando" className="w-full h-full object-cover pointer-events-none" />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

                {/* Vídeos */}
                <div className="space-y-4">
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
                <div className="space-y-4">
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
                                    <span className="text-sm font-medium text-foreground">Carregar Documento</span>
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
