'use client'

import { Image as ImageIcon, Film, FileText, X, Upload, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MediaUploadProps {
    images: string[]
    videos: string[]
    documents: { name: string; url: string }[]
    onUpload: (type: 'images' | 'videos' | 'documents', urls: any[]) => void
    onRemove: (type: 'images' | 'videos' | 'documents', index: number) => void
}

export function MediaUpload({ images, videos, documents, onUpload, onRemove }: MediaUploadProps) {
    const [isUploading, setIsUploading] = useState<'images' | 'videos' | 'documents' | null>(null)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos' | 'documents') => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setIsUploading(type)
        const supabase = createClient()
        
        try {
            const uploadedFiles: (string | { name: string; url: string })[] = []

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const maxSize = type === 'images' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
                if (file.size > maxSize) {
                    alert(`O arquivo ${file.name} é muito grande. O limite para ${type} é ${maxSize / (1024 * 1024)}MB.`)
                    continue
                }

                const fileExt = file.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
                const filePath = `${type}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('crm-attachments')
                    .upload(filePath, file, { cacheControl: '3600' })

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('crm-attachments')
                    .getPublicUrl(filePath)

                if (type === 'documents') {
                    uploadedFiles.push({ name: file.name, url: publicUrl })
                } else {
                    uploadedFiles.push(publicUrl)
                }
            }

            onUpload(type, uploadedFiles)
        } catch (error: any) {
            console.error(`Error uploading ${type}:`, error)
            alert(`Erro ao carregar ${type}: ${error.message || 'Por favor, tente novamente.'}`)
        } finally {
            setIsUploading(null)
            e.target.value = ''
        }
    }

    return (
        <div className="space-y-6">
            {/* Imagens */}
            <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-3">
                    <ImageIcon size={12} />
                    Imagens
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {images.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border border-border">
                            <img src={url} alt={`Upload ${index}`} className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => onRemove('images', index)}
                                className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    <label className="aspect-square rounded-lg bg-muted/50 hover:bg-muted flex flex-col items-center justify-center cursor-pointer transition-all border border-dashed border-border">
                        {isUploading === 'images' ? (
                            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        ) : (
                            <>
                                <Upload size={16} className="text-muted-foreground mb-1" />
                                <span className="text-[9px] font-bold text-muted-foreground">Upload</span>
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
            <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-3">
                    <Film size={12} />
                    Vídeos
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {videos.map((url, index) => (
                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden group bg-muted/30 flex items-center justify-center border border-border">
                            <Film size={20} className="text-muted-foreground" />
                            <button
                                type="button"
                                onClick={() => onRemove('videos', index)}
                                className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                    <label className="aspect-video rounded-lg bg-muted/50 hover:bg-muted flex flex-col items-center justify-center cursor-pointer transition-all border border-dashed border-border">
                        {isUploading === 'videos' ? (
                            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        ) : (
                            <>
                                <Upload size={16} className="text-muted-foreground mb-1" />
                                <span className="text-[9px] font-bold text-muted-foreground">Upload Vídeo</span>
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
            <div>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-3">
                    <FileText size={12} />
                    Documentos
                </h4>
                <div className="space-y-2">
                    {documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border group">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileText size={14} className="text-muted-foreground shrink-0" />
                                <span className="text-xs font-medium truncate">{doc.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove('documents', index)}
                                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    <label className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-all border border-dashed border-border">
                        {isUploading === 'documents' ? (
                            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        ) : (
                            <>
                                <Upload size={16} className="text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Adicionar Documento</span>
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
    )
}
