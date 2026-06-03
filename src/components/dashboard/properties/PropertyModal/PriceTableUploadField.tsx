'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, Trash2, Loader2, Eye, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface PriceTableUploadFieldProps {
    formData: any
    setFormData: (data: any) => void
    tenantId: string
    propertyId?: string
}

export function PriceTableUploadField({ formData, setFormData, tenantId, propertyId }: PriceTableUploadFieldProps) {
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const currentUrl = formData.details?.empreendimento?.tabela_modelo_url || ''
    const currentFileName = formData.details?.empreendimento?.tabela_modelo_nome || ''

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validar tipo
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
        if (!allowed.includes(file.type)) {
            toast.error('Formato não suportado. Use PDF, JPG, PNG ou WebP.')
            return
        }

        // Validar tamanho (20MB)
        if (file.size > 20 * 1024 * 1024) {
            toast.error('Arquivo muito grande. O limite é 20MB.')
            return
        }

        setIsUploading(true)
        try {
            const supabase = createClient()
            const fileExt = file.name.split('.').pop()
            const fileName = `tabela-modelo-${Date.now()}.${fileExt}`
            const filePath = `price-tables/templates/${tenantId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('property-properties')
                .upload(filePath, file, { cacheControl: '3600' })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('property-properties')
                .getPublicUrl(filePath)

            // Salvar URL no formData
            setFormData({
                ...formData,
                details: {
                    ...formData.details,
                    empreendimento: {
                        ...formData.details.empreendimento,
                        tabela_modelo_url: publicUrl,
                        tabela_modelo_nome: file.name
                    }
                }
            })

            // Também salvar na coluna direta (será processado pelo preparePropertyData)
            // O price_table_template_url no banco é atualizado pela edge function

            toast.success('Tabela-modelo enviada com sucesso!')
        } catch (error: any) {
            console.error('Error uploading template:', error)
            toast.error('Erro ao enviar tabela-modelo: ' + error.message)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleRemove = () => {
        setFormData({
            ...formData,
            details: {
                ...formData.details,
                empreendimento: {
                    ...formData.details.empreendimento,
                    tabela_modelo_url: '',
                    tabela_modelo_nome: ''
                }
            }
        })
        toast.success('Tabela-modelo removida.')
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                    Tabela de Preços — Modelo
                </h4>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed -mt-2">
                Suba a tabela-modelo deste empreendimento. A IA usará esta referência para 
                identificar automaticamente os campos ao processar as tabelas mensais.
            </p>

            {currentUrl ? (
                /* ── Tabela-modelo já enviada ── */
                <div className="flex items-center gap-3 p-4 rounded-xl bg-foreground/5 border border-border/40">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl shrink-0">
                        <CheckCircle2 size={20} className="text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                            {currentFileName || 'Tabela-modelo'}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">
                            Modelo de referência configurado
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <a
                            href={currentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                            title="Visualizar"
                        >
                            <Eye size={16} />
                        </a>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            title="Remover"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                /* ── Campo de upload ── */
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full flex flex-col items-center justify-center gap-3 p-8 rounded-xl bg-foreground/5 border border-dashed border-border/60 hover:bg-foreground/10 hover:border-border transition-all cursor-pointer text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUploading ? (
                        <>
                            <Loader2 size={28} className="animate-spin text-muted-foreground" />
                            <span className="text-sm font-medium">Enviando...</span>
                        </>
                    ) : (
                        <>
                            <div className="p-3 bg-foreground/5 rounded-xl">
                                <Upload size={24} />
                            </div>
                            <div className="text-center space-y-1">
                                <span className="text-sm font-bold text-foreground block">
                                    Clique para enviar a tabela-modelo
                                </span>
                                <span className="text-[10px] uppercase tracking-wider font-bold">
                                    PDF, JPG, PNG ou WebP · Máx 20MB
                                </span>
                            </div>
                        </>
                    )}
                </button>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleUpload}
                className="hidden"
            />
        </div>
    )
}
