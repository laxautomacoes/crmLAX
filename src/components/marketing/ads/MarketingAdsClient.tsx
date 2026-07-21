'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Plus, Filter, MoreVertical, DollarSign, Target, Megaphone, Users, Edit, Trash2, Power } from 'lucide-react'
import { CampaignModal } from './CampaignModal'
import { AdsFilterModal } from './AdsFilterModal'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import type { MarketingCampaign, CreateCampaignData } from '@/app/_actions/marketing-ads'
import { createMarketingCampaign, updateMarketingCampaign, deleteMarketingCampaign } from '@/app/_actions/marketing-ads'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface MarketingAdsClientProps {
    tenantId: string
    initialCampaigns: MarketingCampaign[]
    initialMetrics: {
        totalInvestimento: number
        totalLeads: number
        cplMedio: number
        canaisAtivos: number
    }
}

export function MarketingAdsClient({ tenantId, initialCampaigns, initialMetrics }: MarketingAdsClientProps) {
    const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(initialCampaigns)
    const [metrics, setMetrics] = useState(initialMetrics)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
    const [campaignToEdit, setCampaignToEdit] = useState<MarketingCampaign | null>(null)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null)
    const [platformFilter, setPlatformFilter] = useState<string>('Todas')
    const [statusFilter, setStatusFilter] = useState<string>('Todos')

    const router = useRouter()
    const dropdownRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        setCampaigns(initialCampaigns)
        setMetrics(initialMetrics)
    }, [initialCampaigns, initialMetrics])

    // Listener para fechar o menu de ações ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdownId(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleCreateOrUpdate = async (data: CreateCampaignData): Promise<boolean> => {
        try {
            if (campaignToEdit) {
                const res = await updateMarketingCampaign(campaignToEdit.id, data)
                if (res.success) {
                    toast.success('Campanha atualizada com sucesso!')
                    router.refresh()
                    return true
                } else {
                    toast.error(res.error || 'Erro ao atualizar campanha')
                    return false
                }
            } else {
                const res = await createMarketingCampaign(tenantId, data)
                if (res.success) {
                    toast.success('Campanha / Portal cadastrado com sucesso!')
                    router.refresh()
                    return true
                } else {
                    toast.error(res.error || 'Erro ao cadastrar campanha')
                    return false
                }
            }
        } catch (error: any) {
            toast.error('Ocorreu um erro ao salvar a campanha')
            return false
        }
    }

    const handleToggleStatus = async (campaign: MarketingCampaign) => {
        const currentStatus = campaign.metadata?.status || 'Ativa'
        const newStatus = currentStatus === 'Ativa' ? 'Pausada' : 'Ativa'
        setActiveDropdownId(null)

        const res = await updateMarketingCampaign(campaign.id, { status: newStatus as any })
        if (res.success) {
            toast.success(`Status da campanha alterado para ${newStatus}`)
            router.refresh()
        } else {
            toast.error(res.error || 'Erro ao alterar status')
        }
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return
        setIsDeleting(true)
        const res = await deleteMarketingCampaign(deleteTargetId)
        setIsDeleting(false)
        setDeleteTargetId(null)

        if (res.success) {
            toast.success('Campanha excluída com sucesso')
            router.refresh()
        } else {
            toast.error(res.error || 'Erro ao excluir campanha')
        }
    }

    const handleClearFilters = () => {
        setPlatformFilter('Todas')
        setStatusFilter('Todos')
    }

    // Contagem de filtros ativos
    const activeFilterCount = useMemo(() => {
        let count = 0
        if (platformFilter !== 'Todas') count++
        if (statusFilter !== 'Todos') count++
        return count
    }, [platformFilter, statusFilter])

    // Filtragem de campanhas
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c => {
            const matchesPlat = platformFilter === 'Todas' || c.plataforma === platformFilter
            const matchesStatus = statusFilter === 'Todos' || (c.metadata?.status || 'Ativa') === statusFilter
            return matchesPlat && matchesStatus
        })
    }, [campaigns, platformFilter, statusFilter])

    // Plataformas únicas para o filtro
    const uniquePlatforms = useMemo(() => {
        const set = new Set<string>()
        campaigns.forEach(c => set.add(c.plataforma))
        return Array.from(set)
    }, [campaigns])

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
            {/* Header da Página com Botões Padrão */}
            <PageHeader
                title="Anúncios"
                subtitle="Acompanhe seus investimentos em tráfego pago, portais imobiliários, captação de leads e CPL por canal."
            >
                <div className="grid grid-cols-2 md:grid-flow-col md:auto-cols-max gap-2 md:gap-3 w-full md:w-max">
                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`w-full md:w-auto md:min-w-[130px] h-[34px] flex items-center justify-center gap-2 px-4 border rounded-lg transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap outline-none focus:ring-2 shadow-sm relative ${
                            activeFilterCount > 0
                                ? 'bg-secondary/10 border-secondary text-secondary-foreground hover:bg-secondary/20 focus:ring-secondary/50'
                                : 'bg-card border-muted-foreground/30 text-foreground hover:bg-muted/50 focus:ring-ring/50'
                        }`}
                    >
                        <Filter size={14} strokeWidth={1} />
                        <span>FILTRAR</span>
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-secondary text-secondary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            setCampaignToEdit(null)
                            setIsModalOpen(true)
                        }}
                        className="w-full md:w-auto md:min-w-[130px] h-[34px] flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-transparent px-4 rounded-lg hover:opacity-90 active:scale-[0.99] transition-all text-xs font-bold uppercase tracking-widest shadow-sm whitespace-nowrap"
                    >
                        <Plus size={14} strokeWidth={1} />
                        <span>NOVO ANÚNCIO</span>
                    </button>
                </div>
            </PageHeader>

            <hr className="hidden md:block border-border -mt-2" />

            {/* Grid de KPIs do Marketing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Investimento Total */}
                <div className="bg-card border border-muted-foreground/50 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Investimento Em Mídia</h3>
                        <DollarSign size={16} className="text-foreground/70" />
                    </div>
                    <p className="text-2xl font-black text-foreground">
                        R$ {metrics.totalInvestimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Soma de anúncios &amp; portais ativos</p>
                </div>

                {/* Leads Captados */}
                <div className="bg-card border border-muted-foreground/50 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Leads Captados</h3>
                        <Users size={16} className="text-foreground/70" />
                    </div>
                    <p className="text-2xl font-black text-foreground">
                        {metrics.totalLeads}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Vindos de origens rastreadas</p>
                </div>

                {/* CPL Médio */}
                <div className="bg-card border border-muted-foreground/50 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CPL Médio Global</h3>
                        <Target size={16} className="text-foreground/70" />
                    </div>
                    <p className="text-2xl font-black text-foreground">
                        R$ {metrics.cplMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Custo médio por lead</p>
                </div>

                {/* Canais Ativos */}
                <div className="bg-card border border-muted-foreground/50 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Canais Ativos</h3>
                        <Megaphone size={16} className="text-foreground/70" />
                    </div>
                    <p className="text-2xl font-black text-foreground">
                        {metrics.canaisAtivos}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Portais &amp; mídias ativas</p>
                </div>
            </div>

            {/* Tabela de Anúncios e Portais */}
            <div className="bg-card rounded-xl border border-muted-foreground/30 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                        <thead>
                            <tr className="bg-gray-200 dark:bg-muted/50 border-b border-muted-foreground/30">
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider whitespace-nowrap text-left w-44">PLATAFORMA</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider whitespace-nowrap text-left">CAMPANHA</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider whitespace-nowrap text-left w-28">INÍCIO</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider whitespace-nowrap text-left w-28">TÉRMINO</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider whitespace-nowrap text-right w-32">INVESTIMENTO</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider whitespace-nowrap text-center w-28">LEADS</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider whitespace-nowrap text-right w-32">CPL</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider whitespace-nowrap text-center w-28">STATUS</th>
                                <th className="px-4 py-4 text-[10px] font-bold text-foreground uppercase tracking-wider whitespace-nowrap text-center w-20">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-muted-foreground/30">
                            {filteredCampaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                        Nenhuma campanha ou contrato de portal encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredCampaigns.map((item) => {
                                    const itemStatus = item.metadata?.status || 'Ativa'
                                    const isDropdownOpen = activeDropdownId === item.id

                                    return (
                                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                                            {/* Plataforma */}
                                            <td className="px-4 py-5 text-sm font-bold text-foreground truncate">
                                                {item.plataforma}
                                            </td>

                                            {/* Nome da Campanha */}
                                            <td className="px-4 py-5 text-sm font-medium text-foreground">
                                                <div className="font-bold text-foreground truncate">{item.campanha_nome}</div>
                                                {item.metadata?.observacoes && (
                                                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                                                        {item.metadata.observacoes}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Data Início */}
                                            <td className="px-4 py-5 text-xs text-muted-foreground text-left whitespace-nowrap">
                                                {new Date(item.data_inicio).toLocaleDateString('pt-BR')}
                                            </td>

                                            {/* Data Término */}
                                            <td className="px-4 py-5 text-xs text-muted-foreground text-left whitespace-nowrap">
                                                {item.data_fim ? new Date(item.data_fim).toLocaleDateString('pt-BR') : '-'}
                                            </td>

                                            {/* Investimento */}
                                            <td className="px-4 py-5 text-sm font-bold text-foreground text-right whitespace-nowrap">
                                                R$ {item.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>

                                            {/* Leads */}
                                            <td className="px-4 py-5 text-sm font-bold text-foreground text-center">
                                                <span className="px-2.5 py-1 bg-muted rounded-full text-xs font-black">
                                                    {item.leads_count || 0}
                                                </span>
                                            </td>

                                            {/* CPL */}
                                            <td className="px-4 py-5 text-sm font-bold text-foreground text-right whitespace-nowrap">
                                                R$ {(item.cpl || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-4 py-5 text-center">
                                                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase whitespace-nowrap inline-block ${
                                                    itemStatus === 'Ativa'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : itemStatus === 'Pausada'
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                    {itemStatus}
                                                </span>
                                            </td>

                                            {/* Dropdown de Ações */}
                                            <td className="px-4 py-5 text-center relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setActiveDropdownId(isDropdownOpen ? null : item.id)
                                                    }}
                                                    className="p-2 bg-muted text-foreground rounded-lg shadow-sm hover:opacity-80 transition-all"
                                                    title="Opções"
                                                >
                                                    <MoreVertical size={16} />
                                                </button>

                                                {isDropdownOpen && (
                                                    <div
                                                        ref={dropdownRef}
                                                        className="absolute right-4 top-12 w-44 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-150"
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                setActiveDropdownId(null)
                                                                setCampaignToEdit(item)
                                                                setIsModalOpen(true)
                                                            }}
                                                            className="w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left flex items-center gap-2"
                                                        >
                                                            <Edit size={14} className="text-blue-500" />
                                                            <span>Editar</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleToggleStatus(item)}
                                                            className="w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left flex items-center gap-2 border-t border-border/50"
                                                        >
                                                            <Power size={14} className="text-amber-500" />
                                                            <span>{itemStatus === 'Ativa' ? 'Pausar' : 'Ativar'}</span>
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                setActiveDropdownId(null)
                                                                setDeleteTargetId(item.id)
                                                            }}
                                                            className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-muted transition-colors text-left flex items-center gap-2 border-t border-border/50"
                                                        >
                                                            <Trash2 size={14} className="text-red-500" />
                                                            <span>Excluir</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Filtro Padronizado */}
            <AdsFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                platformFilter={platformFilter}
                setPlatformFilter={setPlatformFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                uniquePlatforms={uniquePlatforms}
                onClear={handleClearFilters}
            />

            {/* Modal de Cadastro / Edição */}
            <CampaignModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setCampaignToEdit(null)
                }}
                onSubmit={handleCreateOrUpdate}
                campaignToEdit={campaignToEdit}
            />

            {/* Modal de Confirmação de Exclusão */}
            <ConfirmModal
                isOpen={!!deleteTargetId}
                title="Excluir Campanha / Portal"
                message="Tem certeza que deseja excluir esta campanha de mídia? Esta ação não pode ser desfeita."
                confirmLabel="Excluir"
                cancelLabel="Cancelar"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTargetId(null)}
                isLoading={isDeleting}
                variant="danger"
            />
        </div>
    )
}
