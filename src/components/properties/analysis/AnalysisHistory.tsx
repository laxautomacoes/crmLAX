'use client'

import { useState, useEffect } from 'react'
import { 
    getMarketAnalysisHistory, 
    deleteMarketAnalysisHistory, 
    deleteAllMarketAnalysisHistory,
    MarketAnalysisHistoryRecord 
} from '@/app/_actions/market-analysis-history'
import { Loader2, CheckCircle2, AlertTriangle, ChevronUp, ChevronDown, Trash2, Clock, MapPin, XCircle, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { NEIGHBORHOOD_COLORS } from './LocationFilters'

interface AnalysisHistoryProps {
    onLoadResults?: (results: any[]) => void
    refreshKey?: number
}

export function AnalysisHistory({ onLoadResults, refreshKey }: AnalysisHistoryProps) {
    const [records, setRecords] = useState<MarketAnalysisHistoryRecord[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Recarregar automaticamente quando refreshKey muda (nova pesquisa salva)
    useEffect(() => {
        if (refreshKey && refreshKey > 0) {
            const reload = async () => {
                setIsLoading(true)
                const res = await getMarketAnalysisHistory()
                if (res.success && res.data) {
                    setRecords(res.data)
                }
                setIsLoading(false)
                if (!showHistory) setShowHistory(true)
            }
            reload()
        }
    }, [refreshKey])

    const handleToggleHistory = async () => {
        if (!showHistory) {
            setIsLoading(true)
            const res = await getMarketAnalysisHistory()
            if (res.success && res.data) {
                setRecords(res.data)
            }
            setIsLoading(false)
        }
        setShowHistory(!showHistory)
    }

    const handleDelete = async (id: string) => {
        const res = await deleteMarketAnalysisHistory(id)
        if (res.success) {
            setRecords(prev => prev.filter(r => r.id !== id))
            if (expandedId === id) setExpandedId(null)
            toast.success('Pesquisa excluída.')
        } else {
            toast.error('Erro ao excluir pesquisa.')
        }
    }

    const handleDeleteAll = async () => {
        const res = await deleteAllMarketAnalysisHistory()
        if (res.success) {
            setRecords([])
            setExpandedId(null)
            setConfirmDeleteAll(false)
            toast.success('Histórico limpo com sucesso.')
        } else {
            toast.error('Erro ao limpar histórico.')
        }
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val)

    return (
        <div className="bg-background rounded-lg border border-muted-foreground/30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-foreground/5 transition-colors" onClick={handleToggleHistory}>
                <span className="text-sm font-bold text-foreground">Histórico de Pesquisas</span>
                <div className="flex items-center gap-2">
                    {showHistory && records.length > 0 && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {confirmDeleteAll ? (
                                <>
                                    <span className="text-[10px] text-red-500 font-bold">Apagar tudo?</span>
                                    <button
                                        onClick={handleDeleteAll}
                                        className="text-[10px] font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                    >
                                        Sim
                                    </button>
                                    <button
                                        onClick={() => setConfirmDeleteAll(false)}
                                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-foreground/5 transition-colors"
                                    >
                                        Não
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setConfirmDeleteAll(true)}
                                    className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                                >
                                    <Trash2 size={10} />
                                    Limpar Tudo
                                </button>
                            )}
                        </div>
                    )}
                    {showHistory ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </div>
            </div>
            {showHistory && (
                <div className="border-t border-muted-foreground/20 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
                    ) : records.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">Nenhuma pesquisa realizada ainda.</p>
                    ) : (
                        <div className="divide-y divide-muted-foreground/20">
                            {records.map(record => (
                                <div key={record.id} className="space-y-0">
                                    <button
                                        onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                                        className={`w-full flex items-center justify-between p-3 text-left transition-colors group/card hover:bg-foreground/5 cursor-pointer ${expandedId === record.id ? 'bg-foreground/5' : ''}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                {record.status === 'completed' && <CheckCircle2 size={12} className="text-green-500 shrink-0" />}
                                                {record.status === 'partial' && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
                                                {record.status === 'failed' && <XCircle size={12} className="text-red-500 shrink-0" />}
                                                <p className="text-xs font-bold text-foreground truncate">
                                                    {record.neighborhoods.join(', ')} — {record.city}/{record.uf}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {new Date(record.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={10} />
                                                    {record.neighborhoods.length} bairro{record.neighborhoods.length > 1 ? 's' : ''}
                                                </span>
                                                {record.property_type && <span className="text-muted-foreground/60">{record.property_type}</span>}
                                                {record.bedrooms && <span className="text-muted-foreground/60">{record.bedrooms}Q</span>}
                                                {record.profiles && <span className="text-muted-foreground/60">por {record.profiles.full_name}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                record.status === 'completed' ? 'bg-green-600 text-white' : 
                                                record.status === 'partial' ? 'bg-amber-500/20 text-amber-400' : 
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {record.status === 'completed' ? 'Concluído' : record.status === 'partial' ? 'Parcial' : 'Falhou'}
                                            </span>
                                            {expandedId === record.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                                                className="p-1.5 text-muted-foreground/50 hover:text-red-500 transition-colors opacity-0 group-hover/card:opacity-100"
                                                title="Excluir pesquisa"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </button>

                                    {/* Detalhes expandidos — resumo dos resultados */}
                                    {expandedId === record.id && (
                                        <div className="p-3 bg-foreground/5 border border-t-0 border-border/40 animate-in fade-in slide-in-from-top-2 duration-200">
                                            {record.results.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-3">Sem resultados registrados para esta pesquisa.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                                                            Resultados ({record.results.length} bairro{record.results.length > 1 ? 's' : ''})
                                                        </p>
                                                        {onLoadResults && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    onLoadResults(record.results)
                                                                    toast.success('Resultados carregados!')
                                                                }}
                                                                className="flex items-center gap-1.5 text-[10px] font-bold text-secondary hover:text-secondary/80 px-2.5 py-1 rounded-lg hover:bg-secondary/10 transition-colors"
                                                            >
                                                                <Eye size={12} />
                                                                Visualizar Resultados
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {record.results.map((entry: any, idx: number) => (
                                                            <div 
                                                                key={idx} 
                                                                className="flex items-center justify-between p-2.5 bg-card rounded-lg border border-border/40"
                                                                style={{ borderLeftWidth: '3px', borderLeftColor: NEIGHBORHOOD_COLORS[idx]?.color || 'var(--border)' }}
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-bold text-foreground">{entry.neighborhood}</p>
                                                                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                                                                        <span>Média: <strong className="text-foreground">{formatCurrency(entry.data?.averageValue || 0)}</strong>/m²</span>
                                                                        <span>Mediana: <strong className="text-foreground">{formatCurrency(entry.data?.medianValue || 0)}</strong></span>
                                                                        <span>{entry.data?.properties?.length || 0} amostras</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] shrink-0 ml-3">
                                                                    <span className="text-emerald-500 font-bold">{formatCurrency(entry.data?.minPrice || 0)}</span>
                                                                    <span className="text-muted-foreground">—</span>
                                                                    <span className="text-red-500 font-bold">{formatCurrency(entry.data?.maxPrice || 0)}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
