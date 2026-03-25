'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Mail, Calendar, Tag, MessageSquare, Edit, Trash2, Sparkles, MoreVertical, ChevronDown, User, Heart, Target, MapPin } from 'lucide-react'
import { analyzeLeadProbability } from '@/app/_actions/ai-analysis'
import { deleteClient } from '@/app/_actions/clients'
import { formatPhone } from '@/lib/utils/phone'
import { toast } from 'sonner'

interface ClientProps {
    client: {
        id: string
        name: string
        phone: string
        email: string
        created_at: string
        interest: string
        value: number
        notes: string
        tags: string[]
        broker_name?: string
        marital_status?: string
        primary_interest?: string
        address_street?: string
        birth_date?: string
    }
    tenantId: string
    profileId: string
    isPro?: boolean
    onEdit: (client: any) => void
}

export default function ClientCard({ client, tenantId, profileId, isPro = true, onEdit }: ClientProps) {
    const [isAnalyzed, setIsAnalyzed] = useState(false)
    const [analysisLoading, setAnalysisLoading] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<string | null>(null)
    const [showMenu, setShowMenu] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)

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

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            const res = await deleteClient(client.id)
            if (res.success) {
                toast.success('Cliente excluído com sucesso')
            } else {
                toast.error('Erro ao excluir cliente')
            }
        }
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-card rounded-2xl border border-muted-foreground/30 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${isExpanded ? 'shadow-sm ring-1 ring-primary/10' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {/* Header com Avatar e Nome */}
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                            <h3 className="font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{client.name}</h3>
                        </div>

                    <div className="flex items-center gap-1">
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setShowMenu(!showMenu)
                                }}
                                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <MoreVertical size={16} />
                            </button>

                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute right-0 mt-1 w-32 bg-card border border-muted-foreground/30 rounded-lg shadow-xl z-20 py-1"
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(client); setShowMenu(false); }}
                                            className="w-full text-left px-3 py-2 text-[11px] font-bold text-foreground hover:bg-muted/10 flex items-center gap-2"
                                        >
                                            <Edit size={12} /> Editar
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="w-full text-left px-3 py-2 text-[11px] font-bold bg-[#EF4444] text-white hover:bg-[#DC2626] flex items-center gap-2 rounded-b-md"
                                        >
                                            <Trash2 size={12} /> Excluir
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {/* Info Rápida */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-foreground font-medium">
                        <Phone size={12} className="text-muted-foreground/70" />
                        <span>{formatPhone(client.phone)}</span>
                    </div>
                    {client.interest && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-md text-[10px] font-bold border border-blue-100 dark:border-blue-500/20 uppercase">
                                {client.interest}
                            </span>
                        </div>
                    )}
                </div>

                {/* Conteúdo Expandido */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 mt-4 border-t border-muted-foreground/20 space-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Leads e Interesses</h4>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-medium">
                                            {new Date(client.created_at).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="flex items-center gap-2 text-[11px] text-foreground/80 font-bold">
                                            <Target size={12} className="text-muted-foreground/70" />
                                            <span className="capitalize">Interesse: {client.primary_interest || client.interest}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-muted-foreground/10">
                                    <div className="flex items-center gap-2 text-[11px] text-foreground/80">
                                        <Mail size={12} className="text-muted-foreground/70" />
                                        <span className="truncate">{client.email}</span>
                                    </div>
                                    {client.broker_name && (
                                        <div className="flex items-center gap-2 text-[11px] text-primary font-bold">
                                            <span>Corretor: {client.broker_name}</span>
                                        </div>
                                    )}
                                    {client.marital_status && (
                                        <div className="flex items-center gap-2 text-[11px] text-foreground/80">
                                            <Heart size={12} className="text-muted-foreground/70" />
                                            <span>{client.marital_status}</span>
                                        </div>
                                    )}
                                    {client.primary_interest && (
                                        <div className="flex items-center gap-2 text-[11px] text-foreground/80 font-bold">
                                            <Target size={12} className="text-muted-foreground/70" />
                                            <span className="capitalize">Interesse: {client.primary_interest}</span>
                                        </div>
                                    )}
                                    {client.address_street && (
                                        <div className="flex items-start gap-2 text-[11px] text-foreground/80">
                                            <MapPin size={12} className="text-muted-foreground/70 mt-0.5" />
                                            <span>{client.address_street}</span>
                                        </div>
                                    )}
                                </div>

                                {client.notes && (
                                    <div className="bg-orange-50/50 dark:bg-orange-500/5 p-3 rounded-xl border border-orange-100/50 dark:border-orange-500/10">
                                        <p className="text-[11px] text-foreground italic leading-relaxed">"{client.notes}"</p>
                                    </div>
                                )}

                                {/* AI Action Area */}
                                <div className="pt-2">
                                    {!isAnalyzed ? (
                                        <button
                                            onClick={handleAnalyze}
                                            disabled={analysisLoading}
                                            className="w-full flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-primary-foreground py-2 rounded-lg transition-all font-bold text-[11px] disabled:opacity-70 shadow-sm"
                                        >
                                            {analysisLoading ? (
                                                <span className="animate-pulse">Analisando...</span>
                                            ) : (
                                                <>
                                                    <Sparkles size={14} className="text-secondary" />
                                                    Gerar Insight IA
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="bg-secondary/10 border border-secondary/20 p-3 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[10px] font-bold text-foreground flex items-center gap-2">
                                                    <Sparkles size={12} className="text-primary" /> Insight IA
                                                </h4>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setIsAnalyzed(false); }}
                                                    className="text-[10px] text-muted-foreground hover:text-foreground underline"
                                                >
                                                    Fechar
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-foreground leading-relaxed italic">
                                                {analysisResult}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
