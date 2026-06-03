'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/shared/Modal'
import {
    Copy, MessageCircle, Mail, CheckCircle2, Download,
    Loader2, Image as ImageIcon, Video, FileText, ChevronDown, ChevronUp, Check
} from 'lucide-react'
import { toast } from 'sonner'
import type { PropertyUnit, PriceTableInfo } from '@/app/_actions/property-units'

interface PropertyDocument {
    url: string
    name?: string
}

interface UnitPaymentFlowModalProps {
    isOpen: boolean
    onClose: () => void
    unit: PropertyUnit
    propertyTitle: string
    priceTable: PriceTableInfo | null
    tenantId: string
    propertyImages?: string[]
    propertyVideos?: string[]
    propertyDocuments?: PropertyDocument[]
}

interface FieldSelection {
    apto: boolean
    torre: boolean
    vaga: boolean
    hobby_box: boolean
    area_privativa: boolean
    area_total: boolean
    ato: boolean
    mensais: boolean
    reforcos: boolean
    chaves: boolean
    poupanca: boolean
    financiamento: boolean
    valor_total: boolean
    tabela_vigente: boolean
    reajuste_construcao: boolean
    reajuste_financiamento: boolean
}

const DEFAULT_SELECTION: FieldSelection = {
    apto: true,
    torre: true,
    vaga: true,
    hobby_box: true,
    area_privativa: true,
    area_total: true,
    ato: true,
    mensais: true,
    reforcos: true,
    chaves: true,
    poupanca: true,
    financiamento: true,
    valor_total: true,
    tabela_vigente: true,
    reajuste_construcao: true,
    reajuste_financiamento: true,
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

function formatValue(value: number | null | undefined) {
    if (!value) return '—'
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildTextMessage(
    unit: PropertyUnit,
    propertyTitle: string,
    priceTable: PriceTableInfo | null,
    fields: FieldSelection
) {
    const ps = priceTable?.payment_structure || {} as any
    let msg = ''

    // Header
    msg += `*IMÓVEL SUGERIDO*\n`
    msg += `━━━━━━━━━━━━━━━━━━━━\n`
    msg += `*${propertyTitle}*\n`
    msg += `\n`

    // Identificação
    if (fields.torre && unit.block_tower) msg += `• Torre: *${unit.block_tower}*\n`
    if (fields.apto) msg += `• Apto: *${unit.unit_number}*\n`
    if (fields.vaga && (unit.garage_type || unit.garage_number)) {
        msg += `• Vaga: ${unit.garage_number || unit.garage_type || ''}\n`
    }
    if (fields.hobby_box && unit.hobby_box) {
        msg += `• HB: ${unit.hobby_box_number || unit.hobby_box}\n`
    }
    if (fields.area_privativa && unit.area_privativa) msg += `• Área Privativa: ${unit.area_privativa}m²\n`
    if (fields.area_total && unit.area_total) msg += `• Área Total: ${unit.area_total}m²\n`
    msg += `\n`

    // Fluxo de Pagamento
    msg += `*FLUXO DE PAGAMENTO*\n`
    msg += `\n`

    if (fields.ato && unit.valor_ato) {
        const pct = ps.ato?.pct ? `${ps.ato.pct}%` : ''
        const parcelas = ps.ato?.parcelas || 1
        msg += `• Ato (${pct}): ${parcelas}x *${formatValue(unit.valor_ato)}*\n`
    }
    if (fields.mensais && unit.valor_mensais) {
        const pct = ps.mensais?.pct ? `${ps.mensais.pct}%` : ''
        const parcelas = ps.mensais?.parcelas || 1
        msg += `• Mensais (${pct}): ${parcelas}x *${formatValue(unit.valor_mensais)}*\n`
    }
    if (fields.reforcos && unit.valor_reforcos) {
        const pct = ps.reforcos?.pct ? `${ps.reforcos.pct}%` : ''
        const parcelas = ps.reforcos?.parcelas || 1
        const label = ps.reforcos?.label || 'Reforços'
        msg += `• ${label} (${pct}): ${parcelas}x *${formatValue(unit.valor_reforcos)}*\n`
    }
    if (fields.chaves && unit.valor_chaves) {
        const pct = ps.chaves?.pct ? `${ps.chaves.pct}%` : 'na entrega'
        const parcelas = ps.chaves?.parcelas || 1
        msg += `• Chaves (${pct}): ${parcelas}x *${formatValue(unit.valor_chaves)}*\n`
    }
    msg += `\n`

    // Calcular valores
    const atoTotal = (fields.ato && unit.valor_ato ? unit.valor_ato : 0) * (ps.ato?.parcelas || 1)
    const mensaisTotal = (fields.mensais && unit.valor_mensais ? unit.valor_mensais : 0) * (ps.mensais?.parcelas || 1)
    const reforcosTotal = (fields.reforcos && unit.valor_reforcos ? unit.valor_reforcos : 0) * (ps.reforcos?.parcelas || 1)
    const chavesTotal = (fields.chaves && unit.valor_chaves ? unit.valor_chaves : 0) * (ps.chaves?.parcelas || 1)
    const somaPoupancaCalc = (unit.valor_ato || 0) * (ps.ato?.parcelas || 1)
        + (unit.valor_mensais || 0) * (ps.mensais?.parcelas || 1)
        + (unit.valor_reforcos || 0) * (ps.reforcos?.parcelas || 1)
        + (unit.valor_chaves || 0) * (ps.chaves?.parcelas || 1)
    const totalFinanciamento = (unit.valor_total || 0) - somaPoupancaCalc
    const finParcelas = ps.financiamento?.parcelas || 1
    const finParcela = finParcelas > 1 ? totalFinanciamento / finParcelas : totalFinanciamento
    const pctTotal = (ps.ato?.pct || 0) + (ps.mensais?.pct || 0) + (ps.reforcos?.pct || 0) + (ps.chaves?.pct || 0)

    // Poupança
    if (fields.poupanca && somaPoupancaCalc > 0) {
        msg += `*POUPANÇA${pctTotal > 0 ? ` (${pctTotal}%)` : ''}* (durante a obra): *${formatValue(somaPoupancaCalc)}*\n`
        msg += `\n`
    }

    // Financiamento
    if (fields.financiamento) {
        if (totalFinanciamento > 0) {
            const pct = ps.financiamento?.pct ? `${ps.financiamento.pct}%` : ''
            msg += `*FINANCIAMENTO* (${pct} pós entrega): *${formatValue(totalFinanciamento)}*\n`
            if (finParcelas > 1) {
                msg += `• em até ${finParcelas}x ${formatValue(finParcela)} (direto construtora)\n`
            }
            msg += `• ou financiamento bancário\n`
        } else {
            msg += `*FINANCIAMENTO* (pós entrega)\n`
            msg += `• financiamento bancário\n`
        }
    }
    msg += `\n`
    msg += `\n`

    // Total
    if (fields.valor_total) {
        msg += `*VALOR TOTAL: ${formatValue(unit.valor_total)}*\n`
        msg += `\n`
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`
    msg += `\n`

    // Rodapé
    if (priceTable) {
        if (fields.tabela_vigente) msg += `_valores válidos para ${formatMonth(priceTable.reference_month)}_\n`
        if (fields.reajuste_construcao) msg += `_Reajuste mensal durante construção: ${priceTable.index_type}/SC_\n`
        if (fields.reajuste_financiamento) msg += `_Reajuste financiamento construtora: IGPM + 1% a.m._\n`
    }

    return msg
}

export function UnitPaymentFlowModal({
    isOpen,
    onClose,
    unit,
    propertyTitle,
    priceTable,
    tenantId,
    propertyImages = [],
    propertyVideos = [],
    propertyDocuments = []
}: UnitPaymentFlowModalProps) {
    const [copied, setCopied] = useState(false)
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const [fields, setFields] = useState<FieldSelection>({ ...DEFAULT_SELECTION })
    const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set())
    const [mediaExpanded, setMediaExpanded] = useState(false)
    const flowRef = useRef<HTMLDivElement>(null)

    const ps = priceTable?.payment_structure || {} as any
    const hasMedia = propertyImages.length > 0 || propertyVideos.length > 0 || propertyDocuments.length > 0

    function toggleMedia(url: string) {
        setSelectedMedia(prev => {
            const next = new Set(prev)
            if (next.has(url)) next.delete(url)
            else next.add(url)
            return next
        })
    }

    function selectAllMedia() {
        const all = new Set<string>()
        propertyVideos.forEach(u => all.add(u))
        propertyDocuments.forEach(d => all.add(d.url))
        setSelectedMedia(all)
    }

    function deselectAllMedia() {
        setSelectedMedia(new Set())
    }

    function toggleField(key: keyof FieldSelection) {
        setFields(prev => ({ ...prev, [key]: !prev[key] }))
    }

    function buildMediaLinks() {
        if (selectedMedia.size === 0) return ''
        let links = '\n📎 *MATERIAIS*\n'
        const selVideos = propertyVideos.filter(u => selectedMedia.has(u))
        const selDocs = propertyDocuments.filter(d => selectedMedia.has(d.url))
        if (selVideos.length > 0) {
            links += `\n🎬 Vídeos (${selVideos.length}):\n`
            selVideos.forEach((u, i) => { links += `${u}\n` })
        }
        if (selDocs.length > 0) {
            links += `\n📄 Documentos (${selDocs.length}):\n`
            selDocs.forEach(d => { links += `• ${d.name || 'Documento'}: ${d.url}\n` })
        }
        return links
    }

    const [copyingImage, setCopyingImage] = useState<string | null>(null)

    async function copyImageToClipboard(url: string) {
        setCopyingImage(url)
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            
            let clipboardBlob = blob
            if (!blob.type.startsWith('image/png')) {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                await new Promise((resolve, reject) => {
                    img.onload = resolve
                    img.onerror = reject
                    img.src = url
                })
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx?.drawImage(img, 0, 0)
                clipboardBlob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'))
            }

            await navigator.clipboard.write([
                new ClipboardItem({
                    [clipboardBlob.type]: clipboardBlob
                })
            ])
            toast.success('Imagem copiada! Cole no WhatsApp.')
        } catch (error) {
            console.error('Erro ao copiar imagem:', error)
            toast.error('Não foi possível copiar a imagem.')
        } finally {
            setCopyingImage(null)
        }
    }

    async function handleCopy() {
        const text = buildTextMessage(unit, propertyTitle, priceTable, fields) + buildMediaLinks()
        await navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success('Fluxo copiado para a área de transferência!')
        setTimeout(() => setCopied(false), 2000)
    }

    function handleWhatsApp() {
        const text = buildTextMessage(unit, propertyTitle, priceTable, fields) + buildMediaLinks()
        const encoded = encodeURIComponent(text)
        window.open(`https://wa.me/?text=${encoded}`, '_blank')
        toast.success('WhatsApp aberto!')
    }

    function handleEmail() {
        const text = (buildTextMessage(unit, propertyTitle, priceTable, fields) + buildMediaLinks())
            .replace(/\*/g, '')
            .replace(/━/g, '—')
        const subject = encodeURIComponent(`Imóvel Sugerido - ${propertyTitle} - Apto ${unit.unit_number}`)
        const body = encodeURIComponent(text)
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
        toast.success('E-mail aberto!')
    }

    async function handleDownloadImage() {
        setIsGeneratingPDF(true)
        try {
            if (!flowRef.current) throw new Error('Referência não encontrada')
            const el = flowRef.current
            const rect = el.getBoundingClientRect()
            const scale = 2
            const canvas = document.createElement('canvas')
            canvas.width = rect.width * scale
            canvas.height = rect.height * scale
            const ctx = canvas.getContext('2d')
            if (!ctx) throw new Error('Canvas não suportado')

            const data = new XMLSerializer().serializeToString(el)
            const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                .map(s => s.outerHTML).join('')

            const svgString = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width * scale}" height="${rect.height * scale}">
                    <foreignObject width="100%" height="100%" style="transform: scale(${scale}); transform-origin: top left;">
                        <div xmlns="http://www.w3.org/1999/xhtml">
                            ${styles}
                            ${data}
                        </div>
                    </foreignObject>
                </svg>
            `

            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
            const url = URL.createObjectURL(svgBlob)
            const img = new Image()

            await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                    ctx.fillStyle = '#ffffff'
                    ctx.fillRect(0, 0, canvas.width, canvas.height)
                    ctx.drawImage(img, 0, 0)
                    URL.revokeObjectURL(url)
                    resolve()
                }
                img.onerror = () => {
                    URL.revokeObjectURL(url)
                    reject(new Error('Falha ao renderizar imagem'))
                }
                img.src = url
            })

            canvas.toBlob((blob) => {
                if (!blob) return
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = `imovel-${propertyTitle.toLowerCase().replace(/\s+/g, '-')}-apto-${unit.unit_number}.jpg`
                link.click()
                URL.revokeObjectURL(link.href)
            }, 'image/jpeg', 0.95)

            toast.success('Imagem gerada com sucesso!')
        } catch (error) {
            console.error('Erro ao gerar imagem:', error)
            const text = buildTextMessage(unit, propertyTitle, priceTable, fields)
            const blob = new Blob([text], { type: 'text/plain' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(blob)
            link.download = `imovel-${propertyTitle.toLowerCase().replace(/\s+/g, '-')}-apto-${unit.unit_number}.txt`
            link.click()
            URL.revokeObjectURL(link.href)
            toast.info('Imagem não disponível. Texto baixado como alternativa.')
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    // Cálculos
    const atoTotal = (unit.valor_ato || 0) * (ps.ato?.parcelas || 1)
    const mensaisTotal = (unit.valor_mensais || 0) * (ps.mensais?.parcelas || 1)
    const reforcosTotal = (unit.valor_reforcos || 0) * (ps.reforcos?.parcelas || 1)
    const chavesTotal = (unit.valor_chaves || 0) * (ps.chaves?.parcelas || 1)
    const somaPoupancaCalc = atoTotal + mensaisTotal + reforcosTotal + chavesTotal
    const totalFinanciamento = (unit.valor_total || 0) - somaPoupancaCalc
    const finParcelas = ps.financiamento?.parcelas || 1
    const finParcela = finParcelas > 1 ? totalFinanciamento / finParcelas : totalFinanciamento
    const pctTotal = (ps.ato?.pct || 0) + (ps.mensais?.pct || 0) + (ps.reforcos?.pct || 0) + (ps.chaves?.pct || 0)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <h3 className="text-base font-black text-foreground uppercase tracking-widest truncate">
                    Imóvel Sugerido
                </h3>
            }
            size="lg"
        >
            <div className="flex flex-col max-h-[calc(90vh-120px)]">
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-5 min-h-0">
                    {/* ── Preview do Fluxo ── */}
                    <div ref={flowRef} className="bg-white rounded-lg border border-border/30 overflow-hidden">
                        {/* Header */}
                        <div className="bg-[#404F4F] text-white p-5 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Imóvel Sugerido</p>
                            <h2 className="text-lg font-black">{propertyTitle}</h2>
                            <div className="space-y-1">
                                {/* Apto */}
                                <CheckRow
                                    checked={fields.apto}
                                    onChange={() => toggleField('apto')}
                                    dark
                                >
                                    <span className="font-black text-sm">
                                        {unit.block_tower && fields.torre ? `${unit.block_tower} • ` : ''}Apto {unit.unit_number}
                                    </span>
                                </CheckRow>

                                {/* Vaga */}
                                {(unit.garage_type || unit.garage_number) && (
                                    <CheckRow checked={fields.vaga} onChange={() => toggleField('vaga')} dark sub>
                                        <span>Vaga: {unit.garage_number || unit.garage_type || ''}</span>
                                    </CheckRow>
                                )}

                                {/* HB */}
                                {unit.hobby_box && (
                                    <CheckRow checked={fields.hobby_box} onChange={() => toggleField('hobby_box')} dark sub>
                                        <span>HB: {unit.hobby_box_number || unit.hobby_box}</span>
                                    </CheckRow>
                                )}

                                {/* Área Privativa */}
                                {unit.area_privativa && (
                                    <CheckRow checked={fields.area_privativa} onChange={() => toggleField('area_privativa')} dark sub>
                                        <span>Área Privativa: {unit.area_privativa}m²</span>
                                    </CheckRow>
                                )}

                                {/* Área Total */}
                                {unit.area_total && (
                                    <CheckRow checked={fields.area_total} onChange={() => toggleField('area_total')} dark sub>
                                        <span>Área Total: {unit.area_total}m²</span>
                                    </CheckRow>
                                )}
                            </div>
                        </div>

                        {/* Fluxo de Pagamento */}
                        <div className="p-5 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">Fluxo de Pagamento</p>
                            <div className="space-y-1">
                                {/* Ato */}
                                {unit.valor_ato != null && unit.valor_ato > 0 && (
                                    <CheckRow checked={fields.ato} onChange={() => toggleField('ato')}>
                                        <FlowContent
                                            label={ps.ato ? `Ato (${ps.ato.pct}%)` : 'Ato'}
                                            parcelas={ps.ato?.parcelas}
                                            valor={unit.valor_ato}
                                        />
                                    </CheckRow>
                                )}

                                {/* Mensais */}
                                {unit.valor_mensais != null && unit.valor_mensais > 0 && (
                                    <CheckRow checked={fields.mensais} onChange={() => toggleField('mensais')}>
                                        <FlowContent
                                            label={ps.mensais ? `Mensais (${ps.mensais.pct}%)` : 'Mensais'}
                                            parcelas={ps.mensais?.parcelas}
                                            valor={unit.valor_mensais}
                                        />
                                    </CheckRow>
                                )}

                                {/* Reforços */}
                                {unit.valor_reforcos != null && unit.valor_reforcos > 0 && (
                                    <CheckRow checked={fields.reforcos} onChange={() => toggleField('reforcos')}>
                                        <FlowContent
                                            label={ps.reforcos ? `Reforços (${ps.reforcos.pct}%)` : 'Reforços'}
                                            parcelas={ps.reforcos?.parcelas}
                                            valor={unit.valor_reforcos}
                                        />
                                    </CheckRow>
                                )}

                                {/* Chaves */}
                                {unit.valor_chaves != null && unit.valor_chaves > 0 && (
                                    <CheckRow checked={fields.chaves} onChange={() => toggleField('chaves')}>
                                        <FlowContent
                                            label={ps.chaves ? `Chaves (${ps.chaves.pct}%)` : 'Chaves'}
                                            parcelas={ps.chaves?.parcelas}
                                            valor={unit.valor_chaves}
                                        />
                                    </CheckRow>
                                )}

                                {/* Poupança */}
                                {somaPoupancaCalc > 0 && (
                                    <CheckRow checked={fields.poupanca} onChange={() => toggleField('poupanca')}>
                                        <div className="flex justify-between items-center flex-1">
                                            <div>
                                                <span className="text-xs font-bold text-gray-700">Poupança{pctTotal > 0 ? ` (${pctTotal}%)` : ''}</span>
                                                <span className="text-[10px] text-gray-400 ml-1.5">durante a obra</span>
                                            </div>
                                            <span className="text-sm font-black text-gray-900">{formatBRL(somaPoupancaCalc)}</span>
                                        </div>
                                    </CheckRow>
                                )}

                                {/* Financiamento */}
                                <CheckRow checked={fields.financiamento} onChange={() => toggleField('financiamento')}>
                                    {totalFinanciamento > 0 ? (
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-700">
                                                        {ps.financiamento ? `Financiamento (${ps.financiamento.pct}%)` : 'Financiamento'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 ml-1.5">pós entrega</span>
                                                </div>
                                                <span className="text-sm font-black text-gray-900">{formatBRL(totalFinanciamento)}</span>
                                            </div>
                                            {finParcelas > 1 && (
                                                <p className="text-[10px] text-gray-400 mt-0.5 text-right">
                                                    {finParcelas}x de {formatBRL(finParcela)}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-gray-400 mt-0.5 text-right">
                                                ou financiamento bancário
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="text-xs font-bold text-gray-700">Financiamento bancário</span>
                                                    <span className="text-[10px] text-gray-400 ml-1.5">pós entrega</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CheckRow>
                            </div>

                            {/* Total */}
                            <CheckRow checked={fields.valor_total} onChange={() => toggleField('valor_total')}>
                                <div className="flex justify-between items-center py-2 px-4 bg-[#404F4F] rounded-lg flex-1">
                                    <span className="text-xs font-black text-white/70 uppercase tracking-wider">Valor Total</span>
                                    <span className="text-lg font-black text-[#FFE600]">{formatBRL(unit.valor_total)}</span>
                                </div>
                            </CheckRow>
                        </div>

                        {/* Rodapé */}
                        {priceTable && (
                            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-500 italic space-y-1">
                                <CheckRow checked={fields.tabela_vigente} onChange={() => toggleField('tabela_vigente')} small>
                                    <span>Valores válidos para {formatMonth(priceTable.reference_month)}</span>
                                </CheckRow>
                                <CheckRow checked={fields.reajuste_construcao} onChange={() => toggleField('reajuste_construcao')} small>
                                    <span>Reajuste mensal durante construção: {priceTable.index_type}/SC</span>
                                </CheckRow>
                                <CheckRow checked={fields.reajuste_financiamento} onChange={() => toggleField('reajuste_financiamento')} small>
                                    <span>Reajuste financiamento construtora: IGPM + 1% a.m.</span>
                                </CheckRow>
                            </div>
                        )}
                    </div>

                    {/* ── Materiais do Imóvel ── */}
                    {hasMedia && (
                        <div className="border border-border/40 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setMediaExpanded(!mediaExpanded)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-foreground/5 hover:bg-foreground/10 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <ImageIcon size={16} className="text-muted-foreground" />
                                <span className="text-sm font-bold text-foreground">Materiais do Imóvel</span>
                                {selectedMedia.size > 0 && (
                                    <span className="text-[10px] bg-[#404F4F] text-white px-1.5 py-0.5 rounded-full font-bold">
                                        {selectedMedia.size} selecionado{selectedMedia.size > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            {mediaExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                        </button>

                        {mediaExpanded && (
                            <div className="p-4 space-y-4 border-t border-border/30">
                                {/* Ações rápidas */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAllMedia}
                                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border/40 hover:bg-foreground/5 transition-colors"
                                    >
                                        Selecionar tudo
                                    </button>
                                    <button
                                        onClick={deselectAllMedia}
                                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border/40 hover:bg-foreground/5 transition-colors"
                                    >
                                        Limpar seleção
                                    </button>
                                </div>

                                {/* Imagens */}
                                {propertyImages.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <ImageIcon size={12} /> Imagens ({propertyImages.length})
                                        </p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {propertyImages.map((url, i) => {
                                                const isCopying = copyingImage === url
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => copyImageToClipboard(url)}
                                                        disabled={copyingImage !== null}
                                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${
                                                            isCopying
                                                                ? 'border-emerald-500 ring-1 ring-emerald-500/30 opacity-70'
                                                                : 'border-transparent hover:border-border'
                                                        }`}
                                                        title="Clique para copiar a imagem e colar no WhatsApp"
                                                    >
                                                        <img
                                                            src={url}
                                                            alt={`Imagem ${i + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {/* Overlay */}
                                                        <div className={`absolute inset-0 transition-all ${
                                                            isCopying ? 'bg-black/40' : 'bg-black/0 group-hover:bg-black/20'
                                                        }`} />
                                                        
                                                        {/* Ação */}
                                                        <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                                                            isCopying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                        }`}>
                                                            {isCopying ? (
                                                                <Loader2 size={16} className="text-white animate-spin" />
                                                            ) : (
                                                                <div className="bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm shadow-xl">
                                                                    <Copy size={14} />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Número */}
                                                        <span className="absolute bottom-1 left-1 text-[9px] text-white/90 bg-black/50 px-1 rounded font-medium">
                                                            {i + 1}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Vídeos */}
                                {propertyVideos.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Video size={12} /> Vídeos ({propertyVideos.length})
                                        </p>
                                        <div className="space-y-1.5">
                                            {propertyVideos.map((url, i) => {
                                                const isSelected = selectedMedia.has(url)
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => toggleMedia(url)}
                                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${
                                                            isSelected
                                                                ? 'border-[#404F4F] bg-[#404F4F]/5'
                                                                : 'border-border/40 hover:bg-foreground/5'
                                                        }`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                                            isSelected ? 'bg-[#404F4F] border-[#404F4F]' : 'border-gray-300'
                                                        }`}>
                                                            {isSelected && <Check size={10} className="text-white" />}
                                                        </div>
                                                        <Video size={14} className="text-muted-foreground flex-shrink-0" />
                                                        <span className="text-xs text-foreground truncate">Vídeo {i + 1}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Documentos */}
                                {propertyDocuments.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <FileText size={12} /> Documentos ({propertyDocuments.length})
                                        </p>
                                        <div className="space-y-1.5">
                                            {propertyDocuments.map((doc, i) => {
                                                const isSelected = selectedMedia.has(doc.url)
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => toggleMedia(doc.url)}
                                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${
                                                            isSelected
                                                                ? 'border-[#404F4F] bg-[#404F4F]/5'
                                                                : 'border-border/40 hover:bg-foreground/5'
                                                        }`}
                                                    >
                                                        <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                                            isSelected ? 'bg-[#404F4F] border-[#404F4F]' : 'border-gray-300'
                                                        }`}>
                                                            {isSelected && <Check size={10} className="text-white" />}
                                                        </div>
                                                        <FileText size={14} className="text-red-400 flex-shrink-0" />
                                                        <span className="text-xs text-foreground truncate">{doc.name || `Documento ${i + 1}`}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
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
                            onClick={handleDownloadImage}
                            disabled={isGeneratingPDF}
                            className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted/30 transition-all disabled:opacity-50"
                        >
                            {isGeneratingPDF ? (
                                <><Loader2 size={16} className="animate-spin" /> Gerando...</>
                            ) : (
                                <><Download size={16} className="text-blue-500" /> Baixar Imagem</>
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

// ── Componente de linha com checkbox ──
function CheckRow({
    checked,
    onChange,
    children,
    dark,
    sub,
    small
}: {
    checked: boolean
    onChange: () => void
    children: React.ReactNode
    dark?: boolean
    sub?: boolean
    small?: boolean
}) {
    return (
        <label
            className={`flex items-start gap-2.5 cursor-pointer group transition-opacity ${
                !checked ? 'opacity-40' : ''
            } ${sub ? 'ml-1' : ''} ${small ? 'py-0' : 'py-1'}`}
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className={`mt-0.5 flex-shrink-0 rounded border-2 cursor-pointer transition-colors ${
                    small ? 'w-3 h-3' : 'w-3.5 h-3.5'
                } ${
                    dark
                        ? 'border-white/40 accent-white bg-transparent checked:bg-white checked:border-white'
                        : 'border-gray-300 accent-[#404F4F] checked:bg-[#404F4F] checked:border-[#404F4F]'
                }`}
            />
            <div className={`flex-1 min-w-0 ${sub ? 'text-xs text-white/70' : ''}`}>
                {children}
            </div>
        </label>
    )
}

// ── Componente auxiliar para conteúdo do fluxo ──
function FlowContent({ label, parcelas, valor }: { label: string; parcelas?: number; valor: number }) {
    return (
        <div className="flex justify-between items-center flex-1">
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
