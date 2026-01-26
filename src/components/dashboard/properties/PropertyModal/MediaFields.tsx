'use client'

import { Image as ImageIcon, Film, FileText, X, Upload, Loader2 } from 'lucide-react'

interface MediaFieldsProps {
    formData: any
    isUploading: string | null
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'images' | 'videos' | 'documents') => Promise<void>
    removeFile: (index: number, type: 'images' | 'videos' | 'documents') => void
}

export function MediaFields({ formData, isUploading, handleFileUpload, removeFile }: MediaFieldsProps) {
    return (
        <div className="col-span-2 pt-4 border-t border-border">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                Mídia e Arquivos
            </h4>
            
            <div className="space-y-6">
                {/* Imagens */}
                <div>
                    <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                        <ImageIcon size={16} className="text-primary" /> Imagens
                    </label>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-3">
                        {formData.images.map((url: string, index: number) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                                <img src={url} alt={`Property ${index}`} className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeFile(index, 'images')}
                                    className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-all">
                            {isUploading === 'images' ? (
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            ) : (
                                <>
                                    <Upload size={20} className="text-muted-foreground mb-1" />
                                    <span className="text-[10px] font-bold text-muted-foreground">Upload</span>
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
                    <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                        <Film size={16} className="text-primary" /> Vídeos
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                        {formData.videos.map((url: string, index: number) => (
                            <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-border group bg-black/5 flex items-center justify-center">
                                <Film size={24} className="text-muted-foreground" />
                                <button
                                    type="button"
                                    onClick={() => removeFile(index, 'videos')}
                                    className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        <label className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-all">
                            {isUploading === 'videos' ? (
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            ) : (
                                <>
                                    <Upload size={20} className="text-muted-foreground mb-1" />
                                    <span className="text-[10px] font-bold text-muted-foreground">Upload Vídeo</span>
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
                    <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                        <FileText size={16} className="text-primary" /> Documentos
                    </label>
                    <div className="space-y-2 mb-3">
                        {formData.documents.map((doc: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border group">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText size={14} className="text-muted-foreground shrink-0" />
                                    <span className="text-xs font-medium truncate">{doc.name}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeFile(index, 'documents')}
                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        <label className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all">
                            {isUploading === 'documents' ? (
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            ) : (
                                <>
                                    <Upload size={16} className="text-muted-foreground" />
                                    <span className="text-sm font-medium text-muted-foreground">Adicionar Documento</span>
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
