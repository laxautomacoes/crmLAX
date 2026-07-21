'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/shared/Modal'
import { ChevronDown } from 'lucide-react'
import type { MarketingCampaign, CreateCampaignData } from '@/app/_actions/marketing-ads'

interface CampaignModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: CreateCampaignData) => Promise<boolean>
    campaignToEdit?: MarketingCampaign | null
}

const PLATFORM_OPTIONS = [
    'Meta Ads (Facebook/Instagram)',
    'Google Ads',
    'Zap Imóveis',
    'Viva Real',
    'OLX',
    'Chaves na Mão',
    'Imovelweb',
    'TikTok Ads',
    'Portal Próprio',
    'Panfletos / Físico',
    'Outros'
]

export function CampaignModal({ isOpen, onClose, onSubmit, campaignToEdit }: CampaignModalProps) {
    const [plataforma, setPlataforma] = useState('Meta Ads (Facebook/Instagram)')
    const [customPlataforma, setCustomPlataforma] = useState('')
    const [campanhaNome, setCampanhaNome] = useState('')
    const [custo, setCusto] = useState('')
    const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0])
    const [dataFim, setDataFim] = useState('')
    const [status, setStatus] = useState<'Ativa' | 'Pausada' | 'Concluída'>('Ativa')
    const [tipoCanal, setTipoCanal] = useState('Portal Imobiliário')
    const [observacoes, setObservacoes] = useState('')
    const [generateExpense, setGenerateExpense] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (campaignToEdit) {
            if (PLATFORM_OPTIONS.includes(campaignToEdit.plataforma)) {
                setPlataforma(campaignToEdit.plataforma)
                setCustomPlataforma('')
            } else {
                setPlataforma('Outros')
                setCustomPlataforma(campaignToEdit.plataforma)
            }
            setCampanhaNome(campaignToEdit.campanha_nome || '')
            setCusto(campaignToEdit.custo ? String(campaignToEdit.custo) : '')
            setDataInicio(campaignToEdit.data_inicio || new Date().toISOString().split('T')[0])
            setDataFim(campaignToEdit.data_fim || '')
            setStatus((campaignToEdit.metadata?.status as any) || 'Ativa')
            setTipoCanal(campaignToEdit.metadata?.tipo_canal || 'Portal Imobiliário')
            setObservacoes(campaignToEdit.metadata?.observacoes || '')
            setGenerateExpense(false)
        } else {
            setPlataforma('Meta Ads (Facebook/Instagram)')
            setCustomPlataforma('')
            setCampanhaNome('')
            setCusto('')
            setDataInicio(new Date().toISOString().split('T')[0])
            setDataFim('')
            setStatus('Ativa')
            setTipoCanal('Portal Imobiliário')
            setObservacoes('')
            setGenerateExpense(true)
        }
    }, [campaignToEdit, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!campanhaNome.trim()) return

        const finalPlataforma = plataforma === 'Outros' ? customPlataforma.trim() || 'Outros' : plataforma
        const numCusto = parseFloat(custo.replace(',', '.')) || 0

        setIsSubmitting(true)
        const success = await onSubmit({
            plataforma: finalPlataforma,
            campanha_nome: campanhaNome.trim(),
            custo: numCusto,
            data_inicio: dataInicio,
            data_fim: dataFim || null,
            status,
            tipo_canal: tipoCanal,
            observacoes: observacoes.trim(),
            generate_financial_expense: generateExpense
        })

        setIsSubmitting(false)
        if (success) {
            onClose()
        }
    }

    const modalTitle = campaignToEdit ? 'EDITAR ANÚNCIO / PORTAL' : 'NOVO ANÚNCIO / PORTAL'

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <p className="text-xs text-muted-foreground leading-snug mt-1">
                        <span className="block">Cadastre campanhas de tráfego pago ou assinaturas de portais imobiliários.</span>
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Plataforma */}
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-foreground ml-1 mb-2">
                            PLATAFORMA / CANAL
                        </label>
                        <div className="relative">
                            <select
                                value={plataforma}
                                onChange={(e) => setPlataforma(e.target.value)}
                                className="w-full appearance-none bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none transition-all pr-10"
                            >
                                {PLATFORM_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

                    {plataforma === 'Outros' && (
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-foreground ml-1 mb-2">
                                NOME DA PLATAFORMA PERSONALIZADA
                            </label>
                            <input
                                type="text"
                                value={customPlataforma}
                                onChange={(e) => setCustomPlataforma(e.target.value)}
                                placeholder="Ex: Radio Local, Outdoor"
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none transition-all"
                            />
                        </div>
                    )}

                    {/* Nome da Campanha */}
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-foreground ml-1 mb-2">
                            NOME DA CAMPANHA / CONTRATO *
                        </label>
                        <input
                            type="text"
                            required
                            value={campanhaNome}
                            onChange={(e) => setCampanhaNome(e.target.value)}
                            placeholder="Ex: Assinatura Zap 100 Anúncios / Campanha Boiteux 155"
                            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none transition-all"
                        />
                    </div>

                    {/* Grid Valor e Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-foreground ml-1 mb-2">
                                INVESTIMENTO (R$)
                            </label>
                            <input
                                type="text"
                                value={custo}
                                onChange={(e) => setCusto(e.target.value)}
                                placeholder="0,00"
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none transition-all"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-foreground ml-1 mb-2">
                                STATUS DA CAMPANHA
                            </label>
                            <div className="relative">
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full appearance-none bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none transition-all pr-10"
                                >
                                    <option value="Ativa">Ativa</option>
                                    <option value="Pausada">Pausada</option>
                                    <option value="Concluída">Concluída</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Datas Início e Fim */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-foreground ml-1 mb-2">
                                DATA DE INÍCIO *
                            </label>
                            <input
                                type="date"
                                required
                                value={dataInicio}
                                onChange={(e) => setDataInicio(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none transition-all"
                            />
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-foreground ml-1 mb-2">
                                DATA DE TÉRMINO (OPCIONAL)
                            </label>
                            <input
                                type="date"
                                value={dataFim}
                                onChange={(e) => setDataFim(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Observações */}
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-foreground ml-1 mb-2">
                            OBSERVAÇÕES / ANOTAÇÕES
                        </label>
                        <textarea
                            rows={2}
                            value={observacoes}
                            onChange={(e) => setObservacoes(e.target.value)}
                            placeholder="Anotações adicionais sobre o contrato ou campanha..."
                            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring/50 focus:border-ring outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Integração Financeira Checkbox */}
                    {!campaignToEdit && (
                        <div className="pt-2 border-t border-border/50">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                                <input
                                    type="checkbox"
                                    checked={generateExpense}
                                    onChange={(e) => setGenerateExpense(e.target.checked)}
                                    className="rounded border-input text-secondary focus:ring-secondary h-4 w-4"
                                />
                                <span>Lançar despesa automaticamente no Módulo Financeiro</span>
                            </label>
                            <p className="text-[10px] text-muted-foreground ml-6 mt-0.5">
                                Gera um lançamento pago na categoria &quot;Marketing / Ads&quot; para compor o fluxo financeiro.
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 border border-border text-foreground hover:bg-muted font-bold text-xs uppercase tracking-widest rounded-lg transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2.5 bg-secondary text-secondary-foreground hover:bg-[#F2DB00] active:scale-[0.99] font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-sm"
                    >
                        {isSubmitting ? 'Salvar...' : (campaignToEdit ? 'Salvar Alterações' : 'Cadastrar Campanha')}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
