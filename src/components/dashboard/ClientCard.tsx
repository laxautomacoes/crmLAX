'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Mail, Calendar, Tag, MessageSquare, Edit, Trash2, Sparkles, MoreVertical } from 'lucide-react'
import { analyzeLeadProbability } from '@/app/_actions/ai-analysis'
import { deleteClient } from '@/app/_actions/clients'
import { toast } from 'sonner' // Assumindo que o projeto usa sonner ou similar para toasts

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
        leads?: any[] // Ajustar tipo se necessário
    }
    tenantId: string
    profileId: string
    isPro?: boolean // Para verificar plano
    onEdit: (client: any) => void
}

export default function ClientCard({ client, tenantId, profileId, isPro = true, onEdit }: ClientProps) {
    const [isAnalyzed, setIsAnalyzed] = useState(false)
    const [analysisLoading, setAnalysisLoading] = useState(false)
    const [analysisResult, setAnalysisResult] = useState<string | null>(null)
    const [showMenu, setShowMenu] = useState(false)

    const handleAnalyze = async () => {
        if (!isPro && false) { // Lógica freemium a implementar
            toast.error('Upgrade para o plano Pro para usar IA ilimitada.')
            return
        }

        setAnalysisLoading(true)
        try {
            // Usando a estrutura esperada pela action existente
            const result = await analyzeLeadProbability({
                tenant_id: tenantId,
                profile_id: profileId,
                name: client.name,
                phone: client.phone,
                source: client.interest,
                interactions: [client.notes] // Usando notes como interação simples
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

    const handleDelete = async () => {
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow relative overflow-hidden group"
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-[#404F4F]">{client.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Calendar size={12} />
                        Cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                    </p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-[#404F4F] transition-colors"
                    >
                        <MoreVertical size={20} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-gray-100 rounded-lg shadow-lg z-10 py-1">
                            <button
                                onClick={() => onEdit(client)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Edit size={14} /> Editar
                            </button>
                            <button
                                onClick={handleDelete}
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                            >
                                <Trash2 size={14} /> Excluir
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <Phone size={16} className="text-[#404F4F]" />
                    <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <Mail size={16} className="text-[#404F4F]" />
                    <span className="truncate">{client.email}</span>
                </div>
            </div>

            {/* Tags & Interests */}
            <div className="mb-6 flex flex-wrap gap-2">
                {client.interest && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                        {client.interest}
                    </span>
                )}
                {client.tags && client.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium border border-gray-200 flex items-center gap-1">
                        <Tag size={10} /> {tag}
                    </span>
                ))}
            </div>

            {/* Notes Preview */}
            {client.notes && (
                <div className="bg-orange-50/50 p-4 rounded-xl mb-4 border border-orange-100/50">
                    <div className="flex items-start gap-2">
                        <MessageSquare size={14} className="text-orange-400 mt-1" />
                        <p className="text-sm text-gray-600 italic line-clamp-2">"{client.notes}"</p>
                    </div>
                </div>
            )}

            {/* AI Action Area */}
            <div className="mt-auto pt-4 border-t border-gray-100">
                {!isAnalyzed ? (
                    <button
                        onClick={handleAnalyze}
                        disabled={analysisLoading}
                        className="w-full flex items-center justify-center gap-2 bg-[#404F4F] hover:bg-[#2d3939] text-white py-2.5 rounded-lg transition-all font-medium text-sm disabled:opacity-70"
                    >
                        {analysisLoading ? (
                            <span className="animate-pulse">Analisando Lead...</span>
                        ) : (
                            <>
                                <Sparkles size={16} className="text-[#FFE600]" />
                                Gerar Análise de Probabilidade
                            </>
                        )}
                    </button>
                ) : (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="rounded-xl overflow-hidden"
                    >
                        <div className="bg-[#FFE600]/10 border border-[#FFE600]/20 p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-[#404F4F] flex items-center gap-2">
                                    <Sparkles size={14} className="text-yellow-600" /> Insight IA
                                </h4>
                                <button
                                    onClick={() => setIsAnalyzed(false)}
                                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                                >
                                    Fechar
                                </button>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {analysisResult}
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    )
}
