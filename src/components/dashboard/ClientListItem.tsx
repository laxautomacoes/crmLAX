'use client'

import { useState } from 'react'
import { ChevronDown, Phone, Mail, Calendar, Sparkles, MessageSquare, Edit, Trash2, MapPin, User, IdCard, Heart, Target } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatPhone } from '@/lib/utils/phone'
import { analyzeLeadProbability } from '@/app/_actions/ai-analysis'
import { toast } from 'sonner'

interface ClientListItemProps {
    client: any
    isExpanded: boolean
    onToggle: () => void
    onEdit: () => void
    onDelete: () => void
    tenantId: string
    profileId: string
}

export function ClientListItem({
    client,
    isExpanded,
    onToggle,
    onEdit,
    onDelete,
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
            <tr className={`hover:bg-muted/50 transition-colors cursor-pointer group ${isExpanded ? 'bg-muted/50' : ''}`} onClick={onToggle}>
                <td className="px-6 py-5">
                    <div className="flex items-center gap-3 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                            {client.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-bold text-foreground">{client.name}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-medium">
                                <Calendar size={10} /> {new Date(client.created_at).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-5">
                    <div className="flex flex-col text-sm items-center">
                        <span className="text-foreground font-medium flex items-center gap-1.5">
                            <Phone size={14} className="text-muted-foreground/50" /> {formatPhone(client.phone)}
                        </span>
                        <span className="text-muted-foreground text-xs flex items-center gap-1.5 mt-0.5">
                            <Mail size={14} className="text-muted-foreground/50" /> {client.email}
                        </span>
                    </div>
                </td>
                <td className="px-6 py-5 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-2 justify-center">
                        {client.leads && client.leads.length > 0 ? (
                            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded uppercase border border-green-100">
                                {client.leads.length} {client.leads.length === 1 ? 'Lead Ativo' : 'Leads Ativos'}
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded uppercase border border-border">
                                Sem Leads
                            </span>
                        )}
                        {client.interest && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase border border-blue-100">
                                {client.interest}
                            </span>
                        )}
                    </div>
                </td>
                <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-center gap-2">
                        <button className={`p-2 rounded-lg bg-card border border-border group-hover:border-border/80 transition-all ${isExpanded ? 'rotate-180 shadow-sm' : ''}`}>
                            <ChevronDown size={18} className="text-muted-foreground" />
                        </button>
                    </div>
                </td>
            </tr>
            <tr>
                <td colSpan={4} className="p-0 border-none">
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                                className="overflow-hidden bg-card/50"
                            >
                                <ClientExpandedContent
                                    client={client}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
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
    isAnalyzed,
    analysisLoading,
    analysisResult,
    handleAnalyze,
    setIsAnalyzed
}: any) {
    return (
        <div className="px-10 py-8 grid grid-cols-1 lg:grid-cols-12 gap-10 border-t border-border">
            {/* Sidebar: Infos & Ações */}
            <div className="lg:col-span-3 space-y-6">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Dados de Contato</h4>
                    <div className="bg-card p-4 rounded-xl border border-border space-y-3 shadow-sm">
                        <div className="flex items-center gap-3 text-sm text-foreground">
                            <Mail size={16} className="text-muted-foreground" />
                            <span className="truncate">{client.email}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-foreground">
                            <Phone size={16} className="text-muted-foreground" />
                            {formatPhone(client.phone)}
                        </div>
                        {client.cpf && (
                            <div className="flex items-center gap-3 text-sm text-foreground">
                                <IdCard size={16} className="text-muted-foreground" />
                                {client.cpf}
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-sm text-foreground pt-2 border-t border-border">
                            <Calendar size={16} className="text-muted-foreground" />
                            Cliente desde {new Date(client.created_at).toLocaleDateString('pt-BR')}
                        </div>
                    </div>
                </div>

                {(client.marital_status || client.birth_date || client.primary_interest) && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Informações Adicionais</h4>
                        <div className="bg-card p-4 rounded-xl border border-border space-y-3 shadow-sm">
                            {client.birth_date && (
                                <div className="flex items-center gap-3 text-sm text-foreground">
                                    <Calendar size={16} className="text-muted-foreground" />
                                    Nascimento: {new Date(client.birth_date).toLocaleDateString('pt-BR')}
                                </div>
                            )}
                            {client.marital_status && (
                                <div className="flex items-center gap-3 text-sm text-foreground">
                                    <Heart size={16} className="text-muted-foreground" />
                                    {client.marital_status}
                                </div>
                            )}
                            {client.primary_interest && (
                                <div className="flex items-center gap-3 text-sm text-foreground">
                                    <Target size={16} className="text-muted-foreground" />
                                    Interesse em <span className="font-bold capitalize">{client.primary_interest}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {client.address_street && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Endereço</h4>
                        <div className="bg-card p-4 rounded-xl border border-border space-y-2 shadow-sm">
                            <div className="flex items-start gap-3 text-sm text-foreground">
                                <MapPin size={16} className="text-muted-foreground mt-0.5" />
                                <div className="flex flex-col">
                                    <span>{client.address_street}, {client.address_number}</span>
                                    {client.address_complement && <span className="text-xs text-muted-foreground">{client.address_complement}</span>}
                                    <span>{client.address_neighborhood}</span>
                                    <span>{client.address_city} - {client.address_state}</span>
                                    {client.address_zip_code && <span className="text-xs text-muted-foreground">{client.address_zip_code}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-2 pt-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg text-sm font-bold text-foreground hover:bg-muted/50 transition-colors shadow-sm"
                    >
                        <Edit size={16} /> Editar Cadastro
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
                    >
                        <Trash2 size={16} /> Excluir Cliente
                    </button>
                </div>
            </div>

            {/* Centro: Leads & Notas */}
            <ClientLeadsSection client={client} />

            {/* Direita: Análise de IA */}
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

function ClientLeadsSection({ client }: any) {
    return (
        <div className="lg:col-span-5 space-y-6">
            <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Leads e Interesses</h4>
                <div className="space-y-3">
                    {client.leads && client.leads.length > 0 ? (
                        client.leads.map((lead: any) => (
                            <div key={lead.id} className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-foreground">
                                        {lead.assets?.title || lead.source || 'Interesse não especificado'}
                                    </span>
                                    <span className="px-2 py-0.5 bg-secondary/20 text-foreground text-[9px] font-bold rounded uppercase">
                                        {lead.status_name || lead.status}
                                    </span>
                                </div>
                                {lead.assets?.title && lead.source && (
                                    <p className="text-[10px] text-muted-foreground italic">Origem: {lead.source}</p>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="bg-muted/50 p-6 rounded-xl border border-dashed border-border text-center">
                            <p className="text-xs text-muted-foreground">Nenhum lead vinculado a este cliente ainda.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Última Nota</h4>
                {client.notes ? (
                    <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50 flex gap-3">
                        <MessageSquare size={16} className="text-orange-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground italic leading-relaxed">"{client.notes}"</p>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground px-1">Sem notas registradas.</p>
                )}
            </div>
        </div>
    )
}

function ClientAIAnalysis({ isAnalyzed, analysisLoading, analysisResult, handleAnalyze, setIsAnalyzed }: any) {
    return (
        <div className="lg:col-span-4 space-y-4">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Inteligência Artificial</h4>
            <div className="bg-[#404F4F] p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles size={80} />
                </div>

                {!isAnalyzed ? (
                    <div className="relative z-10 text-center space-y-4">
                        <div className="bg-[#FFE600] w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-lg text-[#404F4F]">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h5 className="font-bold text-sm">Análise Preditiva</h5>
                            <p className="text-[11px] text-gray-300 mt-1">Gere um insight automático baseado no comportamento deste cliente.</p>
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={analysisLoading}
                            className="w-full py-2.5 bg-[#FFE600] hover:bg-[#F2DB00] text-[#404F4F] rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {analysisLoading ? <span className="animate-pulse">Analisando...</span> : 'Gerar Insight Agora'}
                        </button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative z-10 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h5 className="font-bold text-sm flex items-center gap-2">
                                <Sparkles size={14} className="text-[#FFE600]" /> Resultado IA
                            </h5>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsAnalyzed(false); }}
                                className="text-[10px] text-gray-400 hover:text-white underline"
                            >
                                Nova Análise
                            </button>
                        </div>
                        <p className="text-xs text-gray-100 leading-relaxed italic bg-black/20 p-4 rounded-xl border border-white/5">
                            {analysisResult}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
