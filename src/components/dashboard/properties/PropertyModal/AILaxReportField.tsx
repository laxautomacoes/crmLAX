'use client'

import { useState } from 'react'
import { FormTextarea } from '@/components/shared/forms/FormTextarea'
import { Brain, Loader2 } from 'lucide-react'
import { trainAILaxWithProperty } from '@/app/_actions/ai-lax'
import { toast } from 'sonner'

interface AILaxReportFieldProps {
    formData: any
    setFormData: (data: any) => void
    propertyId?: string
    tenantId: string
    profileId?: string
}

export function AILaxReportField({ formData, setFormData, propertyId, tenantId, profileId }: AILaxReportFieldProps) {
    const [isTraining, setIsTraining] = useState(false)

    const handleTrain = async () => {
        if (!propertyId) {
            toast.error('Você precisa salvar o imóvel primeiro antes de treinar a IA LAX.')
            return
        }

        if (!profileId) {
            toast.error('Perfil de usuário não identificado.')
            return
        }

        setIsTraining(true)
        try {
            const result = await trainAILaxWithProperty(propertyId, tenantId, profileId)
            
            if (result.success && result.data) {
                setFormData({
                    ...formData,
                    details: {
                        ...formData.details,
                        ai_master_report: result.data
                    }
                })
                toast.success('Treinamento Concluído! A IA LAX leu todos os dados e gerou o relatório mestre com sucesso.')
            } else {
                toast.error(result.error || 'Ocorreu um erro ao treinar a IA.')
            }
        } catch (error: any) {
            toast.error(error.message || 'Falha ao treinar IA LAX.')
        } finally {
            setIsTraining(false)
        }
    }

    return (
        <div className="space-y-4 border-t border-border/60 pt-6 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h4 className="flex items-center gap-2 text-base font-black text-foreground uppercase tracking-widest">
                        <Brain className="text-accent-icon" size={18} />
                        Cérebro IA LAX
                    </h4>
                    <p className="text-xs text-muted-foreground leading-snug mt-1">
                        <span className="block">Treine a Inteligência Artificial com todos os PDFs, tabelas de preço e imagens deste imóvel.</span>
                        <span className="block">Ela criará um relatório mestre usado para gerar respostas aos clientes e copys de anúncios.</span>
                    </p>
                </div>
                
                <button
                    type="button"
                    onClick={handleTrain}
                    disabled={isTraining}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-widest rounded-lg shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shrink-0"
                >
                    {isTraining ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Lendo arquivos...</span>
                        </>
                    ) : (
                        <>
                            <Brain size={14} />
                            <span>Treinar IA LAX</span>
                        </>
                    )}
                </button>
            </div>

            <div className="mt-4">
                <FormTextarea
                    label="Relatório Mestre (Gerado pela IA)"
                    value={formData.details?.ai_master_report || ''}
                    onChange={(e) => setFormData({
                        ...formData,
                        details: {
                            ...formData.details,
                            ai_master_report: e.target.value
                        }
                    })}
                    placeholder="Clique em 'Treinar IA LAX' para gerar o relatório ou digite manualmente o contexto que a IA deve saber sobre o imóvel..."
                    className="min-h-[300px] font-mono text-xs"
                />
            </div>
        </div>
    )
}
