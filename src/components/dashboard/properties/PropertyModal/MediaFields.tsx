'use client'

import { useState, useCallback, useRef } from 'react'
import { Image as ImageIcon, Film, FileText, X, Upload, Loader2, Download, Check, Globe, Trash2, GripVertical, Play, Pause, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
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
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SourceImageItem } from './SourceImageItem'

interface SortableImageProps {
    url: string;
    index: number;
    onRemove: (index: number) => void;
    isSelected?: boolean;
    onToggleSelect?: (url: string) => void;
    onPreview?: (url: string) => void;
}

function SortableImage({ url, index, onRemove, isSelected, onToggleSelect, onPreview }: SortableImageProps) {
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
            className={`relative aspect-square rounded-lg overflow-hidden group bg-foreground/5 border ${isSelected ? 'ring-2 ring-[#FFE600] ring-inset border-[#FFE600]/50' : 'border-muted-foreground/30'} transition-all`}
            onDoubleClick={(e) => { e.stopPropagation(); onPreview?.(url); }}
        >
            <div {...attributes} {...listeners} className="w-full h-full cursor-grab active:cursor-grabbing">
                <img src={url} alt={`Imóvel ${index}`} className="w-full h-full object-cover pointer-events-none" />
            </div>
            {/* Selected overlay (visual only, no pointer blocking) */}
            {isSelected && (
                <div className="absolute inset-0 bg-foreground/20 pointer-events-none z-[4]" />
            )}
            {/* Selection checkbox — canto superior esquerdo */}
            {onToggleSelect && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(url); }}
                    className={`absolute top-1 left-1 z-[6] w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                        isSelected 
                            ? 'bg-[#FFE600] opacity-100' 
                            : 'bg-foreground/40 opacity-0 group-hover:opacity-100'
                    }`}
                >
                    {isSelected ? (
                        <Check className="text-[#404F4F]" size={12} strokeWidth={3.5} />
                    ) : (
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-white/80" />
                    )}
                </button>
            )}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
                <X size={12} />
            </button>
            {/* Ícone de zoom clicável */}
            {onPreview && (
                <div
                    onClick={(e) => { e.stopPropagation(); onPreview(url); }}
                    className="absolute bottom-1 right-1 w-6 h-6 bg-black/60 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/80 z-[6]"
                >
                    <ZoomIn size={12} className="text-white" />
                </div>
            )}
        </div>
    );
}

interface SortableVideoProps {
    url: string;
    index: number;
    onRemove: (index: number) => void;
    onPreview?: (url: string) => void;
}

function SortableVideo({ url, index, onRemove, onPreview }: SortableVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
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

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!videoRef.current) return
        if (isPlaying) {
            videoRef.current.pause()
            setIsPlaying(false)
        } else {
            videoRef.current.play()
            setIsPlaying(true)
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative aspect-video rounded-lg overflow-hidden group bg-black flex items-center justify-center border border-muted-foreground/30"
            onDoubleClick={(e) => { e.stopPropagation(); onPreview?.(url); }}
        >
            {/* Drag handle — área superior */}
            <div {...attributes} {...listeners} className="absolute top-0 left-0 right-0 h-8 cursor-grab active:cursor-grabbing z-[3]" />
            {/* Vídeo com thumbnail */}
            <video
                ref={videoRef}
                src={`${url}#t=0.5`}
                preload="metadata"
                muted
                playsInline
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-cover"
            />
            {/* Play/Pause button */}
            <button
                type="button"
                onClick={togglePlay}
                className={`absolute inset-0 flex items-center justify-center z-[2] transition-all ${
                    isPlaying ? 'bg-transparent hover:bg-black/20' : 'bg-black/30 hover:bg-black/40'
                }`}
            >
                {isPlaying ? (
                    <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pause size={16} className="text-white" fill="white" />
                    </div>
                ) : (
                    <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                        <Play size={18} className="text-white ml-0.5" fill="white" />
                    </div>
                )}
            </button>
            {/* Remove button */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
                <X size={12} />
            </button>
            {/* Ícone de zoom clicável */}
            {onPreview && (
                <div
                    onClick={(e) => { e.stopPropagation(); onPreview(url); }}
                    className="absolute bottom-1 right-1 w-6 h-6 bg-black/60 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/80 z-[6]"
                >
                    <ZoomIn size={12} className="text-white" />
                </div>
            )}
        </div>
    );
}

interface SortableDocumentProps {
    doc: { name: string; url: string };
    index: number;
    onRemove: (index: number) => void;
    onPreview?: (url: string) => void;
}

function SortableDocument({ doc, index, onRemove, onPreview }: SortableDocumentProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: doc.url });

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
            className="flex items-center justify-between p-2 rounded-lg bg-background border border-muted-foreground/30 group"
            onDoubleClick={(e) => { e.stopPropagation(); onPreview?.(doc.url); }}
        >
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <GripVertical size={14} />
                </div>
                <FileText size={14} className="text-foreground shrink-0" />
                <span className="text-xs font-medium truncate">{doc.name}</span>
            </div>
            <div className="flex items-center gap-1">
                {onPreview && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onPreview(doc.url); }}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                        title="Abrir documento"
                    >
                        <ZoomIn size={14} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onRemove(index); }}
                    className="p-1 text-foreground hover:text-destructive transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}

// Hook para gerenciar drag & drop de arquivos do computador
function useFileDrop(
    onDrop: (files: FileList) => void,
    acceptPattern: string,
    disabled: boolean
) {
    const [isDragOver, setIsDragOver] = useState(false)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (disabled) return
        // Verificar se são arquivos (não elementos da página)
        if (e.dataTransfer.types.includes('Files')) {
            e.dataTransfer.dropEffect = 'copy'
            setIsDragOver(true)
        }
    }, [disabled])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        // Só seta false se estiver saindo do container (não de um filho)
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const { clientX, clientY } = e
        if (
            clientX <= rect.left ||
            clientX >= rect.right ||
            clientY <= rect.top ||
            clientY >= rect.bottom
        ) {
            setIsDragOver(false)
        }
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        if (disabled) return

        const files = e.dataTransfer.files
        if (!files || files.length === 0) return

        // Filtrar arquivos pelo tipo aceito
        const acceptTypes = acceptPattern.split(',').map(t => t.trim())
        const dataTransfer = new DataTransfer()

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const fileType = file.type
            const fileExt = '.' + (file.name.split('.').pop()?.toLowerCase() || '')

            const isAccepted = acceptTypes.some(pattern => {
                if (pattern.endsWith('/*')) {
                    // Ex: image/*, video/*
                    const baseType = pattern.replace('/*', '')
                    return fileType.startsWith(baseType)
                }
                // Extensões específicas (ex: .pdf, .doc)
                return fileExt === pattern.toLowerCase()
            })

            if (isAccepted) {
                dataTransfer.items.add(file)
            }
        }

        if (dataTransfer.files.length > 0) {
            onDrop(dataTransfer.files)
        } else {
            toast.error('Tipo de arquivo não aceito nesta área.')
        }
    }, [disabled, acceptPattern, onDrop])

    return { isDragOver, handleDragOver, handleDragLeave, handleDrop }
}

interface MediaFieldsProps {
    formData: any
    isUploading: string | null
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos' | 'documents') => Promise<void>
    handleFilesUpload: (files: FileList, type: 'images' | 'videos' | 'documents') => Promise<void>
    removeFile: (index: number, type: 'images' | 'videos' | 'documents') => void
    sourceImages?: string[]
    isImportingImages?: boolean
    onImportImages?: (urls: string[]) => Promise<void>
    onRemoveSourceImage?: (index: number) => void
    onReorderImages?: (newImages: string[]) => void
    onReorderVideos?: (newVideos: string[]) => void
    onReorderDocuments?: (newDocuments: { name: string; url: string }[]) => void
    propertyTitle?: string
    onRemoveMultipleImages?: (urls: string[]) => void
    onDragStart?: () => void
    onDragEnd?: () => void
    showImagesOnly?: boolean
    showVideosDocsOnly?: boolean
}

export function MediaFields({ 
    formData, isUploading, handleFileUpload, handleFilesUpload, removeFile,
    sourceImages = [], isImportingImages = false, onImportImages, onRemoveSourceImage, onReorderImages,
    onReorderVideos, onReorderDocuments,
    propertyTitle, onRemoveMultipleImages,
    onDragStart: onDragStartProp, onDragEnd: onDragEndProp,
    showImagesOnly = false,
    showVideosDocsOnly = false
}: MediaFieldsProps) {
    const [selectedSourceImages, setSelectedSourceImages] = useState<Set<number>>(new Set())
    const [activeImageId, setActiveImageId] = useState<string | null>(null)
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
    const [activeDocId, setActiveDocId] = useState<string | null>(null)
    const [isDownloading, setIsDownloading] = useState(false)
    const [selectedDownloadImages, setSelectedDownloadImages] = useState<Set<string>>(new Set())
    const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null)

    // Drag & drop hooks para cada tipo de mídia
    const imagesDrop = useFileDrop(
        useCallback((files: FileList) => handleFilesUpload(files, 'images'), [handleFilesUpload]),
        'image/*',
        !!isUploading
    )
    const videosDrop = useFileDrop(
        useCallback((files: FileList) => handleFilesUpload(files, 'videos'), [handleFilesUpload]),
        'video/*',
        !!isUploading
    )
    const documentsDrop = useFileDrop(
        useCallback((files: FileList) => handleFilesUpload(files, 'documents'), [handleFilesUpload]),
        '.pdf,.doc,.docx,.xls,.xlsx,.txt',
        !!isUploading
    )

    const toggleDownloadImage = (url: string) => {
        setSelectedDownloadImages(prev => {
            const next = new Set(prev)
            if (next.has(url)) next.delete(url)
            else next.add(url)
            return next
        })
    }

    const selectAllDownloadImages = () => {
        const images = formData.images || []
        if (selectedDownloadImages.size === images.length) {
            setSelectedDownloadImages(new Set())
        } else {
            setSelectedDownloadImages(new Set(images))
        }
    }

    const handleDownloadImages = async () => {
        const images = Array.from(selectedDownloadImages)
        if (images.length === 0) return
        setIsDownloading(true)
        try {
            for (let i = 0; i < images.length; i++) {
                const url = images[i]
                const response = await fetch(url)
                const blob = await response.blob()

                const contentType = response.headers.get('content-type')
                let ext = 'jpg'
                if (contentType?.includes('image/png')) ext = 'png'
                else if (contentType?.includes('image/webp')) ext = 'webp'

                const blobUrl = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = blobUrl

                const cleanTitle = (propertyTitle || 'imovel').toLowerCase().replace(/[^a-z0-9]+/g, '-')
                link.download = `${cleanTitle}-foto-${i + 1}.${ext}`

                document.body.appendChild(link)
                link.click()

                document.body.removeChild(link)
                URL.revokeObjectURL(blobUrl)

                await new Promise(resolve => setTimeout(resolve, 150))
            }
            toast.success('Download das fotos iniciado!')
        } catch (error) {
            console.error('Erro ao baixar imagens:', error)
            toast.error('Erro ao realizar o download das fotos.')
        } finally {
            setIsDownloading(false)
        }
    }

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

    // ── Image drag handlers ──
    const handleImageDragStart = (event: any) => {
        setActiveImageId(event.active.id)
        onDragStartProp?.()
    }

    const handleImageDragEnd = (event: any) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = formData.images.findIndex((img: string) => img === active.id)
            const newIndex = formData.images.findIndex((img: string) => img === over.id)
            if (oldIndex !== -1 && newIndex !== -1 && onReorderImages) {
                const newImages = arrayMove(formData.images, oldIndex, newIndex) as string[]
                onReorderImages(newImages)
            }
        }
        setActiveImageId(null)
        onDragEndProp?.()
    }

    // ── Video drag handlers ──
    const handleVideoDragStart = (event: any) => {
        setActiveVideoId(event.active.id)
        onDragStartProp?.()
    }

    const handleVideoDragEnd = (event: any) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = formData.videos.findIndex((v: string) => v === active.id)
            const newIndex = formData.videos.findIndex((v: string) => v === over.id)
            if (oldIndex !== -1 && newIndex !== -1 && onReorderVideos) {
                const newVideos = arrayMove(formData.videos, oldIndex, newIndex) as string[]
                onReorderVideos(newVideos)
            }
        }
        setActiveVideoId(null)
        onDragEndProp?.()
    }

    // ── Document drag handlers ──
    const handleDocDragStart = (event: any) => {
        setActiveDocId(event.active.id)
        onDragStartProp?.()
    }

    const handleDocDragEnd = (event: any) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const docs = formData.documents as { name: string; url: string }[]
            const oldIndex = docs.findIndex((d) => d.url === active.id)
            const newIndex = docs.findIndex((d) => d.url === over.id)
            if (oldIndex !== -1 && newIndex !== -1 && onReorderDocuments) {
                const newDocs = arrayMove(docs, oldIndex, newIndex) as { name: string; url: string }[]
                onReorderDocuments(newDocs)
            }
        }
        setActiveDocId(null)
        onDragEndProp?.()
    }

    // IDs para SortableContext
    const imageIds = formData.images || []
    const videoIds = formData.videos || []
    const documentIds = (formData.documents || []).map((d: any) => d.url)

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

    // Estilos base para zonas de drop
    const dropZoneActiveClass = 'ring-2 ring-secondary ring-inset bg-secondary/5 border-secondary/50'

    const renderImages = () => (
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

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-foreground tracking-wider">Imagens</span>
                    </div>
                    {formData.images?.length > 0 && (
                        <div className="flex items-center gap-3">
                            {selectedDownloadImages.size >= 2 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const urls = Array.from(selectedDownloadImages)
                                        if (onRemoveMultipleImages) {
                                            onRemoveMultipleImages(urls)
                                        }
                                        setSelectedDownloadImages(new Set())
                                    }}
                                    className="text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/40 rounded-md px-2 py-1 transition-all uppercase tracking-wider flex items-center gap-1"
                                >
                                    <Trash2 size={12} />
                                    Excluir {selectedDownloadImages.size}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={selectAllDownloadImages}
                                className={`text-[10px] font-bold rounded-md px-2 py-1 transition-all uppercase tracking-wider ${selectedDownloadImages.size > 0 ? 'text-foreground border border-muted-foreground/50 hover:bg-foreground/10' : 'text-muted-foreground/50 border border-border/30 hover:text-muted-foreground hover:border-border/50'}`}
                            >
                                {selectedDownloadImages.size === formData.images.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                            </button>
                        </div>
                    )}
                </div>
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleImageDragStart}
                    onDragEnd={handleImageDragEnd}
                >
                    <div 
                        className={`grid grid-cols-4 md:grid-cols-6 gap-3 mb-3 rounded-xl p-2 -m-2 transition-all duration-200 ${imagesDrop.isDragOver ? dropZoneActiveClass : ''}`}
                        onDragOver={imagesDrop.handleDragOver}
                        onDragLeave={imagesDrop.handleDragLeave}
                        onDrop={imagesDrop.handleDrop}
                    >
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
                                    isSelected={selectedDownloadImages.has(url)}
                                    onToggleSelect={toggleDownloadImage}
                                    onPreview={(u) => setPreviewMedia({ url: u, type: 'image' })}
                                />
                            ))}
                        </SortableContext>
                        {imagesDrop.isDragOver ? (
                            <div className="aspect-square rounded-lg bg-secondary/10 flex flex-col items-center justify-center border-2 border-dashed border-secondary/60 animate-pulse">
                                <Upload size={20} className="text-secondary mb-1" />
                                <span className="text-[10px] font-bold text-secondary">Soltar aqui</span>
                            </div>
                        ) : (
                            <label className="aspect-square rounded-lg bg-background hover:bg-foreground/10 flex flex-col items-center justify-center cursor-pointer transition-all border border-muted-foreground/30">
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
                        )}
                    </div>
                {selectedDownloadImages.size > 0 && (
                    <button
                        type="button"
                        onClick={handleDownloadImages}
                        disabled={isDownloading}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-muted-foreground/30 text-muted-foreground hover:bg-foreground/5 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isDownloading ? (
                            <>
                                <Loader2 className="animate-spin" size={14} />
                                <span>Baixando fotos...</span>
                            </>
                        ) : (
                            <>
                                <Download size={14} />
                                <span>Baixar {selectedDownloadImages.size} {selectedDownloadImages.size === 1 ? 'foto selecionada' : 'fotos selecionadas'}</span>
                            </>
                        )}
                    </button>
                )}
                <DragOverlay>
                    {activeImageId ? (
                        <div className="relative aspect-square rounded-lg overflow-hidden group bg-foreground/5 cursor-grabbing opacity-80 shadow-2xl scale-105 border border-muted-foreground/30">
                            <img src={activeImageId} alt="Arrastando" className="w-full h-full object-cover pointer-events-none" />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    </div>
    )

    const renderVideosDocs = () => (
        <div className="space-y-8">
            {/* Vídeos */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-foreground tracking-wider">Vídeos</span>
                </div>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleVideoDragStart}
                    onDragEnd={handleVideoDragEnd}
                >
                    <div 
                        className={`grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 rounded-xl p-2 -m-2 transition-all duration-200 ${videosDrop.isDragOver ? dropZoneActiveClass : ''}`}
                        onDragOver={videosDrop.handleDragOver}
                        onDragLeave={videosDrop.handleDragLeave}
                        onDrop={videosDrop.handleDrop}
                    >
                        <SortableContext items={videoIds} strategy={rectSortingStrategy}>
                            {formData.videos.map((url: string, index: number) => (
                                <SortableVideo
                                    key={url}
                                    url={url}
                                    index={index}
                                    onRemove={(i) => removeFile(i, 'videos')}
                                    onPreview={(u) => setPreviewMedia({ url: u, type: 'video' })}
                                />
                            ))}
                        </SortableContext>
                        {videosDrop.isDragOver ? (
                            <div className="aspect-video rounded-lg bg-secondary/10 flex flex-col items-center justify-center border-2 border-dashed border-secondary/60 animate-pulse">
                                <Upload size={20} className="text-secondary mb-1" />
                                <span className="text-[10px] font-bold text-secondary">Soltar aqui</span>
                            </div>
                        ) : (
                            <label className="aspect-video rounded-lg bg-background hover:bg-foreground/10 flex flex-col items-center justify-center cursor-pointer transition-all border border-muted-foreground/30">
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
                        )}
                    </div>
                    <DragOverlay>
                        {activeVideoId ? (
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black cursor-grabbing opacity-80 shadow-2xl scale-105 border border-muted-foreground/30">
                                <video
                                    src={`${activeVideoId}#t=0.5`}
                                    preload="metadata"
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                    <Film size={20} className="text-white" />
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {/* Documentos */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-foreground tracking-wider">Documentos</span>
                </div>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDocDragStart}
                    onDragEnd={handleDocDragEnd}
                >
                    <div 
                        className={`flex flex-col gap-2 rounded-xl p-2 -m-2 transition-all duration-200 ${documentsDrop.isDragOver ? dropZoneActiveClass : ''}`}
                        onDragOver={documentsDrop.handleDragOver}
                        onDragLeave={documentsDrop.handleDragLeave}
                        onDrop={documentsDrop.handleDrop}
                    >
                        <SortableContext items={documentIds} strategy={verticalListSortingStrategy}>
                            {formData.documents.map((doc: any, index: number) => (
                                <SortableDocument
                                    key={doc.url}
                                    doc={doc}
                                    index={index}
                                    onRemove={(i) => removeFile(i, 'documents')}
                                    onPreview={(url) => window.open(url, '_blank')}
                                />
                            ))}
                        </SortableContext>
                        {documentsDrop.isDragOver ? (
                            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-secondary/10 border-2 border-dashed border-secondary/60 animate-pulse">
                                <Upload size={16} className="text-secondary" />
                                <span className="text-sm font-medium text-secondary">Soltar documento aqui</span>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center gap-2 p-3 rounded-lg bg-background border border-muted-foreground/30 hover:bg-foreground/10 cursor-pointer transition-all">
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
                        )}
                    </div>
                    <DragOverlay>
                        {activeDocId ? (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-muted-foreground/30 shadow-2xl cursor-grabbing opacity-90">
                                <GripVertical size={14} className="text-muted-foreground" />
                                <FileText size={14} className="text-foreground" />
                                <span className="text-xs font-medium">
                                    {(formData.documents as { name: string; url: string }[]).find((d) => d.url === activeDocId)?.name || 'Documento'}
                                </span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>
        </div>
    )

    const renderPreviewLightbox = () => {
        if (!previewMedia) return null
        return (
            <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setPreviewMedia(null)}
            >
                <div
                    className="relative max-w-[85vw] max-h-[85vh] animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {previewMedia.type === 'image' ? (
                        <img
                            src={previewMedia.url}
                            alt="Preview ampliada"
                            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                        />
                    ) : (
                        <video
                            src={previewMedia.url}
                            controls
                            autoPlay
                            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
                        />
                    )}
                    <button
                        onClick={() => setPreviewMedia(null)}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-card border border-border rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-all shadow-lg z-10"
                    >
                        <X size={16} />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-lg">
                        <p className="text-white text-[11px] font-medium">Clique fora ou no ✕ para fechar</p>
                    </div>
                </div>
            </div>
        )
    }

    if (showImagesOnly) {
        return (
            <div className="col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">
                    Imagens
                </h3>
                {renderImages()}
                {renderPreviewLightbox()}
            </div>
        )
    }

    if (showVideosDocsOnly) {
        return (
            <div className="col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">
                    Vídeos e Documentos
                </h3>
                {renderVideosDocs()}
                {renderPreviewLightbox()}
            </div>
        )
    }

    return (
        <div className="col-span-2 space-y-6">
            <h4 className="text-base font-black text-foreground uppercase tracking-widest mb-4">
                Mídias e Documentos
            </h4>
            <div className="space-y-8">
                {renderImages()}
                {renderVideosDocs()}
            </div>
            {renderPreviewLightbox()}
        </div>
    )
}
