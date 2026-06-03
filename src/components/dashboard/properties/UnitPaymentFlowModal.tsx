'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/shared/Modal'
import {
    Copy, MessageCircle, Mail, CheckCircle2, Building2, Car,
    Maximize2, DollarSign, Hash, Layers, FileText, Download,
    Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import type { PropertyUnit, PriceTableInfo } from '@/app/_actions/property-units'

interface UnitPaymentFlowModalProps {
    isOpen: boolean
    onClose: () => void
    unit: PropertyUnit
    propertyTitle: string
    priceTable: PriceTableInfo | null
    tenantId: string
}

function formatBRL(value: number | null | undefined) {
    if (!value) return '—'
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatMonth(month: string) {
    if (!month) return '—'
    const [year, m] = month.split('-')
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    return `${months[parseInt(m) - 1]} / ${year}`
}

function buildTextMessage(unit: PropertyUnit, propertyTitle: string, priceTable: PriceTableInfo | null) {
    const ps = priceTable?.payment_structure || {} as any
    let msg = ''
    msg += `📋 *FLUXO DE PAGAMENTO*\n`
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`
    msg += `🏢 *${propertyTitle}*\n`
    if (unit.block_tower) msg += `Torre: ${unit.block_tower}\n`
    msg += `Apto: *${unit.unit_number}*\n\n`

    msg += `📐 *IDENTIFICAÇÃO*\n`
    if (unit.garage_type) msg += `• Garagem: ${unit.garage_type}${unit.garage_number ? ` (Nº ${unit.garage_number})` : ''}\n`
    if (unit.hobby_box) msg += `• Hobby Box: ${unit.hobby_box}${unit.hobby_box_number ? ` (Nº ${unit.hobby_box_number})` : ''}\n`
    if (unit.area_total) msg += `• Área Total: ${unit.area_total}m²\n`
    if (unit.area_privativa) msg += `• Área Privativa: ${unit.area_privativa}m²\n`
    msg += `\n`

    msg += `💰 *FLUXO DE PAGAMENTO*\n`
    if (unit.valor_ato) {
        const label = ps.ato ? `Ato (${ps.ato.pct}% - ${ps.ato.parcelas}x)` : 'Ato'
        msg += `• ${label}: *${formatBRL(unit.valor_ato)}*\n`
    }
    if (unit.valor_mensais) {
        const label = ps.mensais ? `Mensais (${ps.mensais.pct}% - ${ps.mensais.parcelas}x)` : 'Mensais'
        msg += `• ${label}: *${formatBRL(unit.valor_mensais)}*\n`
    }
    if (unit.valor_reforcos) {
        const label = ps.reforcos ? `Reforços (${ps.reforcos.pct}% - ${ps.reforcos.parcelas}x)` : 'Reforços'
        msg += `• ${label}: *${formatBRL(unit.valor_reforcos)}*\n`
    }
    if (unit.valor_chaves) {
        const label = ps.chaves ? `Chaves (${ps.chaves.pct}% - ${ps.chaves.parcelas}x)` : 'Chaves'
        msg += `• ${label}: *${formatBRL(unit.valor_chaves)}*\n`
    }
    if (unit.soma_poupanca) {
        msg += `\n📊 *Soma Poupança:* ${formatBRL(unit.soma_poupanca)}\n`
    }
    if (unit.valor_financiamento) {
        const label = ps.financiamento ? `Financiamento (${ps.financiamento.pct}% - ${ps.financiamento.parcelas}x)` : 'Financiamento'
        msg += `• ${label}: *${formatBRL(unit.valor_financiamento)}*\n`
    }
    msg += `\n`
    msg += `━━━━━━━━━━━━━━━━━━━━\n`
    msg += `💎 *VALOR TOTAL: ${formatBRL(unit.valor_total)}*\n`
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`

    if (priceTable) {
        msg += `📅 Tabela: ${formatMonth(priceTable.reference_month)}\n`
        msg += `📈 Índice: ${priceTable.index_type}${priceTable.index_value ? ` (${formatBRL(priceTable.index_value)})` : ''}\n`
    }

    return msg
}

export function UnitPaymentFlowModal({
    isOpen,
    onClose,
    unit,
    propertyTitle,
    priceTable,
    tenantId
}: UnitPaymentFlowModalProps) {
    const [copied, setCopied] = useState(false)
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const flowRef = useRef<HTMLDivElement>(null)

    const ps = priceTable?.payment_structure || {} as any

    async function handleCopy() {
        const text = buildTextMessage(unit, propertyTitle, priceTable)
        await navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success('Fluxo copiado para a área de transferência!')
        setTimeout(() => setCopied(false), 2000)
    }

    function handleWhatsApp() {
        const text = buildTextMessage(unit, propertyTitle, priceTable)
        const encoded = encodeURIComponent(text)
        window.open(`https://wa.me/?text=${encoded}`, '_blank')
        toast.success('WhatsApp aberto!')
    }

    function handleEmail() {
        const text = buildTextMessage(unit, propertyTitle, priceTable)
            .replace(/\*/g, '') // Remove markdown do WhatsApp
            .replace(/━/g, '—')
        const subject = encodeURIComponent(`Fluxo de Pagamento - ${propertyTitle} - Apto ${unit.unit_number}`)
        const body = encodeURIComponent(text)
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
        toast.success('E-mail aberto!')
    }

    async function handleDownloadPDF() {
        setIsGeneratingPDF(true)
        try {
            // Usar html2canvas + jsPDF para gerar PDF bonito
            const html2canvas = (await import('html2canvas')).default
            const { jsPDF } = await import('jspdf')

            if (!flowRef.current) throw new Error('Referência não encontrada')

            const canvas = await html2canvas(flowRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            })

            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(`fluxo-${propertyTitle.toLowerCase().replace(/\s+/g, '-')}-apto-${unit.unit_number}.pdf`)

            toast.success('PDF gerado com sucesso!')
        } catch (error) {
            console.error('Erro ao gerar PDF:', error)
            toast.error('Erro ao gerar PDF. Tente copiar o texto.')
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                    Fluxo de Pagamento
                </h3>
            }
            size="md"
        >
            <div className="flex flex-col max-h-[calc(90vh-120px)]">
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-5 min-h-0">
                    {/* ── Preview do Fluxo (para PDF e visual) ── */}
                    <div ref={flowRef} className="bg-white rounded-lg border border-border/30 overflow-hidden">
                        {/* Header */}
                        <div className="bg-[#404F4F] text-white p-5 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Fluxo de Pagamento</p>
                            <h2 className="text-lg font-black">{propertyTitle}</h2>
                            <div className="flex items-center gap-3 text-sm">
                                {unit.block_tower && (
                                    <span className="flex items-center gap-1">
                                        <Building2 size={12} />
                                        {unit.block_tower}
                                    </span>
                                )}
                                <span className="flex items-center gap-1 font-black">
                                    <Hash size={12} />
                                    Apto {unit.unit_number}
                                </span>
                            </div>
                        </div>

                        {/* Identificação */}
                        <div className="p-5 border-b border-gray-100 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">Identificação</p>
                            <div className="grid grid-cols-2 gap-3">
                                {unit.garage_type && (
                                    <div className="flex items-start gap-2">
                                        <Car size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Garagem</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {unit.garage_type}{unit.garage_number ? ` • Nº ${unit.garage_number}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {unit.hobby_box && (
                                    <div className="flex items-start gap-2">
                                        <Layers size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Hobby Box</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {unit.hobby_box}{unit.hobby_box_number ? ` • Nº ${unit.hobby_box_number}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {unit.area_total && (
                                    <div className="flex items-start gap-2">
                                        <Maximize2 size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Área Total</p>
                                            <p className="text-sm font-bold text-gray-900">{unit.area_total}m²</p>
                                        </div>
                                    </div>
                                )}
                                {unit.area_privativa && (
                                    <div className="flex items-start gap-2">
                                        <Maximize2 size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Área Privativa</p>
                                            <p className="text-sm font-bold text-gray-900">{unit.area_privativa}m²</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fluxo de Pagamento */}
                        <div className="p-5 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">Condições de Pagamento</p>
                            <div className="space-y-2">
                                {unit.valor_ato != null && unit.valor_ato > 0 && (
                                    <FlowRow
                                        label={ps.ato ? `Ato (${ps.ato.pct}%)` : 'Ato'}
                                        parcelas={ps.ato?.parcelas}
                                        valor={unit.valor_ato}
                                    />
                                )}
                                {unit.valor_mensais != null && unit.valor_mensais > 0 && (
                                    <FlowRow
                                        label={ps.mensais ? `Mensais (${ps.mensais.pct}%)` : 'Mensais'}
                                        parcelas={ps.mensais?.parcelas}
                                        valor={unit.valor_mensais}
                                    />
                                )}
                                {unit.valor_reforcos != null && unit.valor_reforcos > 0 && (
                                    <FlowRow
                                        label={ps.reforcos ? `Reforços (${ps.reforcos.pct}%)` : 'Reforços'}
                                        parcelas={ps.reforcos?.parcelas}
                                        valor={unit.valor_reforcos}
                                    />
                                )}
                                {unit.valor_chaves != null && unit.valor_chaves > 0 && (
                                    <FlowRow
                                        label={ps.chaves ? `Chaves (${ps.chaves.pct}%)` : 'Chaves'}
                                        parcelas={ps.chaves?.parcelas}
                                        valor={unit.valor_chaves}
                                    />
                                )}

                                {unit.soma_poupanca != null && unit.soma_poupanca > 0 && (
                                    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <span className="text-xs font-bold text-gray-600">Soma Poupança</span>
                                        <span className="text-sm font-black text-gray-900">{formatBRL(unit.soma_poupanca)}</span>
                                    </div>
                                )}

                                {unit.valor_financiamento != null && unit.valor_financiamento > 0 && (
                                    <FlowRow
                                        label={ps.financiamento ? `Financiamento (${ps.financiamento.pct}%)` : 'Financiamento'}
                                        parcelas={ps.financiamento?.parcelas}
                                        valor={unit.valor_financiamento}
                                    />
                                )}
                            </div>

                            {/* Total */}
                            <div className="flex justify-between items-center py-3 px-4 bg-[#404F4F] rounded-lg mt-3">
                                <span className="text-xs font-black text-white/70 uppercase tracking-wider">Valor Total</span>
                                <span className="text-lg font-black text-[#FFE600]">{formatBRL(unit.valor_total)}</span>
                            </div>
                        </div>

                        {/* Rodapé */}
                        {priceTable && (
                            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between text-[10px] text-gray-500">
                                <span>Tabela: {formatMonth(priceTable.reference_month)}</span>
                                <span>{priceTable.index_type}{priceTable.index_value ? ` • ${formatBRL(priceTable.index_value)}` : ''}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Ações de Envio ── */}
                <div className="pt-4 border-t border-border/50 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleCopy}
                            className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted/30 transition-all group"
                        >
                            {copied ? (
                                <><CheckCircle2 size={16} className="text-emerald-500" /> Copiado!</>
                            ) : (
                                <><Copy size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" /> Copiar Texto</>
                            )}
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPDF}
                            className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted/30 transition-all disabled:opacity-50"
                        >
                            {isGeneratingPDF ? (
                                <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                            ) : (
                                <><Download size={16} className="text-red-500" /> Baixar PDF</>
                            )}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleWhatsApp}
                            className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-lg bg-[#25D366] text-white text-sm font-bold hover:bg-[#22c55e] transition-all active:scale-[0.98] shadow-sm"
                        >
                            <MessageCircle size={16} />
                            WhatsApp
                        </button>
                        <button
                            onClick={handleEmail}
                            className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all active:scale-[0.98] shadow-sm"
                        >
                            <Mail size={16} />
                            E-mail
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

// ── Componente auxiliar para linha do fluxo ──
function FlowRow({ label, parcelas, valor }: { label: string; parcelas?: number; valor: number }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
            <div>
                <span className="text-xs font-bold text-gray-700">{label}</span>
                {parcelas && (
                    <span className="text-[10px] text-gray-400 ml-1.5">{parcelas}x</span>
                )}
            </div>
            <span className="text-sm font-black text-gray-900">{formatBRL(valor)}</span>
        </div>
    )
}
