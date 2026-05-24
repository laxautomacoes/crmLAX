'use client'

import { useState, useRef, useEffect } from 'react'
import { Home, MapPin, BedDouble, Bath, Car, Trash2, Edit, Video, FileText, Send, Maximize2, MoreVertical, Archive } from 'lucide-react'
import { translatePropertyType, getPropertyTypeStyles, getStatusStyles, getSituacaoStyles, translateStatus } from '@/utils/property-translations'

interface PropertyCardProps {
    prop: any
    onEdit: (prop: any) => void
    onDelete: (id: string) => void
    onView: (prop: any) => void
    onSend: (prop: any) => void
    onApprove?: (id: string) => void
    onArchive?: (id: string) => void
    userRole?: string
    userId?: string | null
}

export function PropertyCard({ prop, onEdit, onDelete, onView, onSend, onApprove, onArchive, userRole, userId }: PropertyCardProps) {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin'
    const isOwner = userId && prop.created_by && (
        userId === prop.created_by || 
        userId === prop.created_by?.id
    )
    const canEdit = isAdmin || isOwner
    const [mounted, setMounted] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])
    
    return (
        <div 
            onClick={() => onView(prop)}
            className="bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group animate-in fade-in slide-in-from-bottom-2 duration-300 cursor-pointer"
        >
            <div className="aspect-video bg-muted relative">
                {prop.images?.[0] ? (
                    <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground bg-muted/50">
                        <Home size={40} strokeWidth={1} />
                    </div>
                )}
                
                {prop.status === 'Pending' && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
                        <div className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse">
                            Pendente de Aprovação
                        </div>
                        {isAdmin && onApprove && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onApprove(prop.id)
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-all shadow-lg active:scale-95"
                            >
                                <FileText size={14} />
                                Autorizar agora
                            </button>
                        )}
                    </div>
                )}

                {mounted && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20" ref={dropdownRef}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(o => !o) }}
                        className="p-2 bg-black/60 text-white rounded-lg shadow-sm hover:bg-black/80 transition-colors"
                        title="Ações"
                    >
                        <MoreVertical size={16} />
                    </button>
                    {dropdownOpen && (
                        <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-30">
                            <button
                                onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); onSend(prop) }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                            >
                                <Send size={14} className="text-emerald-500" />
                                Enviar para Lead
                            </button>
                            {canEdit && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); onEdit(prop) }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        <Edit size={14} className="text-blue-500" />
                                        Editar
                                    </button>
                                    {onArchive && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); onArchive(prop.id) }}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-amber-500/10 transition-colors"
                                        >
                                            <Archive size={14} className="text-amber-500" />
                                            Arquivar
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDropdownOpen(false); onDelete(prop.id) }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={14} className="text-red-500" />
                                        Excluir
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
                )}
            </div>

            <div className="p-5 space-y-4">
                <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        {prop.details?.situacao && (
                            <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getSituacaoStyles(prop.details.situacao)}`}>
                                {prop.details.situacao}
                            </div>
                        )}
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getPropertyTypeStyles(prop.type)}`}>
                            {translatePropertyType(prop.type)}
                        </div>
                        {prop.videos?.length > 0 && (
                            <div className="px-1.5 py-0.5 bg-foreground/10 rounded flex items-center gap-1 text-[10px] font-black text-foreground shadow-sm" title={`${prop.videos.length} vídeo(s)`}>
                                <Video size={10} strokeWidth={3} />
                                {prop.videos.length}
                            </div>
                        )}
                        {prop.documents?.length > 0 && (
                            <div className="px-1.5 py-0.5 bg-foreground/10 rounded flex items-center gap-1 text-[10px] font-black text-foreground shadow-sm" title={`${prop.documents.length} documento(s)`}>
                                <FileText size={10} strokeWidth={3} />
                                {prop.documents.length}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-foreground text-lg leading-tight line-clamp-1">
                            {prop.title ? prop.title.replace(/\s*-\s*Apto\s+.*/i, '') : ''}
                        </h3>
                        {prop.details?.endereco?.apto && (
                            <div className="flex items-center gap-1 text-foreground text-xs mt-1">
                                <Home size={12} />
                                <span>Apto {prop.details.endereco.apto}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-foreground text-xs mt-0.5">
                            <MapPin size={12} />
                            <span className="line-clamp-1">
                                {prop.details?.endereco?.bairro || 'Bairro ñ inf.'}, {prop.details?.endereco?.cidade || 'Cidade ñ inf.'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-1 text-foreground" title="Dormitórios">
                        <BedDouble size={16} />
                        <span className="text-xs font-semibold">{prop.details?.dormitorios || prop.details?.quartos || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-foreground" title="Banheiros">
                        <Bath size={16} />
                        <span className="text-xs font-semibold">{prop.details?.banheiros || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-foreground" title="Vagas">
                        <Car size={16} />
                        <span className="text-xs font-semibold">{prop.details?.vagas || 0}</span>
                    </div>
                    {(() => {
                        const type = (prop.type || prop.details?.type || '').toLowerCase()
                        const d = prop.details || {}
                        const fmt = (v: any) => v ? String(v).replace(/\s*m[²2]/gi, '') + 'm²' : null
                        if (type === 'land') {
                            return (d.area_total || d.area_terreno) ? (
                                <div className="flex items-center gap-1 text-foreground" title="Área do Terreno">
                                    <Maximize2 size={16} />
                                    <span className="text-xs font-semibold">{fmt(d.area_total || d.area_terreno)}</span>
                                </div>
                            ) : null
                        }
                        if (type === 'house' || type === 'rural') {
                            return (
                                <>
                                    {(d.area_construida || d.area_util) ? (
                                        <div className="flex items-center gap-1 text-foreground" title="Área Construída">
                                            <Maximize2 size={16} />
                                            <span className="text-xs font-semibold">{fmt(d.area_construida || d.area_util)}</span>
                                        </div>
                                    ) : null}
                                    {(d.area_total || d.area_terreno) ? (
                                        <div className="flex items-center gap-1 text-foreground/50" title="Área Terreno">
                                            <Maximize2 size={14} />
                                            <span className="text-xs font-semibold">{fmt(d.area_total || d.area_terreno)}</span>
                                        </div>
                                    ) : null}
                                </>
                            )
                        }
                        // apartment, penthouse, studio, commercial, etc.
                        return (
                            <>
                                {(d.area_privativa || d.area_util) ? (
                                    <div className="flex items-center gap-1 text-foreground" title="Área Privativa">
                                        <Maximize2 size={16} />
                                        <span className="text-xs font-semibold">{fmt(d.area_privativa || d.area_util)}</span>
                                    </div>
                                ) : null}
                                {d.area_total ? (
                                    <div className="flex items-center gap-1 text-foreground/50" title="Área Total">
                                        <Maximize2 size={14} />
                                        <span className="text-xs font-semibold">{fmt(d.area_total)}</span>
                                    </div>
                                ) : null}
                            </>
                        )
                    })()}
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">
                        {prop.price ? `R$ ${Number(prop.price).toLocaleString('pt-BR')}` : 'Sob consulta'}
                    </span>
                    {(isAdmin || prop.status === 'Pending') && (
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider shadow-sm ${getStatusStyles(prop.status)}`}>
                            {translateStatus(prop.status)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
