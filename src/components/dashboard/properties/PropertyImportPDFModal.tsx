'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/shared/Modal'
import { FileText, Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PropertyImportPDFModalProps {
    isOpen: boolean
    onClose: () => void
    tenantId: string | null
    onImportSuccess: () => void
}

export function PropertyImportPDFModal({
    isOpen,
    onClose,
    tenantId,
    onImportSuccess
}: PropertyImportPDFModalProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile)
        } else {
            toast.error('Por favor, selecione um arquivo PDF válido.')
            setFile(null)
        }
    }

    const handleUpload = async () => {
        if (!file || !tenantId) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tenant_id', tenantId)

        try {
            // Em produção, o URL da Edge Function deve vir de uma var de ambiente
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-property-pdf`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                },
                body: formData
            })

            const result = await response.json()

            if (response.ok && result.success) {
                toast.success(`${result.count} imóveis processados e atualizados pela IA!`)
                onImportSuccess()
                handleClose()
            } else {
                throw new Error(result.error || 'Erro desconhecido ao processar PDF')
            }
        } catch (error: any) {
            console.error('Erro no OCR:', error)
            toast.error('Erro ao processar tabela: ' + error.message)
        } finally {
            setIsUploading(false)
        }
    }

    const handleClose = () => {
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Importar Tabela PDF (IA)" size="md">
            <div className="space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="text-primary shrink-0" size={20} />
                    <p className="text-xs text-foreground/80 leading-relaxed">
                        A nossa IA (Gemini 2.0 Flash) irá ler o seu PDF e extrair automaticamente os nomes das unidades, preços, áreas e status. 
                        Imóveis com o mesmo título serão **atualizados** com os novos valores.
                    </p>
                </div>

                {!file ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer group"
                    >
                        <div className="p-4 bg-muted rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <Upload size={32} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-foreground">Clique para selecionar</p>
                            <p className="text-xs text-muted-foreground mt-1">Apenas arquivos PDF são aceitos</p>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept=".pdf" 
                            className="hidden" 
                        />
                    </div>
                ) : (
                    <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-500 rounded-xl">
                                <FileText size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground truncate max-w-[200px]">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setFile(null)}
                            className="text-xs font-bold text-red-500 hover:underline"
                        >
                            Remover
                        </button>
                    </div>
                )}

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleClose}
                        disabled={isUploading}
                        className="flex-1 px-6 py-3 text-sm font-bold text-foreground hover:bg-muted/50 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Processando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} />
                                Iniciar Importação
                            </>
                        )}
                    </button>
                </div>

                {isUploading && (
                    <p className="text-[10px] text-center text-muted-foreground animate-pulse">
                        Isso pode levar alguns segundos dependendo do tamanho da tabela.
                    </p>
                )}
            </div>
        </Modal>
    )
}
