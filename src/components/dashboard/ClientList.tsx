'use client'

import { useState } from 'react'
import { Plus, Search, ChevronDown, Phone, Mail, Calendar, Sparkles, MessageSquare, Edit, Trash2 } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { formatPhone } from '@/lib/utils/phone'
import { createNewClient, updateClient, deleteClient } from '@/app/_actions/clients'
import { analyzeLeadProbability } from '@/app/_actions/ai-analysis'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface ClientListProps {
    initialClients: any[]
    tenantId: string
    profileId: string
}

export default function ClientList({ initialClients, tenantId, profileId }: ClientListProps) {
    const [clients, setClients] = useState(initialClients)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Form States
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', interest: '' })
    const [editingClientId, setEditingClientId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const filteredClients = clients.filter(client => {
        return client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
    })

    const handleEdit = (client: any) => {
        setFormData({
            name: client.name,
            email: client.email,
            phone: client.phone,
            interest: client.interest || ''
        })
        setEditingClientId(client.id)
        setIsModalOpen(true)
    }

    const handleOpenCreate = () => {
        setFormData({ name: '', email: '', phone: '', interest: '' })
        setEditingClientId(null)
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            const res = await deleteClient(id)
            if (res.success) {
                toast.success('Cliente excluído com sucesso')
                window.location.reload()
            } else {
                toast.error('Erro ao excluir cliente')
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let res;
            if (editingClientId) {
                res = await updateClient(editingClientId, formData)
            } else {
                res = await createNewClient(tenantId, formData)
            }

            if (res.success) {
                toast.success(editingClientId ? 'Cliente atualizado!' : 'Cliente criado com sucesso!')
                setIsModalOpen(false)
                setFormData({ name: '', email: '', phone: '', interest: '' })
                setEditingClientId(null)
                window.location.reload()
            } else {
                toast.error('Erro: ' + res.error)
            }
        } catch (err) {
            toast.error('Erro inesperado')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header with Title and "Novo" button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-foreground text-center md:text-left">
                    Clientes
                </h1>
                <div className="flex items-center justify-center md:justify-end">
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                    >
                        <Plus size={18} />
                        Novo Cliente
                    </button>
                </div>
            </div>

            {/* Search Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#FFE600]/50 focus:border-[#FFE600] outline-none transition-all bg-white"
                    />
                </div>
            </div>

            {/* Content Render: Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Cliente</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Contato</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center hidden lg:table-cell">Status/Leads</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredClients.map(client => (
                                <ClientListItem
                                    key={client.id}
                                    client={client}
                                    tenantId={tenantId}
                                    profileId={profileId}
                                    isExpanded={expandedId === client.id}
                                    onToggle={() => setExpandedId(expandedId === client.id ? null : client.id)}
                                    onEdit={() => handleEdit(client)}
                                    onDelete={() => handleDelete(client.id)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredClients.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-400 font-medium">Nenhum cliente disponível para exibição.</p>
                </div>
            )}

            {/* Modal remains the same */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingClientId ? "Editar Cliente" : "Novo Cliente"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-[#404F4F]/80 ml-1">Nome Completo</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: João Silva"
                            className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-[#FFE600] focus:ring-1 focus:ring-[#FFE600] transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[#404F4F]/80 ml-1">E-mail</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            placeholder="joao@exemplo.com"
                            className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-[#FFE600] focus:ring-1 focus:ring-[#FFE600] transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[#404F4F]/80 ml-1">Telefone / WhatsApp</label>
                        <input
                            required
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                            placeholder="(48) 99999 9999"
                            className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-[#FFE600] focus:ring-1 focus:ring-[#FFE600] transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-bold text-[#404F4F]/80 ml-1">Interesse Inicial (Opcional)</label>
                        <input
                            value={formData.interest}
                            onChange={e => setFormData({ ...formData, interest: e.target.value })}
                            placeholder="Ex: Consultoria Premium"
                            className="w-full p-3 rounded-lg border border-gray-200 focus:outline-none focus:border-[#FFE600] focus:ring-1 focus:ring-[#FFE600] transition-all"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-3 rounded-lg font-bold border border-[#404F4F]/20 text-[#404F4F] hover:bg-[#404F4F]/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={loading}
                            className="flex-[2] bg-[#404F4F] text-white font-bold py-3 rounded-lg hover:bg-[#2d3939] transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : (editingClientId ? 'Atualizar Dados' : 'Criar Cliente')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

function ClientListItem({ client, isExpanded, onToggle, onEdit, onDelete, tenantId, profileId }: any) {
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
            <tr className={`hover:bg-gray-50/80 transition-colors cursor-pointer group ${isExpanded ? 'bg-gray-50/80' : ''}`} onClick={onToggle}>
                <td className="px-6 py-5">
                    <div className="flex items-center gap-3 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-[#404F4F]/5 flex items-center justify-center text-sm font-bold text-[#404F4F] shrink-0">
                            {client.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="font-bold text-[#404F4F]">{client.name}</span>
                            <span className="text-[10px] text-gray-400 flex items-center gap-1 uppercase tracking-wider font-medium">
                                <Calendar size={10} /> {new Date(client.created_at).toLocaleDateString('pt-BR')}
                            </span>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-5">
                    <div className="flex flex-col text-sm items-center">
                        <span className="text-[#404F4F] font-medium flex items-center gap-1.5">
                            <Phone size={14} className="text-gray-300" /> {formatPhone(client.phone)}
                        </span>
                        <span className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                            <Mail size={14} className="text-gray-300" /> {client.email}
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
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-bold rounded uppercase border border-gray-100">
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
                        <button className={`p-2 rounded-lg bg-white border border-[#404F4F]/10 group-hover:border-[#404F4F]/20 transition-all ${isExpanded ? 'rotate-180 shadow-sm' : ''}`}>
                            <ChevronDown size={18} className="text-[#404F4F]/60" />
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
                                className="overflow-hidden bg-white/50"
                            >
                                <div className="px-10 py-8 grid grid-cols-1 lg:grid-cols-12 gap-10 border-t border-gray-100">
                                    {/* Sidebar: Infos & Ações */}
                                    <div className="lg:col-span-3 space-y-6">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Dados de Contato</h4>
                                            <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-3 shadow-sm">
                                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                                    <Mail size={16} className="text-[#404F4F]/40" />
                                                    <span className="truncate">{client.email}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                                    <Phone size={16} className="text-[#404F4F]/40" />
                                                    {formatPhone(client.phone)}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-gray-600 pt-2 border-t border-gray-50">
                                                    <Calendar size={16} className="text-[#404F4F]/40" />
                                                    Cliente desde {new Date(client.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-[#404F4F] hover:bg-gray-50 transition-colors shadow-sm"
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
                                    <div className="lg:col-span-5 space-y-6">
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Leads e Interesses</h4>
                                            <div className="space-y-3">
                                                {client.leads && client.leads.length > 0 ? (
                                                    client.leads.map((lead: any) => (
                                                        <div key={lead.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-xs font-bold text-[#404F4F]">{lead.source}</span>
                                                                <span className="px-2 py-0.5 bg-[#FFE600]/20 text-[#404F4F] text-[9px] font-bold rounded uppercase">
                                                                    {lead.status}
                                                                </span>
                                                            </div>
                                                            {lead.details?.interest && (
                                                                <p className="text-sm text-gray-500">{lead.details.interest}</p>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="bg-gray-50/50 p-6 rounded-xl border border-dashed border-gray-200 text-center">
                                                        <p className="text-xs text-gray-400">Nenhum lead vinculado a este cliente ainda.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Última Nota</h4>
                                            {client.notes ? (
                                                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100/50 flex gap-3">
                                                    <MessageSquare size={16} className="text-orange-400 shrink-0 mt-0.5" />
                                                    <p className="text-sm text-gray-700 italic leading-relaxed">"{client.notes}"</p>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 px-1">Sem notas registradas.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Direita: Análise de IA */}
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
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </td>
            </tr>
        </>
    )
}
