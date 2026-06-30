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

const COLUMN_MAPPING_FIELDS = [
    { key: 'apto', label: 'Apto', placeholder: 'Ex: Unidade, Apto, Nº Unid.', hint: 'Número do apartamento' },
    { key: 'torre', label: 'Torre', placeholder: 'Ex: Bloco, Edifício ou "-" se não houver', hint: 'Torre ou bloco do empreendimento' },
    { key: 'tipo', label: 'Tipo / Tipologia', placeholder: 'Ex: Tipologia, Planta, Tipo', hint: 'Ex: Studio, 2 suítes...' },
    { key: 'vaga', label: 'Vaga / Garagem', placeholder: 'Ex: Garagem, Vaga, Box', hint: 'Número da vaga' },
    { key: 'hb', label: 'HB / Hobby Box', placeholder: 'Ex: Depósito, HB, Box', hint: 'Hobby box ou depósito' },
    { key: 'area_privativa', label: 'Área Privativa', placeholder: 'Ex: Área Priv., P, Priv.', hint: 'Área exclusiva do apto' },
    { key: 'valor_total', label: 'Valor Total', placeholder: 'Ex: Valor, Preço, R$ Total', hint: 'Preço do imóvel' },
    { key: 'ato', label: 'Ato / Entrada', placeholder: 'Ex: Ato, Entrada, R$ Ato', hint: 'Coluna de ato ou entrada' },
    { key: 'mensais', label: 'Mensais', placeholder: 'Ex: Mensais, Parcelas, R$ Mensais', hint: 'Coluna de parcelas mensais' },
    { key: 'mensais_meses', label: 'Mensais (Nº de Meses)', placeholder: 'Ex: 36', hint: 'Quantidade total de mensais' },
    { key: 'reforcos', label: 'Reforços / Intermediárias', placeholder: 'Ex: Reforços, Balões, R$ Ref.', hint: 'Coluna de balão/reforço' },
    { key: 'reforcos_periodo', label: 'Reforços (Período)', placeholder: 'Ex: semestral, anual', hint: 'Período dos reforços' },
    { key: 'chaves', label: 'Chaves / Entrega', placeholder: 'Ex: Chaves, Entrega, R$ Chaves', hint: 'Coluna do valor das chaves' },
    { key: 'saldo', label: 'Saldo devedor / Poupança', placeholder: 'Ex: Saldo, Poupança, Saldo Obra', hint: 'Coluna de saldo devedor/poupança' },
    { key: 'financiamento', label: 'Financiamento', placeholder: 'Ex: Financiamento, R$ Fin.', hint: 'Coluna de financiamento' },
    { key: 'financiamento_meses', label: 'Financiamento (Nº de Meses)', placeholder: 'Ex: 120', hint: 'Quantidade total de parcelas fin.' },
] as const

export function PriceTableUploadField({ formData, setFormData, tenantId, propertyId }: PriceTableUploadFieldProps) {
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const currentUrl = formData.details?.empreendimento?.tabela_modelo_url || ''
    const currentFileName = formData.details?.empreendimento?.tabela_modelo_nome || ''
    const columnMapping = formData.details?.empreendimento?.column_mapping || {}

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

    const handleMappingChange = (key: string, value: string) => {
        setFormData({
            ...formData,
            details: {
                ...formData.details,
                empreendimento: {
                    ...formData.details.empreendimento,
                    column_mapping: {
                        ...columnMapping,
                        [key]: value
                    }
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* ── Mapeamento de Colunas ── */}
            <div className="space-y-4">
                <div>
                    <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                        Mapeamento Colunas
                    </h4>
                    <p className="text-xs text-muted-foreground leading-snug mt-1">
                        <span className="block">Informe como cada campo aparece na tabela de preços deste empreendimento.</span>
                        <span className="block">A IA usará esses nomes como referência para extrair os dados corretamente.</span>
                        <span className="block">Use <span className="font-bold text-foreground">"-"</span> quando o campo não existir na tabela.</span>
                    </p>
                </div>

                {/* ── Grid de inputs ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {COLUMN_MAPPING_FIELDS.map((field) => (
                        <div key={field.key} className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1 block">
                                {field.label}
                            </label>
                            <input
                                type="text"
                                value={columnMapping[field.key] || ''}
                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                placeholder={field.placeholder}
                                className="w-full bg-white dark:bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                            />
                            <p className="text-[9px] text-muted-foreground/70 ml-1">
                                {field.hint}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tabela Modelo (Upload) ── */}
            <div className="space-y-4 pt-6 border-t border-border/50">
                <div>
                    <div className="flex items-center justify-between">
                        <h4 className="text-base font-black text-foreground uppercase tracking-widest">
                            Tabela Modelo
                        </h4>
                    </div>

                    <p className="text-xs text-muted-foreground leading-snug mt-1">
                        <span className="block">Suba a tabela-modelo deste empreendimento.</span>
                        <span className="block">A IA usará esta referência para identificar automaticamente os campos ao processar as tabelas mensais.</span>
                    </p>
                </div>

                {currentUrl ? (
                    /* ── Tabela-modelo já enviada ── */
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-background border border-muted-foreground/30">
                        <div className="p-2.5 bg-emerald-500/10 rounded-lg shrink-0">
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
                        className="w-full flex flex-col items-center justify-center gap-3 p-8 rounded-lg bg-background border border-muted-foreground/30 hover:bg-foreground/5 transition-all cursor-pointer text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 size={28} className="animate-spin text-muted-foreground" />
                                <span className="text-sm font-medium">Enviando...</span>
                            </>
                        ) : (
                            <>
                                <div className="p-3 bg-foreground/5 rounded-lg">
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
        </div>
    )
}
