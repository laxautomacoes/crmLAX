'use client'

import { useState } from 'react'
import { ChevronDown, Phone, Mail, Calendar, Sparkles, MessageSquare, Edit, Trash2, MapPin, User, IdCard, Heart, Target, FileText, Image as ImageIcon, Video, Archive } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPhone } from '@/lib/utils/phone'
import { analyzeLeadProbability } from '@/app/_actions/ai-analysis'
import { toast } from 'sonner'
import { MediaPreviewModal } from '@/components/shared/MediaPreviewModal'

interface ClientListItemProps {
    client: any
    isExpanded: boolean
    onToggle: () => void
    onEdit: () => void
    onDelete: () => void
    onArchive: () => void
    tenantId: string
    profileId: string
}

export function ClientListItem({
    client,
    isExpanded,
    onToggle,
    onEdit,
    onDelete,
    onArchive,
    tenantId,
    profileId
}: ClientListItemProps) {
    const [isAnalyzed, setIsAnalyzed] = useState(false)
    const [analysisLoading, setAnalysisLoading] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<string | null>(null)

    const handleAnalyze = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setAnalysisLoading(true)
        try {
            const result = await analyzeLeadProbability({
                tenant_id: tenantId,
                profile_id: profileId,
                name: client.name,
                phone: client.phone,
                source: client.interest,
                interactions: [client.notes]
            })
            if (result.success) {
                setAnalysisResult(result.analysis)
                setIsAnalyzed(true)
            } else {
                toast.error('Erro ao gerar análise.')
            }
        } catch (error) {
            toast.error('Erro na conexão com IA.')
        } finally {
            setAnalysisLoading(false)
        }
    }

    return (
        <>
            <tr className={`hover:bg-muted/50 transition-colors cursor-pointer group ${isExpanded ? 'bg-slate-100 dark:bg-transparent' : ''}`} onClick={onToggle}>
                <td className="px-4 py-5 text-center">
                    <span className="font-bold text-foreground">{client.name}</span>
                </td>
                <td className="px-4 py-5">
                    <div className="flex flex-col items-center justify-center gap-1 text-sm whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                            <span className="text-foreground font-medium">{formatPhone(client.phone)}</span>
                            <a
                                href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 bg-emerald-500/10 text-emerald-600 rounded-md hover:bg-emerald-500/20 transition-colors"
                                title="Abrir no WhatsApp"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MessageSquare size={12} />
                            </a>
                        </div>
                        {client.email && (
                            <div className="flex items-center justify-center gap-1.5">
                                <span className="text-sm font-medium text-foreground max-w-[180px] truncate">{client.email}</span>
                                <a
                                    href={`mailto:${client.email}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 bg-blue-500/10 text-blue-600 rounded-md hover:bg-blue-500/20 transition-colors"
                                    title="Enviar e-mail"
                                >
                                    <Mail size={12} />
                                </a>
                            </div>
                        )}
                    </div>
                </td>
                <td className="px-4 py-5 hidden lg:table-cell text-center">
                    <div className="flex flex-col gap-0.5 items-center">
                        {client.leads && client.leads.length > 0 ? (
                            client.leads.map((lead: any, i: number) => (
                                <span key={i} className="text-sm font-medium text-foreground truncate max-w-[200px] block">
                                    {lead.property_interest || lead.properties?.title || lead.source || 'Sem interesse'}
                                </span>
                            ))
                        ) : (
                            <span className="text-sm text-muted-foreground">Sem leads</span>
                        )}
                    </div>
                </td>
                <td className="px-4 py-5 hidden lg:table-cell text-center">
                    <div className="flex flex-col gap-1 items-center">
                        {client.leads && client.leads.length > 0 ? (
                            client.leads.map((lead: any, i: number) => {
                                const c = lead.status_color
                                const isLight = c && ['#FFFFFF', '#FACC15', '#FDE047', '#FEF08A', '#FCD34D'].includes(c.toUpperCase())
                                return (
                                    <span
                                        key={i}
                                        className="px-2.5 py-0.5 text-[10px] font-medium rounded-full uppercase whitespace-nowrap"
                                        style={c ? {
                                            backgroundColor: c,
                                            color: isLight ? '#1a1a1a' : '#ffffff',
                                        } : {
                                            backgroundColor: 'var(--secondary)',
                                            color: 'var(--foreground)',
                                            opacity: 0.6
                                        }}
                                    >
                                        {lead.status_name || lead.status || '—'}
                                    </span>
                                )
                            })
                        ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                        )}
                    </div>
                </td>
                <td className="px-4 py-5 text-center w-16">
                    <button className={`p-2 rounded-lg bg-card border border-border group-hover:border-border/80 transition-all ${isExpanded ? 'rotate-180 shadow-sm' : ''}`}>
                        <ChevronDown size={18} className="text-muted-foreground" />
                    </button>
                </td>
            </tr>
            <tr>
                <td colSpan={5} className="p-0 border-none">
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="overflow-hidden"
                                style={{ backgroundColor: 'var(--background)' }}
                            >
                                <ClientExpandedContent
                                    client={client}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onArchive={onArchive}
                                    isAnalyzed={isAnalyzed}
                                    analysisLoading={analysisLoading}
                                    analysisResult={analysisResult}
                                    handleAnalyze={handleAnalyze}
                                    setIsAnalyzed={setIsAnalyzed}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </td>
            </tr>
        </>
    )
}

function ClientExpandedContent({
    client,
    onEdit,
    onDelete,
    onArchive,
    isAnalyzed,
    analysisLoading,
    analysisResult,
    handleAnalyze,
    setIsAnalyzed
}: any) {
    return (
        <div className="px-6 py-8 flex flex-col gap-8 border-t border-border">
            <div className="w-full flex justify-end">
                <div className="flex flex-row gap-2 w-full sm:w-auto">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-card border border-border rounded-lg text-sm font-bold text-foreground hover:bg-muted/50 transition-colors shadow-sm whitespace-nowrap"
                        title="Editar Cadastro"
                    >
                        <Edit size={13} /> Editar
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onArchive(); }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-card border border-border rounded-lg text-sm font-bold text-foreground hover:bg-muted/50 transition-colors shadow-sm whitespace-nowrap"
                        title="Arquivar Cliente"
                    >
                        <Archive size={13} /> Arquivar
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[#EF4444] text-white rounded-lg text-sm font-bold hover:bg-[#DC2626] transition-colors shadow-sm whitespace-nowrap"
                        title="Excluir Cliente"
                    >
                        <Trash2 size={13} /> Excluir
                    </button>
                </div>
            </div>

            <div className="space-y-4 w-full">
                {/* Dados Pessoais & Endereço */}
                <div className="flex flex-col md:flex-row gap-3 w-full">
                    <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3 shadow-sm flex-1">
                        <h5 className="text-sm font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2 mb-3">Dados Pessoais</h5>
                        <div className="text-base text-foreground space-y-2">
                            <div>Cliente desde: <span className="font-medium">{new Date(client.created_at).toLocaleDateString('pt-BR')}</span></div>
                            {client.cpf && <div>CPF: <span className="font-medium">{client.cpf}</span></div>}
                            <div>Nascimento: <span className="font-medium">{client.birth_date ? new Date(client.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}</span></div>
                            <div>Estado Civil: <span className="font-medium">{client.marital_status || 'Não informado'}</span></div>
                            {client.property_regime && <div>Regime: <span className="font-medium">{client.property_regime}</span></div>}
                        </div>
                        {client.spouse_name && (
                            <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                                <h6 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Cônjuge | Sócio</h6>
                                <div className="text-base text-foreground space-y-1">
                                    <div><span className="font-medium">{client.spouse_name}</span></div>
                                    {client.spouse_email && <div>E-mail: <span className="font-medium">{client.spouse_email}</span></div>}
                                    {client.spouse_phone && <div>Telefone: <span className="font-medium">{formatPhone(client.spouse_phone)}</span></div>}
                                    {client.spouse_cpf && <div>CPF: <span className="font-medium">{client.spouse_cpf}</span></div>}
                                    {client.spouse_birth_date && <div>Nascimento: <span className="font-medium">{new Date(client.spouse_birth_date).toLocaleDateString('pt-BR')}</span></div>}
                                </div>
                            </div>
                        )}
                    </div>

                        <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3 shadow-sm flex-1">
                            <h5 className="text-sm font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2 mb-3">Endereço</h5>
                            <div className="flex items-start gap-3 text-base text-foreground">
                                <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                                <div className="flex flex-col">
                                    {client.address_street ? (
                                        <>
                                            <span>{client.address_street}, {client.address_number || 'S/N'}</span>
                                            {client.address_complement && <span className="text-muted-foreground">{client.address_complement}</span>}
                                            <span>{client.address_neighborhood || 'Bairro não informado'}</span>
                                            <span>{client.address_city || 'Cidade'} - {client.address_state || 'UF'}</span>
                                            {client.address_zip_code && <span className="text-muted-foreground">{client.address_zip_code}</span>}
                                        </>
                                    ) : (
                                        <span className="font-medium text-muted-foreground">Endereço não informado</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notas & Mídias/Docs */}
                    {(client.notes || client.images?.length > 0 || client.videos?.length > 0 || client.documents?.length > 0) && (
                        <div className="flex flex-col md:flex-row gap-3 w-full">
                            {client.notes && (
                                <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3 shadow-sm flex-1">
                                    <h5 className="text-sm font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2 mb-3">Notas</h5>
                                    <div className="text-base text-foreground space-y-2">
                                        <p className="whitespace-pre-wrap">{client.notes}</p>
                                    </div>
                                </div>
                            )}
                            
                            {(client.images?.length > 0 || client.videos?.length > 0 || client.documents?.length > 0) && (
                                <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3 shadow-sm flex-1">
                                    <h5 className="text-sm font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 pb-2 mb-3">Mídias e Docs</h5>
                                    <div className="text-base text-foreground">
                                        <ClientAttachments client={client} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
            </div>

            <div className="flex flex-col gap-6 w-full">


                {/* Centro: Leads, Notas & IA */}
                <ClientLeadsSection
                    client={client}
                    isAnalyzed={isAnalyzed}
                    analysisLoading={analysisLoading}
                    analysisResult={analysisResult}
                    handleAnalyze={handleAnalyze}
                    setIsAnalyzed={setIsAnalyzed}
                />
            </div>
        </div>
    )
}

function LeadCardDropdown({ lead }: { lead: any }) {
    const [isOpen, setIsOpen] = useState(false)
    const hasAttachments = lead.images?.length > 0 || lead.videos?.length > 0 || lead.documents?.length > 0

    return (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-left"
            >
                <div className="flex-1 min-w-0">
                    <span className="text-base font-bold text-foreground truncate block">
                        {lead.property_interest || lead.properties?.title || lead.source || 'Interesse não especificado'}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                        const c = lead.status_color
                        const isLight = c && ['#FFFFFF', '#FACC15', '#FDE047', '#FEF08A', '#FCD34D'].includes(c.toUpperCase())
                        return (
                            <span
                                className="px-2.5 py-0.5 text-xs font-medium rounded-full uppercase whitespace-nowrap"
                                style={c ? {
                                    backgroundColor: c,
                                    color: isLight ? '#1a1a1a' : '#ffffff',
                                } : {
                                    backgroundColor: 'var(--secondary)',
                                    color: 'var(--foreground)',
                                    opacity: 0.6
                                }}
                            >
                                {lead.status_name || lead.status}
                            </span>
                        )
                    })()}
                    {lead.created_at && (
                        <span className="text-xs text-muted-foreground font-medium">
                            {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                        </span>
                    )}
                    <ChevronDown
                        size={14}
                        className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-3 border-t border-border/50" style={{ backgroundColor: 'var(--background)' }}>
                            <div className="pt-3 space-y-1.5">
                                {lead.source && (
                                    <p className="text-base text-muted-foreground">
                                        <span className="font-bold">Origem:</span> {lead.source}
                                    </p>
                                )}
                                {lead.lead_source && lead.lead_source !== lead.source && (
                                    <p className="text-base text-muted-foreground">
                                        <span className="font-bold">Canal:</span> {lead.lead_source}
                                    </p>
                                )}
                                {lead.notes && (
                                    <p className="text-base text-muted-foreground">
                                        <span className="font-bold">Notas:</span> <span className="italic">"{lead.notes}"</span>
                                    </p>
                                )}
                            </div>
                            {hasAttachments && (
                                <ClientAttachments client={lead} />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function ClientLeadsSection({ client, isAnalyzed, analysisLoading, analysisResult, handleAnalyze, setIsAnalyzed }: any) {
    return (
        <div className="space-y-6 w-full">
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Leads e Interesses</h4>
                </div>
                <div className="space-y-3">
                    {client.leads && client.leads.length > 0 ? (
                        client.leads.map((lead: any) => (
                            <LeadCardDropdown key={lead.id} lead={lead} />
                        ))
                    ) : (
                        <div className="bg-muted/50 p-6 rounded-xl border border-dashed border-border text-center">
                            <p className="text-xs text-muted-foreground">Nenhum lead vinculado a este cliente ainda.</p>
                        </div>
                    )}
                </div>
            </div>


            {/* Análise Preditiva */}
            <ClientAIAnalysis
                isAnalyzed={isAnalyzed}
                analysisLoading={analysisLoading}
                analysisResult={analysisResult}
                handleAnalyze={handleAnalyze}
                setIsAnalyzed={setIsAnalyzed}
            />
        </div>
    )
}



function ClientAttachments({ client, title }: { client: any; title?: string }) {
    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewIndex, setPreviewIndex] = useState(0)

    const mediaItems = [
        ...(client.images || []).map((img: string, i: number) => ({ type: 'image' as const, url: img, label: `Imagem ${i + 1}` })),
        ...(client.videos || []).map((vid: string, i: number) => ({ type: 'video' as const, url: vid, label: `Vídeo ${i + 1}` }))
    ]

    return (
        <div className="space-y-4">
            {title && <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">{title}</h4>}
            <div className="grid grid-cols-1 gap-2">
                {client.images?.map((img: string, i: number) => (
                    <button
                        key={i}
                        onClick={(e) => {
                            e.stopPropagation()
                            setPreviewIndex(i)
                            setPreviewOpen(true)
                        }}
                        className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg text-base hover:bg-muted/50 transition-colors text-left"
                    >
                        <ImageIcon size={14} className="text-blue-500" />
                        <span className="truncate">Imagem {i + 1}</span>
                    </button>
                ))}
                {client.videos?.map((vid: string, i: number) => (
                    <button
                        key={i}
                        onClick={(e) => {
                            e.stopPropagation()
                            const videoIndex = (client.images?.length || 0) + i
                            setPreviewIndex(videoIndex)
                            setPreviewOpen(true)
                        }}
                        className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg text-base hover:bg-muted/50 transition-colors text-left"
                    >
                        <Video size={14} className="text-purple-500" />
                        <span className="truncate">Vídeo {i + 1}</span>
                    </button>
                ))}
                {client.documents?.map((doc: any, i: number) => (
                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg text-base hover:bg-muted/50 transition-colors" onClick={(e) => e.stopPropagation()}>
                        <FileText size={14} className="text-emerald-500" />
                        <span className="truncate">{doc.name || `Documento ${i + 1}`}</span>
                    </a>
                ))}
            </div>

            <MediaPreviewModal
                isOpen={previewOpen}
                onClose={() => setPreviewOpen(false)}
                items={mediaItems}
                initialIndex={previewIndex}
            />
        </div>
    )
}

function ClientAIAnalysis({ isAnalyzed, analysisLoading, analysisResult, handleAnalyze, setIsAnalyzed }: any) {
    return (
        <div className="space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-1">Inteligência Artificial</h4>
            <div className="bg-primary p-4 rounded-2xl text-primary-foreground shadow-xl relative overflow-hidden group">

                {!isAnalyzed ? (
                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="bg-secondary w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-secondary-foreground shrink-0">
                            <Sparkles size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-sm">Análise Preditiva</h5>
                            <p className="text-xs text-primary-foreground/70 mt-0.5">Gere um insight automático baseado no comportamento deste cliente.</p>
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={analysisLoading}
                            className="px-4 py-2 bg-secondary hover:opacity-90 text-secondary-foreground rounded-lg font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 whitespace-nowrap"
                        >
                            {analysisLoading ? <span className="animate-pulse">Analisando...</span> : 'Gerar Insight'}
                        </button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h5 className="font-bold text-base flex items-center gap-2">
                                <Sparkles size={14} className="text-secondary" /> Resultado IA
                            </h5>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsAnalyzed(false); }}
                                className="text-xs text-primary-foreground/60 hover:text-primary-foreground underline"
                            >
                                Nova Análise
                            </button>
                        </div>
                        <p className="text-sm text-primary-foreground/90 leading-relaxed italic bg-black/20 p-4 rounded-xl border border-white/5">
                            {analysisResult}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
